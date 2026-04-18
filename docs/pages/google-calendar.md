# Google Calendar Integration – Unicorns Edu (apps/api)

Tài liệu này mô tả hành vi Google Calendar hiện tại trong hệ thống Unicorns Edu.

---

## 1) Tổng quan

Google Calendar hiện chỉ gắn với **lịch học định kỳ của lớp** (`Class.schedule`).

- Mỗi entry trong `Class.schedule` có thể được sync thành một recurring event trên Google Calendar.
- Event recurring này có thể kèm Google Meet link và được lưu ngược vào chính schedule JSON của lớp.
- Các màn `/admin/calendar` và `/staff/calendar` chỉ đọc dữ liệu từ schedule pattern đã expand thành occurrence.
- **Session CRUD không còn sync Google Calendar.** Từ ngày **2026-04-14**, tạo/sửa/xóa `session` không được phép tạo, cập nhật, hay xóa Google Calendar event nữa.

Nói ngắn gọn: Google Calendar là tính năng của **lịch lớp theo tuần**, không phải tính năng của **buổi học session**.

---

## 2) Cài đặt & Configuration

### 2.1 Dependencies

```bash
cd apps/api
pnpm add googleapis google-auth-library uuid
```

### 2.2 Google Cloud Setup

1. Tạo service account trong Google Cloud Console.
2. Tạo JSON key và lưu an toàn.
3. Nếu dùng calendar riêng, tạo calendar và copy `Calendar ID`.
4. Share calendar cho email gia sư nếu muốn họ nhận recurring invite của lịch lớp.

### 2.3 Environment Variables

```env
# Option 1: Base64 encoded service account JSON
GOOGLE_SERVICE_ACCOUNT_KEY="base64-encoded-json-content"

# Option 2: Direct file path for local dev
# GOOGLE_SERVICE_ACCOUNT_JSON_PATH="/path/to/key.json"

# Optional, defaults to the auth account's primary calendar
GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"

# Optional, defaults to Asia/Ho_Chi_Minh
GOOGLE_TIME_ZONE="Asia/Ho_Chi_Minh"
```

Ngoài service account, hệ thống vẫn hỗ trợ OAuth2 user credentials nếu cần behavior tốt hơn cho conference/invite handling:

```env
GOOGLE_OAUTH_CLIENT_ID="..."
GOOGLE_OAUTH_CLIENT_SECRET="..."
GOOGLE_REFRESH_TOKEN="..."
```

Hành vi runtime hiện tại:

- Nếu dùng `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` + `GOOGLE_REFRESH_TOKEN`, backend giữ `OAuth2Client` sống trong runtime để Google client library tự refresh access token khi cần.
- Nếu dùng `GOOGLE_SERVICE_ACCOUNT_KEY` hoặc `GOOGLE_SERVICE_ACCOUNT_JSON_PATH`, backend giữ `JWT` auth client thay vì chỉ giữ access token lấy lúc boot, nên service-account access token cũng được refresh tự động.
- Nếu một request tới Google Calendar gặp lỗi auth/token hết hạn (`401`, `invalid_grant`, `invalid credentials`), service sẽ tự khởi tạo lại auth client và retry đúng 1 lần trước khi fail.

### 2.4 Module Registration

`GoogleCalendarModule` được import bởi `CalendarModule` để phục vụ sync recurring event của `Class.schedule`.

---

## 3) Runtime API

> Route note: business routes của Nest runtime không dùng global `/api` prefix. Swagger UI vẫn ở `/api`, còn route runtime dùng trực tiếp `/admin/calendar/...` và `/calendar/...`.

### 3.1 Các endpoint đang dùng thật

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/admin/calendar/class-schedule` | Expand `Class.schedule` thành danh sách occurrence trong khoảng `startDate` → `endDate`; hỗ trợ filter `classId`, `teacherId` |
| `GET` | `/admin/calendar/classes/:classId/schedule` | Lấy raw weekly schedule pattern của một lớp |
| `PUT` | `/admin/calendar/classes/:classId/schedule` | Cập nhật weekly schedule pattern của lớp và sync recurring event lên Google Calendar |
| `GET` | `/calendar/staff/events` | Staff calendar: chỉ lấy lịch dạy của chính staff (teacher role) từ schedule pattern |
| `GET` | `/calendar/classes` | Danh sách lớp running cho filter |
| `GET` | `/calendar/teachers` | Danh sách gia sư active cho filter |

### 3.2 Các endpoint đã retire

Các route session-oriented như `/admin/calendar/events/*` và `/calendar/events/*` không còn là contract runtime của feature calendar.

- Không dùng để tạo event cho session.
- Không dùng để resync session.
- Không dùng để xóa event khi xóa session.

### 3.3 Admin Calendar (`/admin/calendar`)

Trang `/admin/calendar` dùng trực tiếp `GET /admin/calendar/class-schedule` làm source of truth từ `Class.schedule`.

- Route mở cho `admin` và `staff.assistant`.
- Chỉ hiển thị **tuần hiện tại**, cố định từ **Chủ Nhật đến Thứ Bảy**.
- Filter gồm `classId` và `teacherId`.
- UI là week-view kiểu Google Calendar.
- Mỗi slot lịch render theo **schedule occurrence của lớp**, không render theo session thực tế.
- Popup event chỉ dùng `meetLink` đến từ schedule entry đã sync recurring event, với CTA mở link và icon copy nhỏ để sao chép nhanh.

### 3.4 Staff Calendar (`/staff/calendar`)

Staff có role `teacher` có thể xem lịch dạy cá nhân tại `/staff/calendar`.

- Backend tự resolve staff ID từ JWT.
- Chỉ expand những class mà staff đó phụ trách.
- Đây là màn read-only, không điều khiển sync Google Calendar cho session; popup vẫn cho mở và sao chép `meetLink` của occurrence khi có.

---

## 4) Sync Recurring Event Cho `Class.schedule`

Mỗi schedule entry trong `Class.schedule` có thể được đồng bộ thành một recurring weekly event:

- Service dùng: `GoogleCalendarService.createOrUpdateClassScheduleRecurringEvent()`
- Recurrence: `RRULE:FREQ=WEEKLY;BYDAY=...`
- Thời điểm bắt đầu: occurrence gần nhất khớp `dayOfWeek`
- Attendees/co-host: ưu tiên tutor phụ trách của từng slot; chỉ fallback sang danh sách tutor của lớp cho các row legacy cũ chưa có `teacherId`

Khi gọi `PUT /admin/calendar/classes/:classId/schedule`, hệ thống sẽ:

1. Lưu schedule pattern mới xuống DB.
2. Xóa recurring event cũ của các entry cũ còn liên kết.
3. Tạo recurring event mới cho các entry hiện tại.
4. Lưu `googleCalendarEventId` và `meetLink` ngược lại vào JSON `Class.schedule`.

`CalendarService.enrichEventsWithMeetLinks()` chỉ đọc `meetLink` từ schedule entry đã sync để đổ vào `ClassScheduleEventDto`.

---

## 5) Session Và Google Calendar

### 5.1 Hành vi hiện tại

Session không còn là nguồn sync Google Calendar.

- `SessionCreateService.createSession()` không gọi Google Calendar.
- `SessionUpdateService.updateSession()` không gọi Google Calendar.
- `SessionDeleteService.deleteSession()` không gọi Google Calendar.

Điều này áp dụng cho cả luồng admin và luồng teacher/staff-ops.

### 5.2 Các field Google trên bảng `sessions`

Các field:

- `google_meet_link`
- `google_calendar_event_id`
- `calendar_synced_at`
- `calendar_sync_error`

vẫn còn trong schema để giữ backward compatibility với dữ liệu cũ, nhưng **không còn được auto-populate bởi session workflow hiện tại**.

Nếu có session lịch sử đã từng sync trước ngày 2026-04-14 thì dữ liệu cũ vẫn có thể còn tồn tại trong DB; hệ thống không tự dọn/xóa chúng trong thay đổi này.

---

## 6) Debug Logging

Các log còn ý nghĩa cho feature này:

| Prefix Log | Khi nào xuất hiện |
|------------|-------------------|
| `[Calendar Startup]` | Khi app khởi động và khởi tạo Google Calendar client |
| `[Calendar Auth]` | Khi request bị lỗi auth/token, service tự re-init client và retry một lần |
| `[ClassService]` | Khi cập nhật schedule lớp qua class workflow rồi gọi sync recurring event |
| `[Calendar CRUD:GET]` | Khi đọc occurrence của class schedule |
| `[Calendar CRUD:sync]` | Khi xóa/tạo recurring event cho `Class.schedule` |
| `[Calendar CRUD:DELETE]` | Khi xóa recurring event cũ của schedule entry |
| `[Calendar]` | Các log nội bộ từ recurring-event sync và meet-link enrichment |

Session CRUD không còn log vòng đời sync Google Calendar nữa.

---

## 7) Kiểm thử nhanh

1. Cập nhật schedule lớp qua `PUT /admin/calendar/classes/:classId/schedule`.
2. Kiểm tra Google Calendar có recurring event mới.
3. Mở `/admin/calendar` hoặc `/staff/calendar` và xác nhận popup event có `meetLink` từ schedule.
4. Tạo/sửa/xóa một session từ màn lớp hoặc staff profile.
5. Xác nhận không có log/session side effect nào gọi Google Calendar.

---

## 8) Troubleshooting

| Vấn đề | Kiểm tra |
|-------|----------|
| Không sync được recurring event | Kiểm tra `GOOGLE_SERVICE_ACCOUNT_KEY` hoặc `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` |
| Token/access token bị expire | Hệ thống sẽ tự refresh và retry 1 lần; nếu vẫn lỗi, kiểm tra `GOOGLE_REFRESH_TOKEN` hoặc quyền service account/key hiện tại còn hợp lệ |
| Không có Meet link | Kiểm tra auth method Google, quyền conference/invite, và log response của Google API |
| Gia sư không nhận invite recurring event | Kiểm tra email tutor đúng, calendar được share đúng, và slot có `teacherId` hợp lệ |
| Tạo session nhưng Google Calendar không đổi | Đây là hành vi đúng từ 2026-04-14; session không còn sync calendar |
