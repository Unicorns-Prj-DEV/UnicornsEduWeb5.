---
date: 2026-04-29T17:18:02+07:00
researcher: sunny
git_commit: f46651485ef2040636332ae68ed54c6c87aad0cf
branch: feat/max-allowance-null-staff-cccd-nullable
repository: UnicornsEduWeb5.
topic: "Research toàn bộ codebase: FE tự tạo UUID trong form tạo item mới, yêu cầu bắt buộc tạo UUID tại BE"
tags: [research, codebase, uuid, frontend, backend, class-schedule, bonus, student-exam-schedule]
status: complete
last_updated: 2026-04-29
last_updated_by: sunny
---

# Research: FE tự tạo UUID trong form tạo item mới vs BE tạo UUID

**Date**: 2026-04-29T17:18:02+07:00  
**Researcher**: sunny  
**Git Commit**: `f46651485ef2040636332ae68ed54c6c87aad0cf`  
**Branch**: `feat/max-allowance-null-staff-cccd-nullable`  
**Repository**: `UnicornsEduWeb5.`

## Research Question
"Hiện tại có lỗi do form tạo item mới tự tạo uuid tại FE. Bắt buộc tạo UUID tại BE. Hãy research toàn bộ codebase hiện tại và ghi result vào docs/researches/."

## Summary
Codebase hiện tại có cả hai mô hình:

1. Nhiều create flow backend dùng Prisma `@default(uuid())` để sinh id ở BE/DB khi service `create` không truyền `id`.
2. Một số flow FE đang chủ động tạo `id` rồi gửi lên BE trong payload (qua `createClientId()`), và BE giữ/ghi trực tiếp `id` đó.

Việc tạo `id` ở FE hiện tập trung vào các nhóm:
- Class schedule slot trong popup tạo/sửa lịch lớp.
- Bonus create payload ở admin/staff profile.
- Student exam schedule item trong popup chỉnh lịch thi.

## Detailed Findings

### 1) Cơ chế tạo id phía FE (shared utility)
- FE dùng hàm `createClientId()` tại `apps/web/lib/client-id.ts`.
- Hàm ưu tiên `globalThis.crypto.randomUUID()`, fallback thành chuỗi `local-...` nếu môi trường không có `crypto.randomUUID`.

Code reference:
- `apps/web/lib/client-id.ts` dòng 3-13.

### 2) Flow class schedule: FE tạo `id` cho từng slot và gửi vào payload

#### 2.1 Tạo lớp (admin)
- `createScheduleRange()` gán `id: createClientId()` cho mỗi row lịch trong form.
- Khi submit, payload `CreateClassPayload.schedule` chứa `{ id, dayOfWeek, from, to }`.

Code references:
- `apps/web/components/admin/class/AddClassPopup.tsx` dòng 49-58.
- `apps/web/components/admin/class/AddClassPopup.tsx` dòng 231-251.
- `apps/web/components/admin/class/AddClassPopup.tsx` dòng 267-291.

#### 2.2 Tạo lớp (staff ops)
- Tương tự admin: mỗi schedule range có `id: createClientId()`.
- `buildSchedulePayload()` giữ `id` và gửi trong `schedule`.

Code references:
- `apps/web/components/staff/StaffCreateClassPopup.tsx` dòng 52-61.
- `apps/web/components/staff/StaffCreateClassPopup.tsx` dòng 73-89.

#### 2.3 Sửa lớp / sửa lịch lớp
- `EditClassPopup` và `EditClassSchedulePopup` dùng `id` cũ nếu có, nếu không thì tạo mới bằng `createClientId()`.
- Khi submit PATCH schedule, payload giữ nguyên `id` của từng slot.

Code references:
- `apps/web/components/admin/class/EditClassPopup.tsx` dòng 67-80.
- `apps/web/components/admin/class/EditClassSchedulePopup.tsx` dòng 57-70.
- `apps/web/components/admin/class/EditClassSchedulePopup.tsx` dòng 221-231.

### 3) Flow bonus: FE gửi `id` top-level khi create

#### 3.1 Admin staff detail
- `handleSubmitBonus` gọi create mutation với payload có `id: createClientId()`.

Code reference:
- `apps/web/app/admin/staffs/[id]/page.tsx` dòng 1068-1096.

#### 3.2 Staff self profile
- `handleSubmitBonus` gọi create mutation với payload có `id: createClientId()`.

Code reference:
- `apps/web/app/staff/profile/page.tsx` dòng 477-498.

### 4) Flow student exam schedule: FE tạo id local và gửi lên BE
- Popup lịch thi tạo item mới với `id: createClientId()`.
- Khi lưu, mutation map `items` và giữ `{ id, examDate, note }` nếu có id.

Code references:
- `apps/web/components/admin/student/StudentExamSchedulePopup.tsx` dòng 17-19, 51-63.
- `apps/web/components/admin/student/EditStudentPopup.tsx` dòng 134-135.
- `apps/web/components/admin/student/EditStudentPopup.tsx` dòng 225-233.

### 5) Backend xử lý `id`: phần lớn tự sinh tại DB, nhưng có flow nhận `id` từ request

#### 5.1 Mặc định Prisma tự sinh UUID
Nhiều model có `id String @id @default(uuid())`, ví dụ:
- `Class`, `Session`, `Attendance`, `LessonTask`, `LessonResource`, `LessonOutput`, `User`, `StaffInfo`, `StudentInfo`, `Notification`, `Regulation`, ...

Code references:
- `apps/api/prisma/schema/learning.prisma` (model `Class` và các model liên quan).
- `apps/api/prisma/schema/people.prisma` (model `StaffInfo`, `StudentInfo`, `StudentExamSchedule`).
- `apps/api/prisma/schema/lesson.prisma`, `apps/api/prisma/schema/user.prisma`, `apps/api/prisma/schema/content.prisma`.

#### 5.2 Bonus: DTO bắt buộc `id` từ request và service ghi thẳng `id`
- `CreateBonusDto` định nghĩa `id` là required + `@IsUUID()`.
- `bonus.service.createBonus()` gọi `tx.bonus.create({ data: { id: data.id, ... }})`.

Code references:
- `apps/api/src/dtos/bonus.dto.ts` dòng 11-15.
- `apps/api/src/bonus/bonus.service.ts` dòng 108-120.

#### 5.3 Class schedule slot: DTO cho phép nhận `id` optional, service merge/serialize theo `id`
- `ScheduleSlotDto.id` là optional + `@IsUUID()`.
- `updateClassSchedule()` gọi `mergeScheduleEntriesWithExisting()`, giữ `entry.id` rồi `serializeStoredClassScheduleEntries()` để ghi JSON schedule.

Code references:
- `apps/api/src/dtos/class.dto.ts` dòng 229-237, 262-272.
- `apps/api/src/class/class.controller.ts` dòng 171-186.
- `apps/api/src/class/class.service.ts` dòng 223-247, 249-274, 1181-1239.

#### 5.4 Student exam schedules: DTO nhận `id` optional, service createMany dùng `id` nếu có
- `StudentExamScheduleUpsertItemDto.id` optional + `@IsUUID()`.
- `updateStudentExamSchedules()` map dữ liệu và `createMany` với `...(item.id ? { id: item.id } : {})`.

Code references:
- `apps/api/src/dtos/student.dto.ts` dòng 320-327, 345-353.
- `apps/api/src/student/student.service.ts` dòng 859-907.
- `apps/api/src/user/user-profile.controller.ts` dòng 610-629.

### 6) Validation boundary liên quan trực tiếp đến `id`
- API bật global `ValidationPipe` với `transform: true` và `whitelist: true`.
- Với các DTO có `@IsUUID()` cho `id`, request id phải đúng UUID format để qua validation.

Code reference:
- `apps/api/src/main.ts` dòng 48-53.

## Code References
- `apps/web/lib/client-id.ts:3-13` - Hàm tạo id phía FE (`crypto.randomUUID` + fallback local).
- `apps/web/components/admin/class/AddClassPopup.tsx:49-58` - Tạo schedule slot id ở FE.
- `apps/web/components/admin/class/AddClassPopup.tsx:231-251` - Build schedule payload có `id`.
- `apps/web/components/staff/StaffCreateClassPopup.tsx:52-61` - Tạo schedule slot id ở staff flow.
- `apps/web/components/admin/class/EditClassPopup.tsx:67-80` - Tạo/giữ schedule slot id khi edit.
- `apps/web/components/admin/class/EditClassSchedulePopup.tsx:57-70` - Tạo/giữ schedule slot id khi edit schedule.
- `apps/web/components/admin/student/StudentExamSchedulePopup.tsx:51-63` - Tạo local exam item id.
- `apps/web/components/admin/student/EditStudentPopup.tsx:225-233` - Gửi `items[*].id` lên API.
- `apps/web/app/admin/staffs/[id]/page.tsx:1088-1095` - Bonus create payload có `id`.
- `apps/web/app/staff/profile/page.tsx:492-498` - Bonus create payload có `id`.
- `apps/api/src/dtos/bonus.dto.ts:11-15` - Bonus DTO bắt buộc `id`.
- `apps/api/src/bonus/bonus.service.ts:110-120` - Bonus service ghi `id` từ request.
- `apps/api/src/dtos/class.dto.ts:229-237` - Schedule slot DTO có `id?: string` + `@IsUUID()`.
- `apps/api/src/class/class.service.ts:223-247` - Serialize schedule entries, giữ field `id`.
- `apps/api/src/class/class.service.ts:249-274` - Merge schedule entries theo `id`.
- `apps/api/src/class/class.service.ts:1181-1239` - Update class schedule với dữ liệu đã merge.
- `apps/api/src/dtos/student.dto.ts:320-327` - Student exam schedule upsert item có `id?: string` + `@IsUUID()`.
- `apps/api/src/student/student.service.ts:899-907` - CreateMany exam schedule giữ `id` nếu client gửi.
- `apps/api/src/main.ts:48-53` - Global validation settings.

## Architecture Documentation (current state)
- FE có một utility tập trung (`createClientId`) để sinh id cục bộ, được tái sử dụng ở nhiều form tạo/sửa item con.
- BE có hai kiểu id strategy đồng thời:
  - Strategy A: DB-generated UUID (`@default(uuid())`) cho phần lớn bản ghi top-level.
  - Strategy B: Request-provided id cho một số flow cụ thể (bonus, class schedule JSON slot, student exam schedule upsert rows).
- Với các payload chứa `id` ở BE DTO, validation dùng `@IsUUID()` trước khi vào service layer.

## Historical Context
- Không có thư mục `thoughts/` trong repository hiện tại để đối chiếu thêm ngữ cảnh lịch sử.

## Related Research
- Không tìm thấy tài liệu research trước đó trong `docs/researches/` tại thời điểm thực hiện.

## Open Questions
- Những flow `id` dạng item con trong JSON/list (class schedule slot, student exam schedules) hiện được coi là business identifier lâu dài hay chỉ là identifier tạm cho merge/upsert.
- Chuẩn format cho `id` gửi từ FE ở các flow này hiện đang là UUID do DTO validate `@IsUUID()`, nhưng utility FE vẫn có fallback `local-*` khi không có `crypto.randomUUID`.
