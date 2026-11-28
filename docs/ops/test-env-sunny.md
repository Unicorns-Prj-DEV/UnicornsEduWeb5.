# Test env IT trên máy `sunny` (Tailscale)

Một bản **instance IT giống production**, chạy trên máy `sunny` (x86_64, Ubuntu), có **mock data** để test.
Code nằm trong [`deploy/test-env/`](../../deploy/test-env/). Không có dữ liệu thật: mọi học sinh, nhân sự, email đều là giả (`@mock.uniedu.test`).

| Thành phần | Giống prod | Khác prod (và lý do) |
|---|---|---|
| Compose | `docker-compose.prod.yml` (api, web, nginx), `NODE_ENV=production`, healthcheck, `nginx/conf.d/app.conf` | Thêm override [`docker-compose.test.yml`](../../deploy/test-env/docker-compose.test.yml) |
| Image api/web | Cùng Dockerfile, cùng `NEXT_PUBLIC_BACKEND_URL=/api` | **Build local** vì image GHCR prod chỉ có `linux/arm64`, còn `sunny` là x86_64. API build với `NODE_OPTIONS=--max-old-space-size=4096` (`ARG` trong `apps/api/Dockerfile`, CI không truyền): `sunny` có 7,6 GB RAM nên V8 mặc định trần heap khoảng 2 GB, và `nest build` OOM |
| nginx | `1.27-alpine` | Lấy từ Docker Hub vì bản mirror GHCR là private |
| Data stack | [`deploy/data-stack`](../../deploy/data-stack/): Postgres 17.6 + `storage-it` (supabase/storage-api v1.74.0), network `uniedu-data-it` | Chỉ chạy `db` + `storage-it` (không chạy ENG/JP/Physics) |
| Migrate | `prisma migrate deploy` y hệt [`scripts/gha-deploy-instance-remote.sh`](../../scripts/gha-deploy-instance-remote.sh) | — |
| Truy cập | Cloudflare Tunnel → nginx loopback (HTTPS, cookie `Secure` + `SameSite=Strict`) | Hostname `uni-test.sunnydev.qzz.io` trên tunnel sẵn có của `sunny` |
| Email | SMTP thật | **Mailpit** bắt mọi thư (magic link học sinh, quên mật khẩu, …) |
| Google OAuth / Calendar | Có | **Tắt**: client id giả, `GOOGLE_CALENDAR_ID=""` |
| SePay | Có | Token để trống (nạp ví báo "chưa cấu hình"). Webhook secret riêng nên vẫn tự ký HMAC test `/api/webhook/sepay` được |
| Secrets | — | Sinh riêng cho test env (JWT, DB, storage key); không dùng lại secret prod |

## Layout trên `sunny`

```
~/UnicornsEdu/            checkout (detached, snapshot từ Mac) + .env (chmod 600, gitignored)
~/uniedu-data/            data stack: docker-compose.yml, gen-env.sh, initdb/, .env, volumes/
~/.uniedu-test/
  credentials             admin + mật khẩu chung tài khoản mock (chmod 600)
  version                 snapshot code đang chạy
```

- Compose project: `unicorns-it-test`.
- Cổng (chỉ loopback):

| Cổng | Dịch vụ |
|---|---|
| `127.0.0.1:18080` | nginx; cloudflared trỏ vào đây |
| `127.0.0.1:18025` | Mailpit UI |
| `127.0.0.1:54322` | Postgres |
| `127.0.0.1:55001` | storage-it |

## Yêu cầu (một lần)

1. **Docker trên `sunny`.** User `sunny` đã ở group `docker`, chỉ còn thiếu gói:
   ```bash
   tailscale ssh sunny -t 'sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 docker-buildx && sudo systemctl enable --now docker && docker version'
   ```
2. **Public Hostname trên Cloudflare.** Tunnel của `sunny` là loại remote-managed, nên cấu hình qua dashboard: Zero Trust → Networks → Tunnels → tunnel của `sunny` → *Public Hostname* → thêm `uni-test.sunnydev.qzz.io` → `HTTP` → `localhost:18080`.
   - **Nên** bật Cloudflare Access (Zero Trust → Access → Applications) cho hostname này, chỉ cho email của team. Test env không có dữ liệu thật nhưng vẫn là bản app đầy đủ mở ra Internet.
   - Đổi hostname khác thì set `TEST_PUBLIC_URL` trước lần bootstrap đầu (URL nằm trong `.env` và data stack `.env`).
3. Mac cần `tailscale` CLI và đã đăng nhập cùng tailnet.

## Lệnh (chạy từ Mac, ở repo root)

```bash
deploy/test-env/test-env.sh bootstrap   # lần đầu: push code → data stack → .env → build → migrate → bucket → up → seed
deploy/test-env/test-env.sh deploy      # cập nhật code: push → build → migrate → restart (như CD)
deploy/test-env/test-env.sh status      # compose ps + nginx-health + app-config + HTTP code public URL
deploy/test-env/test-env.sh creds       # in tài khoản admin / mật khẩu mock
deploy/test-env/test-env.sh mail        # Mailpit UI → http://localhost:18025 (Ctrl-C để đóng)
deploy/test-env/test-env.sh logs api    # log 1 service (TAIL=500 để xem nhiều hơn)
deploy/test-env/test-env.sh reset --yes # XOÁ dữ liệu app rồi seed lại từ đầu
deploy/test-env/test-env.sh down        # dừng app (data stack vẫn chạy)
deploy/test-env/test-env.sh ssh         # shell trên sunny ở ~/UnicornsEdu
```

- **`push` / `deploy` gửi cả thay đổi chưa commit.** Working tree được snapshot thành commit tạm (index tạm, ref `refs/test-env/snapshot`) mà không đụng staging/branch. Sau đó git bundle (tăng dần) được gửi qua `ssh` + `tailscale nc`.
  - `sunny` không cần quyền GitHub.
  - File gitignored (`.env`, `node_modules`) không đi theo.
- Các bước lẻ chạy trực tiếp trên `sunny`: `deploy/test-env/remote.sh data|env|creds|build|migrate|buckets|up|seed`.
- Biến tuỳ chọn:

| Phía | Biến |
|---|---|
| Mac | `TEST_SSH_TARGET` (mặc định `sunny@sunny`), `TEST_REMOTE_DIR`, `TEST_MAIL_PORT` |
| `sunny` | `TEST_PUBLIC_URL`, `TEST_DATA_DIR` |

## Mock data

`remote.sh seed` chạy 3 bước:

1. [`seed/bootstrap-admin.mjs`](../../deploy/test-env/seed/bootstrap-admin.mjs) tạo hoặc đặt lại mật khẩu admin.
   - Đây là bước **duy nhất ghi thẳng DB**, vì API không có endpoint tạo admin đầu tiên.
   - Script `seed`/`seed:admin` trong `apps/api/package.json` trỏ tới `scripts/seed.ts`/`seed-admin.ts`, hai file này **không tồn tại**.
2. [`seed/seed-mock.mjs`](../../deploy/test-env/seed/seed-mock.mjs) đăng nhập admin rồi tạo mọi thứ **qua HTTP API**, đi qua nginx như trình duyệt. Nhờ vậy business logic chạy thật: ID ngắn, ví, lịch sử ví, snapshot học phí, `action_history`.
   - Dữ liệu tất định (PRNG seed cố định).
   - Thấy lớp mock đầu tiên (`Basic K1 · …`) đã có thì bỏ qua cả bước.
   - Khoá học: migration `20260818090000_add_class_category` đã chèn sẵn VIP, Basic, Advance, Hardcore (cùng các khoá THPT), nên seed dùng lại theo tên, chỉ tạo khoá còn thiếu.
3. `apps/api/scripts/seed-question-bank.ts --apply` nạp ngân hàng câu hỏi (container `seed-tools`).

| Dữ liệu | Chi tiết |
|---|---|
| Khoá học | Basic, Advance, VIP, Hardcore |
| Nhân sự | `gv01`–`gv03` (teacher), `gv04` (teacher + lesson_plan), `cskh01` (customer_care), `ketoan01` (accountant_income + expense), `daotao01` (training_head), `giaoan01` (lesson_plan_head) |
| Lớp | 5 lớp `running`, tính theo buổi, có lịch tuần, `daotao01` quản lý đào tạo. `hs01`, `hs02`, `hs17` học 2 lớp |
| Học sinh | `hs01`–`hs30`. Ví nạp 3.000.000đ; em có số chia hết cho 3 nạp 1.000.000đ; em chia hết cho 7 nạp 0đ để test nợ học phí |
| Buổi học | Theo lịch 4 tuần gần nhất, kèm điểm danh + nhận xét. Buổi cũ hơn 14 ngày: đã trả công giáo viên |

**Đăng nhập:**

- **Admin và nhân sự** đăng nhập bằng `accountHandle` + mật khẩu. Xem bằng `test-env.sh creds`: admin có mật khẩu riêng, mọi tài khoản mock dùng chung `MOCK_PASSWORD`.
- **Học sinh** đăng nhập ở form học sinh (`POST /auth/student/login`) bằng `hs01`–`hs30` + `MOCK_PASSWORD`.
  - Email mock đã xác minh sẵn nên vào thẳng, không qua magic link.
  - `/auth/login` từ chối tài khoản học sinh (`STUDENT_LOGIN_REQUIRED`).
- **Email** (quên mật khẩu, xác minh email, …) đều rơi vào Mailpit: chạy `test-env.sh mail` rồi mở `http://localhost:18025`.
- Đăng nhập bị throttle **5 lần/phút**, giống prod.

Seed hiện cho **mọi học sinh có mặt mọi buổi** (`pickAttendanceStatus()` trả `present`). Vì vậy học phí bị trừ đủ, và khoảng 10 em nạp 0đ hoặc 1.000.000đ bị số dư âm, dùng được để test nợ học phí.

## Reset

`test-env.sh reset --yes` làm lần lượt:

1. Dừng api/web/nginx.
2. Làm rỗng các bucket.
3. `DROP SCHEMA public CASCADE` của `uniedu_it`. Schema `storage` giữ nguyên.
4. Xoá mail trong Mailpit.
5. Chạy migrate → up → seed.

Credentials và `.env` được giữ nguyên.

Xoá hẳn test env (trên `sunny`):

```bash
cd ~/UnicornsEdu && docker compose -f docker-compose.prod.yml -f deploy/test-env/docker-compose.test.yml down -v
cd ~/uniedu-data && docker compose down && rm -rf ~/uniedu-data ~/UnicornsEdu ~/.uniedu-test
```

## Giới hạn đã biết

- Đăng nhập Google lỗi ở bước Google (client giả); dùng đăng nhập mật khẩu hoặc magic link.
- Không đồng bộ Google Calendar. Không nạp ví SePay thật; nạp tay qua admin vẫn được.
- Image build trên x86_64, prod chạy arm64. Cùng Dockerfile nhưng native module (vd `bcrypt`) được build cho kiến trúc khác.
- Data stack phải có đủ biến của 4 instance (compose bắt buộc). ENG/JP/Physics nhận URL giữ chỗ `*.test.invalid` và không được khởi động.
