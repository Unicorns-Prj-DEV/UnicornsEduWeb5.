# Changelog / Lịch sử thay đổi

Mọi thay đổi đáng kể của dự án được ghi lại tại file này.

**Quy ước:** Trước khi commit và push lên git, bắt buộc ghi lại các thay đổi vào file này (theo format bên dưới).

---

## Ghi chú cho Cursor (AI)

**Bạn (Cursor) cần tuân thủ rule sau:** Luôn ghi lại log thay đổi vào file `docs/CHANGELOG.md` trước khi đẩy code lên git (trước khi commit/push). Rule tương ứng nằm tại `.cursor/rules/changelog-before-push.mdc`. Mỗi khi chuẩn bị commit hoặc push, hãy cập nhật phần **[Unreleased]** bên dưới với các mục đã thay đổi, rồi mới thực hiện commit/push.

---

## Format

- Mỗi phiên bản có ngày và các mục: `Added`, `Changed`, `Fixed`, `Removed`, `Security`, v.v.
- Phần **[Unreleased]** dùng cho các thay đổi chưa release; trước khi commit/push thì ghi vào đây, sau đó có thể chuyển thành version có ngày.

---

## [Unreleased]

### Added
- BE class: 4 endpoint PATCH riêng cho từng form cập nhật lớp — `PATCH /class/:id/basic-info`, `PATCH /class/:id/teachers`, `PATCH /class/:id/schedule`, `PATCH /class/:id/students`. Khi form basic-info gửi `allowance_per_session_per_student`, backend đồng bộ toàn bộ `class_teachers.customAllowance` của lớp về giá trị đó.
- Xóa buổi học: bảng lịch sử buổi học có nút xóa (icon thùng rác) trong cột Thao tác; bấm vào hiện confirm, xác nhận thì gọi `DELETE /sessions/:id`, toast và invalidate sessions.
- Chỉnh sửa buổi học đầy đủ: bảng lịch sử buổi học có cột "Thao tác" (khi có `onSessionUpdated`) với nút "Sửa" mở dialog chỉnh sửa ngày học, gia sư phụ trách, giờ bắt đầu/kết thúc, ghi chú (rich text), trạng thái thanh toán, **điểm danh học sinh** (trạng thái Học/Phép/Vắng + ghi chú từng học sinh). Trang lớp truyền `teachers` và `getClassStudents`; trang gia sư truyền `getTeachersForClass(classId)` và `getClassStudents(classId)`. BE: list session trả thêm `attendance`; `PUT /sessions/:id` hỗ trợ `teacherId`, `teacherPaymentStatus`, `attendance`.
- Session notes rich text: bảng lịch sử buổi học (SessionHistoryTable, entityMode=teacher) hiển thị ghi chú dạng HTML đã sanitize (DOMPurify); dialog chỉnh sửa buổi học dùng RichTextEditor (TipTap) cho ghi chú. Popup thêm buổi học dùng RichTextEditor cho ghi chú thay cho textarea. Shared `RichTextEditor` và `sanitizeHtml` (lib/sanitize.ts) dùng chung với notes-subject.
- Trang Ghi chú môn học (`/admin/notes-subject`): 2 tab Quy định và Tài liệu. Tab Quy định cho phép thêm bài post quy định (tiêu đề, mô tả, nội dung TipTap) dùng mock data trong page; Tab Tài liệu hiển thị list contest của group Codeforces, bấm contest hiện list bài (theo thứ tự gốc), bấm bài mở popup chỉnh sửa tutorial.
- Tab Tài liệu (Ghi chú môn học): 3 dòng tài liệu (Luyện tập, Khảo sát, Thực chiến); bấm vào mới load contest của group tương ứng; hiển thị website link đầu mỗi contest; nút "Mở trên CF" dùng custom domain (unicornsedu.contest.codeforces.com, v.v.) thay vì codeforces.com.
- Khi bấm vào contest: mở rộng hiển thị danh sách bài trong contest (theo thứ tự gốc).
- Khi bấm vào bài: mở popup chỉnh sửa tutorial (rich text).
- API proxy Codeforces: `GET /codeforces/doc-groups`, `GET /codeforces/contests?groupCode=`, `GET /codeforces/contests/:contestId/problems` (yêu cầu CODEFORCES_API_KEY, CODEFORCES_API_SECRET).
- API tutorial bài: `GET /cf-problem-tutorial/:contestId/:problemIndex`, `PATCH /cf-problem-tutorial/:contestId/:problemIndex`.
- Model Prisma `CfProblemTutorial` lưu tutorial theo contestId + problemIndex.
- BE `sessions`: thêm endpoint `DELETE /sessions/:id` để xóa session theo id.

### Changed
- FE `/admin/lesson-plans` tab **Bài tập** (`LessonExercisesTab`): thay placeholder — sidebar Level 0–5, bộ lọc nhanh (`ex*`), bảng Các bài đã làm (Tag · Tên bài · Link), nút + → tab Công việc (form Thêm bài mới không nằm trên tab Bài tập); cùng API `GET /lesson-work`; nhãn tab thứ ba **Bài tập** (thay “Giáo án”). BE `GET /lesson-work`: thêm query `level` (`0`…`5`); response mỗi output thêm `originalLink` (fallback link).
- FE `/admin/lesson-plans` tab **Công việc**: **Bộ lọc nhanh** + **Thêm bài mới** (`LessonWorkAddLessonForm` — 4 khối card, lưới cặp trường + hàng 3 cột ngày/thanh toán/chi phí, Checker/Code trong “Gắn tag nhanh”; map thanh toán → `cost`; không task/nhân sự trên UI) + bảng “Bài giáo án đã làm”. BE `GET /lesson-work` (lọc tháng/ngày/search/…); `POST /lesson-outputs` với `lessonTaskId`/`staffId` có thể `null`.
- FE `/admin/lesson-plans` tab Tổng quan: bảng **Tài nguyên** tối giản — bỏ mô tả dưới tiêu đề section; bảng chỉ cột Tài nguyên / Link / Tag (+ thao tác), bỏ cột Cập nhật và mô tả trong ô; bảng **Công việc** bỏ mô tả dưới tiêu đề và không hiển thị mô tả dưới tiêu đề từng dòng.
- FE `/admin/lesson-plans`: thanh tab **Tổng quan / Công việc / Bài tập** full width trong khối nội dung, ba nút chia đều (`flex-1`), tăng chiều cao và padding; bỏ `sm:w-fit` + `sm:flex-none` để không còn thanh pill quá hẹp trên desktop.
- Refresh docs cho trạng thái repo hiện tại: cập nhật `README.md`, `apps/web/README.md`, `docs/README.md`, `docs/Cách làm việc.md`, `docs/pages/README.md` và `docs/pages/admin.md` để phản ánh đúng route đang có, command `pnpm --filter ...`, API port/env note, và snapshot review ngày `2026-03-16`.
- FE `/admin/classes/:id`: 4 form chỉnh sửa (thông tin cơ bản, gia sư, khung giờ, học sinh) gọi lần lượt `updateClassBasicInfo`, `updateClassTeachers`, `updateClassSchedule`, `updateClassStudents` thay vì một `updateClass` chung.
- FE `/admin/classes`: thêm phân trang theo `page` query param (Trước/Sau), reset `page=1` khi đổi search/type, đồng bộ lại `page` từ `meta.page` backend và hiển thị phạm vi kết quả hiện tại.
- FE `/admin/classes/:id`: nút `+ Thêm buổi học` ở tab Lịch sử đã mở popup form tạo session (ngày học, gia sư, thời gian, ghi chú, điểm danh học sinh) và submit qua `POST /sessions`.
- FE `/admin/classes/:id`: thay dữ liệu học sinh mock bằng dữ liệu thật `students` từ `GET /class/:id` để hiển thị bảng học sinh và làm nguồn điểm danh trong popup.
- BE `GET /class/:id`: trả thêm `students` (id, fullName, status, remainingSessions) lấy từ `student_classes` + `student_info`.
- FE popup thêm session: siết validation độ dài ghi chú (`notes`, `attendance.notes`) và chuẩn hóa thông báo lỗi theo hướng generic để tránh lộ lỗi nội bộ từ backend.
- Cập nhật `.env.example`: thêm 3 nhóm tài liệu (CODEFORCES_GROUP_LUYEN_TAP, CODEFORCES_GROUP_KHAO_SAT, CODEFORCES_GROUP_THUC_CHIEN) và 3 website (CODEFORCES_WEBSITE_LUYEN_TAP, CODEFORCES_WEBSITE_KHAO_SAT, CODEFORCES_WEBSITE_THUC_CHIEN).
- FE `/admin/notes-subject`: harden phần render bài Quy định bằng sanitize HTML trước khi `dangerouslySetInnerHTML`; popup tutorial xử lý rõ trạng thái lỗi tải dữ liệu và tránh reset form khi React Query refetch trong lúc đang nhập.
- FE `/admin/notes-subject`: redesign layout theo chuẩn các trang admin khác (wrapper có margin, border, surface card); tab Tài liệu cập nhật tương tác tutorial thành 2 mode: view-mode khi bấm vào dòng bài, edit-mode khi bấm nút `Chỉnh sửa`.
- FE `/admin/staff/:id`: bảng "Lớp phụ trách" đã render dữ liệu `classAllowance` từ API (Tổng nhận / Chưa nhận / Đã nhận) theo từng lớp thay cho giá trị hardcode 0.
- FE: thêm API client `session.api.ts` + DTO `session.dto.ts`; tái sử dụng component `SessionHistoryTable` để hiển thị lịch sử session ở cả `/admin/classes/:id` và `/admin/staff/:id`.
- FE `/admin/classes/:id`: tab Lịch sử đã lấy dữ liệu thật từ `GET /sessions/class/:classId?month=&year=` (TanStack Query), lọc theo tháng ở backend và hiển thị trạng thái timeline (Đã hoàn thành/Đã lên lịch).
- FE `/admin/staff/:id`: thêm card riêng "Lịch sử buổi học" dùng `GET /sessions/staff/:staffId?month=&year=` với điều hướng tháng (prev/next).
- FE `/admin/staff/:id`: phần Tổng tháng/Chưa nhận/Đã nhận và Tổng năm đã dùng dữ liệu thật từ session API (tháng hiện chọn + tổng hợp 12 tháng trong năm).
- FE admin detail pages (`/admin/classes/:id`, `/admin/staff/:id`): thay trạng thái loading text bằng skeleton loading cho bảng lịch sử session và phần khung chi tiết.
- FE `SessionHistoryTableSkeleton`: chuẩn hoá conditional rendering theo `entityMode`; bỏ phụ thuộc vào cờ hiển thị riêng để tránh lệch cột/header khi đổi mode.
- BE `CodeforcesService`: thay cơ chế gọi Codeforces API từ `https.get` sang `@nestjs/axios` (`HttpService.axiosRef`) để đồng bộ HTTP client trong backend và đơn giản hoá parsing response JSON.
- BE `sessions`: cập nhật DTO create/update theo shape attendance từ FE (không yêu cầu `sessionId`/`attendance.id` trong payload), parse/validate date-time rõ ràng hơn, và update attendance theo cơ chế sync (upsert + delete bản ghi không còn trong payload) thay vì xóa toàn bộ rồi tạo lại.

### Fixed
- FE `/admin/lesson-plans`: sửa type error của `LessonWorkQuickFilters`/output detail để `pnpm --filter web exec tsc --noEmit` pass lại; form chi tiết output giờ chỉnh sửa được cả output chưa gắn task; title cell ở tab **Công việc** và **Bài tập** trở thành link focus được bằng bàn phím; form **Thêm bài mới** hỗ trợ đủ Level `0`–`5`.
- BE `GET /lesson-work`: gộp summary counts theo `groupBy(status)` thay cho nhiều lần `count` lặp lại; bổ sung index cho `lesson_outputs` theo `date`, `(status, date)`, `(staff_id, date)`, `updated_at`; `PATCH /lesson-outputs/:id` giờ chấp nhận `lessonTaskId: null` để detach output khỏi task.
- BE: xóa `console.log(month, year)` debug trong `SessionController` để tránh log nhiễu ở môi trường runtime.
- BE: đăng ký lại `CodeforcesModule` và `CfProblemTutorialModule` trong `AppModule` để các endpoint Codeforces/tutorial hoạt động ổn định sau merge.
- BE `GET /staff/:id`: sửa truy vấn tổng hợp `classAllowance` dùng đúng `staff id` động thay cho teacher id hardcode; đồng thời trả `404` khi không tìm thấy staff.
- BE `sessions`: controller đã forward đủ `month/year` cho cả endpoint class/staff; service validate `month/year` và sửa date-range theo chuẩn `[startOfMonth, startOfNextMonth)` để không mất dữ liệu ngày cuối tháng.
- BE `sessions`: thêm validate attendance payload để trả lỗi 400 cho dữ liệu không hợp lệ/`studentId` trùng lặp thay vì phát sinh lỗi runtime.
- BE `sessions`: siết validate định dạng `startTime`/`endTime` theo `HH:mm` hoặc `HH:mm:ss` để chặn giá trị giờ/phút/giây ngoài phạm vi hợp lệ.

---

## [0.0.0] – Khởi tạo

- Changelog và rule ghi log trước khi push.
