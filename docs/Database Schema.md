# Database Schema – Unicorns Edu (apps/api)

Tài liệu này được tổng hợp trực tiếp từ Prisma schema tại `apps/api/prisma/schema/*.prisma`, dùng làm **context chuẩn cho model** khi làm việc với backend.

---

## 1) Công nghệ & nguồn schema

| Thành phần | Giá trị |
| --- | --- |
| ORM | Prisma |
| Database | PostgreSQL |
| Entry schema | `apps/api/prisma/schema/schema.prisma` |
| Mô hình dữ liệu | `apps/api/prisma/schema/{user,people,learning,finance,content,lesson,enums}.prisma` |
| Prisma Client output | `apps/api/generated/` |

> `datasource db` dùng `provider = "postgresql"`.

---

## 2) Danh sách bảng theo domain

### Auth
- `users`

### People
- `staff_info`
- `student_info`

### Learning
- `classes`
- `class_teachers`
- `student_classes`
- `sessions`
- `attendance`
- `cf_problem_tutorials` (tutorial theo bài Codeforces)

### Finance
- `bonuses`
- `wallet_transactions_history`
- `customer_care_service`
- `staff_monthly_stats`
- `dashboard_cache`
- `cost_extend`

### Content / Audit
- `class_surveys`
- `action_history`
- `documents`

### Lesson
- `staff_lesson_task`
- `lesson_task`
- `lesson_resources`
- `lesson_outputs`

---

## 3) Quan hệ chính (high-level)

- **User → StudentInfo / StaffInfo**: nhiều user có thể liên kết 1 student/staff (`users.student_id`, `users.staff_id`, `onDelete: SetNull`).
- **Class ↔ StaffInfo**: N-N qua `class_teachers`.
- **Class ↔ StudentInfo**: N-N qua `student_classes`.
- **Session → Class**: N-1 (`sessions.class_id`).
- **Session → StaffInfo (teacher)**: N-1 (`sessions.teacher_id`, `onDelete: Restrict`).
- **Attendance**: bảng giao giữa `sessions` và `student_info`, unique `(session_id, student_id)`.
- **Bonus → StaffInfo**: N-1.
- **WalletTransactionsHistory → StudentInfo**: N-1.
- **WalletTransactionsHistory → StaffInfo (CustomerCareStaff)**: N-1 (relation name `CustomerCareStaff`).
- **CustomerCareService**: liên kết `student_info` và `staff_info`.
- **StaffMonthlyStat → StaffInfo**: N-1.
- **ClassSurvey → Class / StaffInfo**: optional FK, `onDelete: SetNull`.
- **ActionHistory → User**: optional FK, `onDelete: SetNull`.
- **StaffLessonTask**: bảng giao giữa `staff_info` và `lesson_task`, unique `(staff_id, lesson_task_id)`.
- **LessonTask → LessonResource**: 1-N optional (`lesson_resources.lessonTaskId`, `onDelete: SetNull`).
- **LessonTask → LessonOutput**: 1-N optional (`lesson_outputs.lesson_task_id`, `onDelete: SetNull`).
- **LessonOutput → StaffInfo**: optional FK, `onDelete: SetNull`.

---

## 4) Chi tiết model quan trọng

### 4.1 `users` (Auth core)
- PK: `id` (UUID default)
- Unique: `email`, `account_handle` (hai trường độc lập; login chấp nhận chuỗi tương ứng email hoặc account_handle, ưu tiên account_handle).
- Trường chính: `password_hash`, `role_type`, `status`, `email_verified`, `phone_verified`, `refresh_token`
- FK optional:
  - `student_id` → `student_info.id`
  - `staff_id` → `staff_info.id`
- Index: `email`, `phone`, `account_handle`, `link_id`, `role_type`, `status`

### 4.2 `staff_info`
- Thông tin nhân sự: hồ sơ cá nhân, ngân hàng, `roles` (`StaffRole[]` dạng Postgres enum array), `status`
- Được tham chiếu bởi: `users`, `class_teachers`, `sessions`, `bonuses`, `lesson_outputs`, `customer_care_service`, `wallet_transactions_history` (customer care), `staff_monthly_stats`, `class_surveys`, `staff_lesson_task`

### 4.3 `student_info`
- Hồ sơ học viên: liên hệ phụ huynh, trạng thái, giới tính, mục tiêu
- Được tham chiếu bởi: `users`, `student_classes`, `attendance`, `wallet_transactions_history`, `customer_care_service`

### 4.4 `classes`
- Trường nghiệp vụ chính:
  - `type` (`ClassType`), `status` (`ClassStatus`)
  - `max_students`, `allowance_per_session_per_student`, `max_allowance_per_session`, `scale_amount`
  - `schedule` (JSON)
  - các trường học phí theo session/package
- Quan hệ: teachers, students, sessions, surveys

### 4.5 `sessions`
- Mỗi buổi học gắn với 1 lớp và 1 giáo viên
- Trường chính: ngày học, start/end time, `coefficient`, `allowance_amount`, `teacher_payment_status`, `tuition_fee`
- Quan hệ con: `attendance`
- Indexes chính:
  - đơn lẻ: `teacher_id`, `class_id`, `date`
  - composite cho read path nóng: `(class_id, date)`, `(teacher_id, date)`, `(teacher_id, teacher_payment_status, date)`

### 4.6 `attendance`
- Điểm danh theo từng session & student
- Unique composite: `(session_id, student_id)`
- Trạng thái dùng enum `AttendanceStatus`

### 4.7 Finance models
- `bonuses`: khoản thưởng theo staff/tháng/trạng thái thanh toán
- `wallet_transactions_history`: lịch sử ví học viên + thông tin chia lợi nhuận CSKH
- `customer_care_service`: map staff chăm sóc theo học viên + % profit
- `staff_monthly_stats`: số liệu tổng hợp lương/việc theo tháng
- `dashboard_cache`: cache JSON theo key/type + `expires_at`
- `cost_extend`: khoản chi mở rộng theo tháng/danh mục

### 4.8 Content & audit
- `class_surveys`: báo cáo/đánh giá lớp theo mốc test
- `action_history`: audit log thay đổi dữ liệu (`before_value`, `after_value`, `changed_fields` là JSON)
- `documents`: metadata tài liệu (`file_url`, `tags` JSON)

### 4.8.1 `action_history`
- Dùng để lưu thao tác `create | update | delete` ở backend cho các entity nghiệp vụ.
- Actor: `user_id`, `user_email`
- Phân loại: `entity_type`, `entity_id`, `action_type`
- Snapshot:
  - `before_value`: toàn bộ dữ liệu trước khi thay đổi
  - `after_value`: toàn bộ dữ liệu sau khi thay đổi
  - `changed_fields`: diff dạng JSON giữa before/after
- Coverage hiện tại:
  - learning / finance / content: `session`, `class`, `cost`, `bonus`, `cf_problem_tutorial`
  - identity / people: `user`, `student`, `staff`
  - auth state của `user`: `register`, `verify email`, `reset password`, `change password`, Google OAuth create/verify
- Ghi chú bảo mật:
  - snapshot `user` lưu theo dữ liệu thực tế ở DB, nên các field hash như `passwordHash` hoặc `refreshToken` có thể xuất hiện trong `before_value` / `after_value` khi chính các field đó thay đổi
- Indexes phục vụ tra cứu lịch sử:
  - `user_id`
  - `entity_type`
  - `entity_id`
  - `action_type`
  - `created_at`

### 4.9 Codeforces tutorial (`cf_problem_tutorials`)
- Lưu nội dung tutorial cho từng bài trong contest Codeforces (group).
- PK: `id` (UUID). Unique: `(contest_id, problem_index)`.
- Trường: `contest_id` (Int), `problem_index` (String, vd. `"01"`, `"A"`), `tutorial` (Text, nullable).
- Dùng cho Tab Tài liệu tại `/admin/notes-subject` khi admin chỉnh sửa tutorial cho bài.

### 4.10 Lesson models
- `lesson_task`: task nội dung (status, priority, due date, created_at, updated_at)
  - quan hệ optional `created_by -> staff_info.id`
  - index read path hiện có cho tab tổng quan giáo án admin: `(status, due_date)`, `updated_at`
- `staff_lesson_task`: phân công task cho staff (junction)
- `lesson_resources`: thư viện tài nguyên học tập
  - field chính cho admin lesson overview: `title`, `description`, `resource_link`, `tags`, `updated_at`
  - index read path hiện có: `created_at`, `updated_at`
- `lesson_outputs`: sản phẩm bài học gắn optional với `lesson_task`
  - field chính cho work tab / output detail: `lesson_task_id`, `lesson_name`, `contest_uploaded`, `date`, `status`, `staff_id`, `cost`, `link`, `original_link`, `source`, `level`, `tags`
  - relation optional:
    - `lesson_task_id -> lesson_task.id`
    - `staff_id -> staff_info.id`
  - index read path hiện có:
    - `date`
    - `lesson_task_id`
    - `(lesson_task_id, status)`
    - `(lesson_task_id, date)`
    - `(status, date)`
    - `staff_id`
    - `(staff_id, date)`
    - `level`
    - `updated_at`

---

## 5) Enums hiện có

### User & identity
- `UserRole`: `admin | staff | student | guest`
- `UserStatus`: `active | inactive | pending`
- `StaffRole`: `admin | teacher | assistant | lesson_plan | lesson_plan_head | accountant | communication | customer_care`
- `StaffStatus`: `active | inactive`
- `StudentStatus`: `active | inactive`
- `Gender`: `male | female`

### Learning
- `ClassStatus`: `running | ended`
- `ClassType`: `vip | basic | advance | hardcore`
- `AttendanceStatus`: `present | excused | absent`

### Finance
- `WalletTransactionType`: `topup | loan | repayment | extend`
- `PaymentStatus`: `paid | pending`

### Lesson
- `LessonTaskStatus`: `pending | in_progress | completed | cancelled`
- `LessonTaskPriority`: `low | medium | high`
- `LessonOutputStatus`: `pending | completed | cancelled`

---

## 6) Ghi chú cho model khi thao tác code

1. Tên bảng thực tế dùng `@@map(...)` (snake_case), không luôn trùng tên model.
2. Nhiều cột dùng `@map(...)` nên khi debug SQL cần đối chiếu tên cột DB.
3. Các relation có hành vi xóa khác nhau (`Cascade`, `Restrict`, `SetNull`) — cần giữ đúng khi viết service xử lý delete.
4. Có nhiều trường JSON (`schedule`, `tags`, `before_value`, `after_value`, `changed_fields`, `dashboard_cache.data`) — cần validate ở boundary API.
5. `users.email_verified` và `users.phone_verified` là cờ xác thực quan trọng cho auth flow.

---

## 7) Nguồn sự thật (source of truth)

- Luôn ưu tiên Prisma schema tại: `apps/api/prisma/schema/*.prisma`.
- Nếu tài liệu này lệch schema, coi schema là chuẩn và cập nhật lại tài liệu.

---

## 8) Tạo lại DB từ schema

Kết nối DB qua `DATABASE_URL` trong `apps/api/.env` (đọc từ `prisma.config.ts`). Các lệnh chạy tại thư mục **`apps/api`**:

| Việc | Lệnh |
|------|------|
| Generate Prisma Client | `npm run db:generate` hoặc `npx prisma generate --schema=./prisma/schema/` |
| Áp dụng migration có sẵn (tạo/ cập nhật bảng) | `npx prisma migrate deploy --schema=./prisma/schema/` |
| Tạo migration mới + áp dụng (khi đổi schema) | `npm run db:migrate` hoặc `npx prisma migrate dev --schema=./prisma/schema/` |

**Tạo lại toàn bộ bảng trên DB (PostgreSQL/Supabase):**

```bash
cd apps/api
npx prisma migrate deploy --schema=./prisma/schema/
```

Migration SQL nằm tại: `apps/api/prisma/schema/migrations/`. File `migration_lock.toml` khóa provider `postgresql`.

---

## 9) Seed & migration script

Script **`apps/api/scripts/seed.ts`** dùng để:

- Đọc CSV từ đường dẫn cấu hình trong `mocktest/demo.env` (biến `SEED_CSV_STUDENTS`, `SEED_CSV_CLASSES`, `SEED_CSV_STAFF`).
- Kết nối DB qua `DATABASE_URL` (đọc từ root `.env` hoặc `apps/api/.env`).
- **Mapping:** Tự map header CSV legacy sang schema hiện tại (xem `scripts/csv-loader.ts`, `LEGACY_HEADER_MAP`).
- **User:** Chỉ lưu `password_hash` (bcrypt), không lưu mật khẩu plain-text.
- **Student / last_attendance:** Giá trị “last attendance” từ CSV được chuyển thành FK vào bảng `sessions` thông qua bảng `attendance` (session + student).
- **Tài chính:** `tuition_per_session` → `classes.student_tuition_per_session`; `custom_allowance` → `class_teachers.custom_allowance`; `base_rate` → `bonuses` (workType `"base"`).
- **Anonymization:** PII (tên, email, SĐT, địa chỉ) được thay bằng dữ liệu ngẫu nhiên (Faker).
- **Preview:** Trước khi ghi DB, script tạo file `Data_Migration_Preview.docx` (hoặc đường dẫn trong `SEED_PREVIEW_PATH`) chứa 50 dòng đầu của bảng Student và Class (sau mapping/anonymization).
- **Seeding:** Sau migration từ CSV, script sinh thêm dữ liệu ngẫu nhiên cho các bảng đến khoảng `SEED_TARGET_ROWS` (mặc định 1000) dòng, đảm bảo FK.

**Chạy seed (từ repo root hoặc từ `apps/api`):**

```bash
cd apps/api
npm run db:generate   # nếu chưa generate Prisma Client
npm run seed
```

**Cài dependency cho script (nếu thiếu):**

```bash
cd apps/api
pnpm add csv-parse docx @faker-js/faker
# hoặc: npm install csv-parse docx @faker-js/faker --save
```

**Env:** `DATABASE_URL` bắt buộc (root `.env` hoặc `apps/api/.env`). Các biến trong `mocktest/demo.env`: `SEED_CSV_*`, `SEED_PREVIEW_PATH`, `SEED_TARGET_ROWS`. Để bỏ qua migration từ CSV, để trống các `SEED_CSV_*`.
