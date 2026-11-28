# Yêu cầu API UNIOJ: Đồng bộ học sinh từ LMS

- **Gửi**: Đội kỹ thuật UNIOJ
- **Từ**: Đội LMS UniEdu (instance IT)
- **Ngày**: 21/11/2026
- **Trạng thái**: UNIOJ đã lên production (24/11/2026, tài liệu «Hướng dẫn dùng API đồng bộ học sinh UNIOJ»). LMS đã tích hợp 26/11/2026 — xem mục 0.
- **Cơ sở API**: `https://oj.uniedu.vn`

## 0. Trạng thái triển khai phía LMS (26/11/2026)

Code: `apps/api/src/unioj-student-sync/`. Chỉ chạy khi `LMS_PROFILE=it`. Dùng `UNIOJ_API_KEY` / `UNIOJ_BASE_URL` có sẵn (key phải có quyền **Manage partner students**; nên dùng key của tài khoản tích hợp `lms-bot`, không dùng key cá nhân).

| Nghiệp vụ LMS | Gọi UNIOJ | Cách gọi |
|---|---|---|
| Gõ tên đăng nhập trên form «Tạo học sinh mới» | `GET /api/partner-students/username-check/` qua proxy LMS `GET /unioj-student-sync/username-check?username=` (cùng quyền `POST /users/student`) | Debounce 400 ms, timeout 5 giây. LMS tự chặn sai luật `^[A-Za-z0-9._-]{3,50}$` trước khi hỏi UNIOJ |
| `POST /users/student` (popup «Tạo học sinh mới») và `POST /users` với `roleType: student` (trang `/admin/users`) | `POST /api/partner-students/` | **Trước** khi ghi bất kỳ gì trên LMS. Lỗi (409 `USERNAME_TAKEN` / 400 / 401 / 403 / 5xx / timeout) → LMS trả lỗi, không tạo tài khoản. Thành công → lưu `student_info.unioj_username`; mã `UNIST-…` gửi đi chính là PK hồ sơ |
| Nghỉ học, học lại, xoá hồ sơ | `.../deactivate/`, `.../activate/` | Outbox `unioj_student_sync_events` + cron mỗi phút (xem `docs/Database Schema.md` 4.10c) |

Hành vi đã chốt:

- **UNIOJ sập khi tạo học sinh** (5xx, timeout, lỗi mạng, 401/403 sai key, 4xx bất thường như 405/404 HTML, hoặc instance IT chưa đặt `UNIOJ_API_KEY`): API trả `503` body `{ statusCode: 503, code: "UNIOJ_UNAVAILABLE", message }` và log `error` phía server. Web (`isUniojUnavailableError`) hiện toast Sonner «Hệ thống OJ đang lỗi», mô tả «Chưa tạo được học sinh. Vui lòng báo cáo với kỹ thuật viên.». Không tạo gì trên LMS. Lỗi do dữ liệu người nhập (`USERNAME_TAKEN`, `INVALID_USERNAME`, `INVALID_FIELD`) vẫn trả `400` kèm lý do cụ thể. Kiểm tra tên đăng nhập lúc gõ mà UNIOJ sập: dòng gợi ý dưới ô báo cùng nội dung, nút tạo vẫn bấm được (server kiểm tra lại).
- Email học sinh được gửi kèm lệnh tạo để UNIOJ không bắt nhập email ở lần đăng nhập đầu.
- LMS không log body lệnh tạo (có mật khẩu rõ); lỗi chỉ đọc `error.code` / `error.message`. Lỗi không phải JSON (nginx 405/5xx dạng HTML) xử lý theo mã HTTP.
- `ignored: true` tính là đã nhận, không retry. 404 `STUDENT_NOT_FOUND` và 4xx khác → `failed`, không retry.
- Không có lệnh xoá tài khoản UNIOJ. Xoá hồ sơ LMS chỉ gỡ role.
- Hồ sơ tạo qua `POST /student` (gắn hồ sơ vào user có sẵn), hồ sơ tự sinh khi `PATCH /users` đổi role user có sẵn sang student (cả hai không có mật khẩu để gửi UNIOJ), và học sinh tạo trước ngày bật **không** có tài khoản UNIOJ, nên không sinh lệnh gỡ/bật role. Backfill vẫn ngoài phạm vi.
- Nếu UNIOJ đã tạo tài khoản mà LMS ghi hồ sơ lỗi, API log `error` kèm `external_id` + username để đối soát thủ công.

## 1. Bối cảnh

LMS sắp đồng bộ học sinh sang UNIOJ. Có hai nghiệp vụ:

1. **Tạo tài khoản học sinh trên LMS** → UNIOJ tạo tài khoản học sinh tương ứng **ngay trong cùng request**. Nếu UNIOJ không tạo được, LMS cũng không tạo tài khoản.
2. **Học sinh nghỉ học / bị xoá hồ sơ trên LMS** → UNIOJ **gỡ role học sinh** (tài khoản vẫn giữ). **Học sinh học lại** → UNIOJ **bật lại role**.

Nguyên tắc chung:

- **LMS là nguồn gốc** của hồ sơ học sinh và trạng thái nghỉ học. UNIOJ làm theo lệnh LMS, không tự đổi trạng thái theo chiều ngược lại.
- **Khoá tham chiếu** giữa hai hệ thống là **mã học sinh LMS** `external_id`, dạng `UNIST-[0-9a-f]{10}` (ví dụ `UNIST-3fa9c01b7e`). Mã này không bao giờ đổi. Đừng tra học sinh theo họ tên hay username.
- **Username UNIOJ** = tên đăng nhập (account handle) LMS **tại thời điểm tạo**. Sau đó cố định: LMS đổi handle thì UNIOJ **không** đổi theo.
- **Mật khẩu UNIOJ ban đầu** = mật khẩu LMS lúc tạo. Sau đó hai bên độc lập, học sinh được tự đổi mật khẩu trên UNIOJ. LMS sẽ không gửi lệnh đổi mật khẩu.
- UNIOJ **không bao giờ xoá tài khoản** theo lệnh LMS. Lịch sử nộp bài và tiến độ phải được giữ nguyên.
- Roster lớp **không** đồng bộ ở đợt này.

## 2. Tóm tắt endpoint cần làm

| # | Method + path | Mục đích | LMS gọi khi | Kiểu gọi |
|---|---|---|---|---|
| 1 | `GET /api/partner-students/username-check/` | Kiểm tra username hợp lệ và còn trống | Người dùng gõ tên đăng nhập trên form tạo tài khoản | Đồng bộ, timeout 5 giây |
| 2 | `POST /api/partner-students/` | Tạo tài khoản học sinh (upsert theo `external_id`) | Submit form tạo tài khoản | Đồng bộ, timeout 15 giây |
| 3 | `POST /api/partner-students/<external_id>/deactivate/` | Gỡ role học sinh | Học sinh chuyển sang nghỉ học, hoặc bị xoá hồ sơ | Nền, có retry |
| 4 | `POST /api/partner-students/<external_id>/activate/` | Bật lại role học sinh | Học sinh học lại | Nền, có retry |
| 5 | `GET /api/partner-students/<external_id>/` | Đọc trạng thái (để đối soát) | Admin LMS kiểm tra / debug | Tuỳ chọn, ưu tiên thấp |

Tên path chỉ là đề xuất. Đội UNIOJ đổi được, miễn giữ nguyên ngữ nghĩa và báo lại cho LMS.

## 3. Quy ước chung

### 3.1 Xác thực

Giống các API UNIOJ hiện có:

```
Authorization: Bearer <api_key>
```

- Đề xuất thêm một **quyền mới** cho tài khoản tích hợp, ví dụ `Manage partner students`. Key chỉ có quyền xem báo cáo thì phải bị từ chối `403` với các endpoint này.
- LMS dùng chung `UNIOJ_API_KEY` hiện tại nếu UNIOJ gán thêm quyền mới cho key đó. Nếu UNIOJ muốn cấp key riêng thì báo lại, LMS sẽ thêm biến môi trường mới.

### 3.2 Định dạng request / response

- Request body: `application/json; charset=utf-8`.
- Response thành công bọc trong `data`, giống `video-sync`:

```json
{ "data": { ... } }
```

- Response lỗi: đề xuất định dạng thống nhất, có `code` máy đọc được:

```json
{ "error": { "code": "USERNAME_TAKEN", "message": "Username đã được sử dụng." } }
```

LMS **chỉ đọc `code`** để rẽ nhánh xử lý. `message` dùng để log và có thể hiện cho người dùng.

### 3.3 Mã lỗi và cách LMS xử lý

| HTTP | Ý nghĩa | LMS xử lý |
|---|---|---|
| `200` / `201` | Thành công | Xong |
| `400` | Dữ liệu sai (xem `code`) | Không retry, báo lỗi cho người dùng |
| `401` / `403` | Sai key / thiếu quyền | Không retry, cảnh báo admin |
| `404` | Không tìm thấy `external_id` | Lệnh 3, 4: không retry, đánh dấu lỗi để admin xử lý |
| `409` | Xung đột (xem `code`) | Không retry, báo lỗi cho người dùng |
| `429` | Quá tải | Retry, tôn trọng header `Retry-After` nếu có |
| `5xx` / timeout | Lỗi tạm thời | Lệnh 1, 2: báo «UNIOJ không phản hồi», không tạo tài khoản. Lệnh 3, 4: retry nền với backoff |

### 3.4 Idempotent

**Mọi lệnh ghi đều phải idempotent**: gửi lại cùng một lệnh hai lần thì kết quả giống gửi một lần. LMS sẽ retry khi timeout, nên có thể gửi lặp một lệnh mà UNIOJ thật ra đã xử lý xong.

## 4. Chi tiết từng endpoint

### 4.1 Kiểm tra username

```
GET /api/partner-students/username-check/?username=<username>
```

| Query | Bắt buộc | Mô tả |
|---|---|---|
| `username` | Có | Username muốn dùng (chính là account handle LMS) |

**200 OK** (luôn trả 200 khi kiểm tra được, kể cả khi username không dùng được):

```json
{
  "data": {
    "username": "minh.nguyen",
    "available": false,
    "reason": "TAKEN"
  }
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `available` | boolean | `true` = dùng được để tạo |
| `reason` | string \| null | `null` khi `available = true`. Ngược lại: `INVALID_FORMAT` (sai luật ký tự / độ dài của UNIOJ) hoặc `TAKEN` (đã có tài khoản dùng username này) |
| `rule` | string, tuỳ chọn | Mô tả luật username của UNIOJ, để LMS hiện cho người dùng khi `INVALID_FORMAT` |

Yêu cầu:

- So sánh **không phân biệt hoa thường**, vì LMS chống trùng handle theo kiểu không phân biệt hoa thường.
- Endpoint chỉ đọc, không giữ chỗ username. LMS hiểu rằng kết quả có thể đã cũ khi submit (xem 4.2).
- Nên phản hồi nhanh (dưới 500 ms), vì LMS gọi khi người dùng đang gõ (có debounce).

### 4.2 Tạo tài khoản học sinh

```
POST /api/partner-students/
```

**Request body:**

```json
{
  "external_id": "UNIST-3fa9c01b7e",
  "username": "minh.nguyen",
  "password": "matkhau-ban-dau",
  "full_name": "Nguyễn Văn Minh",
  "province": "Hồ Chí Minh",
  "birth_year": 2010,
  "email": "phuhuynh@example.com"
}
```

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `external_id` | Có | Mã học sinh LMS `UNIST-…`. UNIOJ lưu lại, **unique** |
| `username` | Có | Username UNIOJ, lấy đúng account handle LMS |
| `password` | Có | Mật khẩu ban đầu, **dạng rõ**. LMS yêu cầu tối thiểu 6 ký tự. UNIOJ phải chấp nhận mọi mật khẩu LMS chấp nhận, hoặc báo lại luật nếu chặt hơn |
| `full_name` | Có | Họ tên học sinh trên LMS |
| `province` | Không | Tỉnh/thành, có thể `null` |
| `birth_year` | Không | Năm sinh, có thể `null` |
| `email` | Không | Email tài khoản LMS, có thể `null`. Chỉ để tham khảo, **không** dùng để đăng nhập |

**Hành vi:**

1. Chưa có tài khoản nào mang `external_id` này:
   - `username` sai luật → `400 INVALID_USERNAME`.
   - `username` đã thuộc tài khoản khác → `409 USERNAME_TAKEN`.
   - Ngược lại: tạo tài khoản, hash mật khẩu bằng hasher của UNIOJ, gán role học sinh → **`201 Created`**.
2. Đã có tài khoản mang `external_id` này (LMS gửi lại sau một lần lỗi hoặc timeout):
   - Cập nhật `username`, `password` và các trường hồ sơ theo request, bảo đảm có role học sinh → **`200 OK`**.
   - Nếu `username` mới đã thuộc **tài khoản khác** → `409 USERNAME_TAKEN`.

Lý do của nhánh 2: LMS chỉ gọi lệnh này khi học sinh **chưa có** tài khoản LMS. Nếu UNIOJ đã tạo xong nhưng LMS ghi DB lỗi, người dùng có thể submit lại với tên đăng nhập khác. Khi đó UNIOJ phải cập nhật lại thay vì trả lỗi hoặc tạo tài khoản thứ hai.

**Response (`201` / `200`):**

```json
{
  "data": {
    "external_id": "UNIST-3fa9c01b7e",
    "username": "minh.nguyen",
    "role_active": true,
    "created": true
  }
}
```

LMS lưu `username` trả về và hiển thị trên hồ sơ học sinh.

**Bảo mật mật khẩu (bắt buộc):**

- Không ghi `password` vào log, request log, error tracking (Sentry…), hay bảng audit.
- Chỉ lưu dạng hash (hasher mặc định của Django).
- Chỉ nhận qua HTTPS.

### 4.3 Gỡ role học sinh

```
POST /api/partner-students/<external_id>/deactivate/
```

**Request body:**

```json
{
  "reason": "student_inactive",
  "event_id": "01JD2W6Q8M3V9K4T7R5XZ0B1CA",
  "occurred_at": "2026-11-21T08:15:30Z"
}
```

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `reason` | Có | `student_inactive` (nghỉ học) hoặc `student_deleted` (hồ sơ bị xoá trên LMS). Chỉ để lưu vết, hành vi như nhau |
| `event_id` | Có | ID duy nhất của sự kiện (ULID). Dùng để bỏ qua lệnh gửi trùng |
| `occurred_at` | Có | Thời điểm sự kiện xảy ra trên LMS (ISO 8601, UTC) |

**Hành vi:**

- Gỡ role học sinh: mất quyền làm bài, xem đề, nộp bài.
- **Giữ nguyên** tài khoản, username, mật khẩu, lịch sử nộp bài, tiến độ và báo cáo. API báo cáo (`/api/student-report/...`) vẫn phải trả dữ liệu cũ.
- Tài khoản đã bị gỡ role sẵn rồi → vẫn trả `200`.
- Không có tài khoản mang `external_id` → `404 STUDENT_NOT_FOUND`.

**Response `200`:**

```json
{ "data": { "external_id": "UNIST-3fa9c01b7e", "role_active": false } }
```

### 4.4 Bật lại role học sinh

```
POST /api/partner-students/<external_id>/activate/
```

Body giống 4.3, `reason` = `student_reactivated`.

**Hành vi:** gán lại role học sinh. Học sinh dùng lại tài khoản cũ (cùng username, cùng mật khẩu đang có). Tài khoản đang có role sẵn rồi → vẫn trả `200`. Không tìm thấy → `404 STUDENT_NOT_FOUND`.

**Response `200`:**

```json
{ "data": { "external_id": "UNIST-3fa9c01b7e", "role_active": true } }
```

### 4.5 Thứ tự lệnh (áp cho 4.3 và 4.4)

Lệnh 3 và 4 chạy nền và có retry, nên **có thể đến sai thứ tự**. Ví dụ: học sinh nghỉ lúc 08:00, học lại lúc 08:05, nhưng lệnh «nghỉ» bị retry và đến UNIOJ sau lệnh «học lại».

Yêu cầu UNIOJ lưu `occurred_at` của lệnh gần nhất đã áp cho mỗi học sinh:

- Lệnh mới có `occurred_at` **cũ hơn** giá trị đã lưu → **bỏ qua**, vẫn trả `200` kèm trạng thái hiện tại, và thêm `"ignored": true`.
- Lệnh có `event_id` đã xử lý rồi → bỏ qua, trả `200`.

### 4.6 Đọc trạng thái (tuỳ chọn)

```
GET /api/partner-students/<external_id>/
```

```json
{
  "data": {
    "external_id": "UNIST-3fa9c01b7e",
    "username": "minh.nguyen",
    "role_active": true,
    "last_event_at": "2026-11-21T08:15:30Z"
  }
}
```

Dùng để admin LMS đối soát khi nghi hai bên lệch nhau. Ưu tiên thấp, làm sau bốn endpoint chính cũng được.

## 5. Thay đổi dữ liệu phía UNIOJ (gợi ý)

- Thêm trường `external_id` (nullable, unique) vào hồ sơ học sinh UNIOJ.
- Thêm trường lưu `last_event_at` cho mỗi học sinh, và bảng hoặc cache các `event_id` đã xử lý (giữ khoảng 30 ngày là đủ).
- Tài khoản UNIOJ đã có từ trước (không có `external_id`) giữ nguyên. Việc ghép tài khoản cũ với học sinh LMS **không** nằm trong đợt này.

## 6. Ngoài phạm vi đợt này

- Đồng bộ roster lớp (thêm/bớt học sinh khỏi lớp).
- Đồng bộ đổi mật khẩu hoặc đổi tên đăng nhập.
- Ghép tài khoản UNIOJ cũ với học sinh LMS (backfill).
- Chiều ngược lại (UNIOJ báo về LMS).

## 7. Câu hỏi cần đội UNIOJ trả lời

1. Luật username của UNIOJ là gì (ký tự cho phép, độ dài)? LMS đang cho phép 3–50 ký tự, không khoảng trắng, không `@`.
2. Luật mật khẩu của UNIOJ có chặt hơn «tối thiểu 6 ký tự» không?
3. «Role học sinh» trên UNIOJ là group, permission hay cờ nào? Gỡ role thì học sinh còn đăng nhập được không (để xem lịch sử), hay bị chặn đăng nhập luôn?
4. Dùng chung `UNIOJ_API_KEY` hiện tại kèm quyền mới, hay cấp key riêng?
5. Giữ path đề xuất ở mục 2, hay đổi sang path khác?
6. Môi trường staging để LMS test trước khi bật trên production?
