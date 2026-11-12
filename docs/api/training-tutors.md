# Training tutors API (Ban Đào Tạo xem hồ sơ gia sư)

Module: `apps/api/src/training-tutor/`. Controller `@Controller('training/tutors')`, `@Roles(UserRole.staff, UserRole.admin)`.

## Quyền

`TrainingTutorService.assertTrainingViewer`:

- `roleType=admin` → qua.
- `roleType=staff` → `staffInfo` theo `userId` phải có role `training` hoặc `training_head` (`hasTrainingAccess`) **và** `status=active`; ngược lại `403`.

"Gia sư" = `staff_info.roles` có `teacher`, mọi trạng thái. Với Ban Đào Tạo thường, staff chỉ có role vận hành (không `teacher`) → `404` ở endpoint chi tiết, không xuất hiện ở danh sách.

**Phạm vi Trưởng ban Đào tạo** (`resolveTrainingViewer` → `canViewAllStaff`): staff có `training_head` (và admin) mở được `GET /training/tutors/:id`, `/sessions`, `/achievements` của **mọi nhân sự**, và dùng `scope=all` ở danh sách. Cùng allowlist field — không thêm dữ liệu nhạy cảm.

## Field allowlist

Service dùng `select` tường minh (`TUTOR_SUMMARY_SELECT`), không `include`, nên cột mới thêm vào `staff_info` / `users` không tự lộ ra.

| Trả về | Không bao giờ trả |
| --- | --- |
| `id`, `fullName`, `status`, `roles` (role nhân sự, không phải PII), `avatarUrl` (signed 1h), `university`, `highSchool`, `achievementCount` | `email`, `phone`, CCCD (số/ngày/nơi cấp), `ethnicity`, `gender`, `birthDate`, `currentAddress`, `bankAccount`, `bankQrLink`, `googleMeetLink`, `revenueSharePercent`, mọi field tiền / trạng thái thanh toán |

Test: `training-tutor.service.spec.ts` mock Prisma trả row có cả field nhạy cảm và khẳng định output + `select` không chứa chúng.

## Endpoints

### `GET /training/tutors`

Query: `search?` (họ tên, tối đa 5 token), `status?` (`active|inactive`), `scope?` (`tutors` mặc định = staff có `teacher`; `all` = mọi nhân sự, chỉ Trưởng ban/admin — Ban Đào Tạo thường `403`), `page?` (mặc định 1), `limit?` (mặc định 20, tối đa 100).

```json
{ "data": [TrainingTutorListItemDto], "meta": { "total": 0, "page": 1, "limit": 20 } }
```

`TrainingTutorListItemDto` = `TrainingTutorSummaryDto` + `currentClasses` (`{ id, name }[]`, Lớp đang dạy — cùng quy tắc với endpoint chi tiết).

Sắp xếp: `status` (active trước), rồi `first_name`.

### `GET /training/tutors/:id`

`TrainingTutorSummaryDto` + `currentClasses`, `pastClasses` (`{ id, name }[]`), `taughtSessionCount`.

- **Đang dạy:** `class_teachers.status` là `null` hoặc `active` **và** `classes.status = running`.
- **Đã nghỉ** (`pastClasses`, UI «Lớp đã nghỉ»): mọi phân công còn lại — lớp từng dạy nay không còn dạy, không phân biệt lý do (gia sư nghỉ lớp hay lớp kết thúc).

Hàm chia dùng chung: `splitTutorClasses` trong `training-tutor.service.ts`.

### `GET /training/tutors/:id/sessions`

Query `page`, `limit`. Mỗi buổi: `id`, `date`, `startTime`, `endTime`, `class { id, name }`. Sắp xếp mới nhất trước. Không select `allowanceAmount`, `teacherPaymentStatus`, `trainingManager*`, `tuitionFee`, `coefficient`, `googleMeetLink`.

### `GET /training/tutors/:id/achievements`

Danh sách thành tích theo thứ tự hồ sơ — thành tích nổi bật (`isHighlight: true`) đứng đầu (reuse `AchievementService.listStaffAchievements`). Web dùng qua `AchievementOwnerRef { kind: "staff", mode: "training", staffId }`.

### Sửa thành tích (Ban Đào Tạo)

ADR `docs/adr/2026-11-11-staff-achievement-star-first.md`. Cùng phạm vi với xem: `training` sửa gia sư (`teacher`), `training_head` / admin sửa mọi nhân sự; ngoài phạm vi → `404`. Target là hồ sơ của chính người gọi → `403` (sửa ở `/users/me/achievements`). Không bị ràng buộc minh chứng (giống admin). Mọi thay đổi trừ reorder ghi `action_history` `entityType=staff_achievement`.

| Method | Path | Body | Ghi chú |
| --- | --- | --- | --- |
| `POST` | `/training/tutors/:id/achievements` | multipart `title`, `image?` | Ảnh tuỳ chọn; không tự gắn sao |
| `PATCH` | `/training/tutors/:id/achievements/:achievementId` | `{ title }` | |
| `DELETE` | `/training/tutors/:id/achievements/:achievementId` | — | Xoá dòng có sao không tự chọn sao mới |
| `PUT` | `/training/tutors/:id/achievements/reorder` | `{ orderedIds }` | Full permutation; dòng có sao ghim đầu |
| `PUT` | `/training/tutors/:id/achievements/:achievementId/highlight` | — | Dòng chưa có ảnh vẫn gắn sao được |
| `POST` | `/training/tutors/:id/achievements/:achievementId/image` | multipart `image` | Tải/thay ảnh |
| `DELETE` | `/training/tutors/:id/achievements/:achievementId/image` | — | Gỡ ảnh, kể cả dòng có sao |

Trả về giống `/staff/:staffId/achievements/*` (`AchievementDto` / danh sách). Web: `StaffAchievementsDialog` `editable` (tắt khi target là chính người xem) → `AchievementListEditor` `mode="training"`.

## Chỉnh role nhân sự (Trưởng ban Đào tạo)

### `PATCH /staff/:id/training-roles`

Module `apps/api/src/staff/` (`StaffController.updateStaffTrainingRoles`), `@Roles(UserRole.staff)`. Body `{ "roles": StaffRole[] }` = **trạng thái đích** của 3 role quản lý được (`teacher`, `lesson_plan`, `training`). Trả `{ id, roles }`.

Policy thuần `planTrainingHeadRoleChange` (`staff/training-head-role-policy.ts`):

| Điều kiện | Kết quả |
| --- | --- |
| Người gọi không phải staff `active` có `training_head` | `403` |
| Target là chính người gọi | `403` |
| Target có `admin`, `sale_customer_care_head` hoặc `training_head`, hoặc là tài khoản `users.role_type = admin` | `403` |
| Body chứa role ngoài 3 role trên | `403` |
| Kết quả không còn role nào | `400` |
| Target không tồn tại | `404` |

- Role khác của target (vd `sale`, `customer_care`) giữ nguyên, giữ thứ tự cũ; role bật thêm nối cuối. Target `inactive` vẫn chỉnh được.
- Không đổi gì → trả ngay, không ghi DB.
- Trong 1 transaction: cập nhật `staff_info.roles`, ghi `action_history` (`entityType=staff`, before/after `{ roles }`). Có role bị tắt → `FixedSalarySettingsService.syncStaffRoleOverridesInTx` xoá **mức đè lương cứng** của role đó (ghi lịch sử riêng). Không cascade sang lớp / buổi / phân công.
- Sau commit: invalidate cache auth identity của user target để quyền mới có hiệu lực ngay.

Web: `updateStaffTrainingRoles` trong `lib/apis/training-tutor.api.ts`; điều kiện hiện nút ở `lib/training-head-roles.ts` (`canTrainingHeadEditRoles`), khớp policy backend.
