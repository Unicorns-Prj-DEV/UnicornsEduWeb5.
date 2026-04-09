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

### Removed
- FE: component `AdminProfilePopup` (modal "Thông tin cá nhân" khi bấm avatar); export barrel `@/components/admin` không còn `AdminProfilePopup`. Thông tin cá nhân chỉ qua trang `/user-profile`.
- BE/FE notifications: gỡ cấu hình người nhận lưu DB và API `GET /notifications/recipient-options`; push/feed không còn filter theo đối tượng. Trên `/admin/notification`, ô **Người nhận** chỉ còn **mock UI (demo)** trên FE (tag + user giả), không gửi lên server.

### Added
- FE: `BrandLogoLockup` — khung mark + tách màu **Edu** (`text-primary`), khoảng cách chặt, hover lockup; Navbar / auth / sidebar (`dense` khi thu gọn).
- BE/FE: `notification_reads` (per-user đã đọc) + `GET /notifications/feed` trả `readStatus` + `PATCH /notifications/feed/:id/read`. Feed mở cho `student` (studentInfo active) và `admin` không bắt buộc staff profile. Sidebar `StaffSidebar` / `StudentSidebar`: `SidebarNotificationTray` (TanStack Query), panel phải + popup chi tiết giữa màn hình (Framer), auto mark read khi mở chi tiết; `@heroicons/react` `BellIcon`.
- BE/FE: Trợ cấp trợ lí 3% học phí đã học. Trợ lí (`assistant` role) quản lí các CSKH: `staff_info.customer_care_managed_by_staff_id` FK mới; snapshot `assistant_manager_staff_id` + `assistant_payment_status` trên `attendance` tại thời điểm tạo/cập nhật buổi học. Thu nhập trợ lí aggregate bằng raw SQL `ROUND(tuition_fee * 0.03)` chỉ trên attendance `present`, wire vào `getIncomeSummary`, `getUnpaidTotalsByStaffIds`, và dashboard unpaid CTE. API: `GET /staff/assistant-options`, `PATCH /staff` nhận thêm `customer_care_managed_by_staff_id`; `GET /staff/:id` trả `customerCareManagedBy`. FE: dropdown trợ lí trong popup sửa nhân sự CSKH. Migration: `20260405120000_add_assistant_manager_fields`.

### Fixed
- FE: popup **Chọn giao diện** (`SidebarThemePicker`) render qua `createPortal` → `document.body` để không bị cắt bởi `overflow-hidden` / `transform` trên sidebar.
- API: `NotificationService` feed + mark-read không còn dùng `include.reads` / `prisma.notificationRead` (tránh lệch type khi Prisma client chưa generate đủ); feed query `notification_reads` bằng `$queryRaw` + `Prisma.join`, mark read bằng `$executeRaw` `ON CONFLICT DO NOTHING`.

### Changed
- FE: chọn giao diện 3 chế độ (Sáng / Tối / Hoa anh đào) — `data-theme` + `localStorage` (`ue-app-theme`), `ThemeProvider`, logo theo theme (`logo_light` / `logo_dark` / `logo_hana`), nút `SidebarThemePicker` (icon Swatch) cạnh avatar + chuông trên `AdminSidebar` / `StaffSidebar` / `StudentSidebar`; script `beforeInteractive` tránh flash; tinh chỉnh token `[data-theme="pink"]` (tông hồng / rose). Asset `logo_hana.png` đã chạy lại `square-trim-logos`.
- FE `/user-profile`: icon xác minh email; khi chưa xác minh — nút «Xác minh email →→» (mutation + mock `mockResendVerificationEmail`, toast demo); mock `emailVerifiedWhenApiMissing` + `forceEmailUnverifiedForTest` trong `mocks/user-profile-verification.mock.ts`.
- FE `/user-profile`: bố cục hai cột (trái: avatar tròn + đặt lại mật khẩu + file ảnh; phải: bảng nhãn/giá trị căn gutter, `hr` giữa khối); `max-w-5xl`, bỏ Card hero một khối.
- FE: `AdminSidebar` / `StaffSidebar` — bấm avatar (menu mở rộng hoặc thu gọn, mobile drawer) điều hướng tới `/user-profile` thay vì mở `AdminProfilePopup` (đồng bộ với `StudentSidebar`).
- FE: sidebar dùng cùng `BrandLogoLockup` variant **`navbar`** như trang home (flex, gap, cỡ mark, typography); bỏ variant `sidebar` / grid. Thu gọn menu: `dense` (mark ~`h-9`/`sm:h-10`).
- Web: script `square-trim-logos.mjs` (`pnpm square:logos`) xử lý mọi PNG trong `image/logo/`: trim, canvas vuông, margin ~3px; `LOGO_MAX_EDGE` mặc định 1024. Sau đó nên chạy lại `favicon:ico`.
- Web: tối ưu logo/favicon — script `optimize-ui-logo.mjs` nén `image/logo/logo_light.png` (cạnh dài tối đa 1600px); `png-to-favicon-ico.mjs` gọn pipeline Sharp, trần prep (`FAVICON_PREP_MAX`), PNG zlib tối đa, `apple-icon` 180px; thêm `pnpm optimize:assets` / `optimize:logo`. `next.config.ts`: ưu tiên định dạng AVIF/WebP cho `next/image`.
- FE notifications (staff + student): realtime toast từ websocket chuyển sang bản tóm tắt; click toast hoặc action `Mở` sẽ mở trực tiếp popup chi tiết của đúng notification trong `SidebarNotificationTray` (giống click item trong panel), đồng thời mark-read nếu đang unread.
- FE notifications UI: panel chuông cải tiến nhẹ (header có summary số mới, item dạng card với nhấn mạnh unread), modal chi tiết thêm badge trạng thái (`Thông báo mới` / `Điều chỉnh vN`).
- FE `/admin/notification`: chuyển ô nội dung sang rich text editor (TipTap) để admin soạn thông báo có định dạng; validate submit dựa trên text thực (không chấp nhận nội dung rỗng chỉ có tag). Feed admin + modal chi tiết staff/student render HTML đã sanitize.
- FE notification typography: tiêu đề thông báo được nhấn mạnh hơn (input tiêu đề trên `/admin/notification` dùng chữ to + đậm khi nhập; tiêu đề khi hiển thị ở list admin và popup chi tiết cũng tăng size/weight để nổi bật).
- FE `/admin/notification` UI/UX tối giản thêm: lược bỏ note dài, thu gọn tiêu đề/copy, giảm padding và bo góc card, rút gọn trạng thái rỗng, và chuyển metadata item sang inline để màn hình gọn hơn.
- FE `/admin/notification` actions chuyển sang icon-only đồng bộ style hệ thống (tạo nháp, sửa, push, push lại, xóa, làm mới, hủy); giữ `aria-label`/`title` để không mất khả dụng.
- FE admin sidebar: thêm `SidebarNotificationTray` (icon chuông + panel/popup chi tiết) ở cụm action dưới cùng, đồng bộ trải nghiệm với staff/student.
- FE popup chi tiết thông báo: co giãn bề rộng theo độ dài nội dung (max trong viewport) để đọc thông báo dài/ngắn tự nhiên hơn.
- FE staff detail income stats (`/admin/staffs/[id]`, `/staff/profile`): đổi bảng số liệu sang card grid; block `Trước khấu trừ` chỉ hiển thị cho admin hoặc role kế toán.
- FE `/admin/classes/[id]` và `/staff/classes/[id]` (teacher/CSKH/admin workspace): bỏ card **Thông tin cơ bản** và dòng mô tả “Chi tiết lớp học…” (admin); thông tin lớp gọn dưới tiêu đề (chip trạng thái/loại + gói, trợ cấp, sĩ số, …); staff giữ đoạn mô tả workspace **dưới** dòng meta.
- FE: Popup thêm/sửa lớp (`AddClassPopup`, `EditClassPopup`, `EditClassBasicInfoPopup`) — học phí chỉ **Tổng gói** + **Số buổi**, không ô học phí/buổi; submit gửi `student_tuition_per_session` làm tròn; `compactTuitionPerSessionLine` chỉ hiện một dòng `…/buổi` khi nhập hợp lệ (thay cho gợi ý dài). UI tối giản: tiêu đề **Thêm lớp** / **Sửa lớp** / **Thông tin lớp**, section nhỏ (Gia sư, Học sinh, Học phí, Lịch), bỏ ghi chú trợ cấp/định dạng giờ dài.
- FE: `StaffSidebar` bỏ mục menu **Thông báo** (đã có chuông + panel); học sinh vốn không có mục này trong `StudentSidebar`.
- FE: Panel + modal thông báo (`SidebarNotificationTray`) portal vào `document.body` để không bị kẹt trong sidebar (ancestor có `transform`); mobile panel full viewport; z-index tách lớp với modal chi tiết.
- Docker: base image `node:20-alpine` → `node:24-alpine` cho `apps/api` và `apps/web` (build/run trong container).
- CI deploy VPS: `appleboy/ssh-action` thêm `command_timeout: 30m`; script deploy đặt `COMPOSE_PARALLEL_LIMIT=1`, `sleep` sau `up` và `NODE_OPTIONS=--max-old-space-size=384` khi chạy `prisma migrate deploy` để giảm OOM / exit **137** trên VPS nhỏ. `docs/Cách làm việc.md` thêm mục troubleshooting 137 + gợi ý swap/RAM.
- BE deploy: `prisma` CLI chuyển từ `devDependencies` sang `dependencies` của `apps/api` để `pnpm deploy --prod` đưa binary vào image Docker; workflow VPS gọi `npx prisma migrate deploy` thay vì `./node_modules/.bin/prisma` (tránh lỗi `stat: no such file` sau khi prune).
- BE/FE: Học phí buổi học giờ áp dụng cho cả trạng thái **Học** (`present`) và **Phép** (`excused`); chỉ **Vắng** (`absent`) mới không tính học phí. Sửa `resolveChargeableAttendanceTuitionFee`, filter chargeable students trong session create/update, và toàn bộ SQL/Prisma aggregate tính doanh thu học phí + 3% trợ lí trên dashboard/staff service. Trợ cấp gia sư (teacher allowance) vẫn chỉ đếm `present`. FE `isChargeableAttendanceStatus` mở rộng cho `excused` trong `SessionHistoryTable` và `AddSessionPopup`.
- FE: Buổi học đã thanh toán (`paid`) hoặc đã cọc (`deposit`): popup chỉnh sửa điểm danh chỉ hiển thị học sinh theo bản ghi attendance đã lưu (kèm tên từ BE), không merge roster lớp hiện tại. Buổi `unpaid` vẫn merge danh sách học sinh lớp.
- BE: API list session (`GET /sessions/class/:id`, `GET /sessions/staff/:id`) trả thêm `attendance[].student.fullName` để FE hiển thị tên học sinh trong buổi đã khóa.
- FE staff shell `staff.assistant`: sidebar thêm mục **Cá nhân** → `/staff/staffs/:ownStaffId`; **Dashboard** trỏ `/staff` (cùng UI dashboard gọn như nhân sự khác); `/staff/dashboard` chỉ còn redirect về `/staff`. Xóa màn dashboard riêng trợ lí (bảng trợ cấp inline) khỏi `/staff` — dùng `/staff/assistant-detail` hoặc trang chi tiết nhân sự cho nội dung sâu hơn.
- FE `/admin/notes-subject` và mirror `/staff/notes-subject` (assistant): tab **Quy định** dùng bảng danh sách + bấm dòng mở **bảng chỉnh sửa** inline (`RegulationsTabPanel`, `RulePostEditTable`); thêm mới vẫn qua popup.
- FE trang chi tiết nhân sự (`/admin/staffs/[id]`, mirror `/staff/staffs/[id]`, `/staff/profile`): `StaffIdentityOverview` đồng bộ UI với các card section (viền/shadow/tiêu đề giống “Thống kê thu nhập”), QR minimal **cùng hàng tiêu đề bên phải** (flex), khối thành tích nền `bg-bg-secondary/40`, parse `specialization` bỏ ngoặc kép bọc ngoài.

### Added
- BE/FE auth: thêm flow bắt buộc thiết lập mật khẩu cho user đăng nhập Google OAuth nếu account tương ứng chưa có `passwordHash`. Backend thêm `POST /auth/setup-password`, mở rộng `GET /auth/profile` và `GET /auth/me` với cờ `requiresPasswordSetup`, re-issue lại cookie sau khi setup thành công, và ghi audit `setup password`. Frontend thêm route `/auth/setup-password`, root auth gate để chặn mọi route đã đăng nhập khi còn thiếu mật khẩu, và redirect tự động từ Google callback sang flow này.
- BE server cache: thêm Postgres-backed dashboard cache service (`apps/api/src/cache/dashboard-cache.service.ts`) dùng bảng `dashboard_cache` cho các read endpoint nặng của admin dashboard (`GET /dashboard`, `GET /dashboard/topup-history`, `GET /dashboard/student-balance-details`) với key theo query params và TTL ngắn; nếu thao tác cache lỗi thì backend vẫn fallback query dữ liệu tươi từ PostgreSQL.
- BE self-service users: thêm endpoint `PATCH /users/me/staff-bonuses` để staff chỉnh `workType`, `month`, `amount`, `note` của khoản thưởng thuộc chính mình; route kiểm tra ownership bằng truy vấn hẹp `id` + `staffId` và không cho tự đổi `status`.
- BE dashboard: thêm endpoint `GET /dashboard/topup-history?month=&year=&limit=` trả lịch sử nạp (topup) trong tháng kèm tổng nạp tích lũy trước/sau mỗi giao dịch để phục vụ popup tra cứu.
- BE dashboard: thêm endpoint `GET /dashboard/student-balance-details?limit=` trả danh sách chi tiết học sinh - lớp - số dư (`account_balance > 0`) cho popup “Nợ học phí chưa dạy”.
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
- BE lesson: thêm `GET /lesson-task-options?search=&limit=` cho flow đổi task gốc của output; query giữ bounded search với `limit` nhỏ, select tối thiểu và recent-first khi không search để tránh tải danh sách task rộng xuống FE.

### Security
- BE auth/server hardening: thêm global HTTP rate limiting bằng `@nestjs/throttler` ở `AppModule`, bỏ qua health check `GET /`, và cân theo scale ~200 user với default `300 request / 60s / endpoint / IP`. Các route nhạy cảm dùng limit riêng để giảm false positive khi nhiều người dùng chung NAT/proxy: `POST /auth/login` (20/5 phút), `POST /auth/register` (10/giờ), `POST /auth/forgot-password` (5/giờ), `POST /auth/reset-password` (10/giờ), `POST /auth/change-password` (10/30 phút), `GET /auth/verify` (30/giờ), `POST /auth/refresh` (120/phút). Thêm env `THROTTLE_DEFAULT_*` và `TRUST_PROXY` để cấu hình runtime.

### Changed
- FE `/admin/dashboard`: khối **Báo cáo tài chính** chuyển sang card viền nhạt + tiêu đề trái và bảng 3 cột (Danh mục / Giá trị / Ghi chú), 9 dòng tóm tắt nghiệp vụ; bỏ cột nhóm và cụm 3 card tín hiệu phía trên bảng; giá trị **Tổng nạp** và **Nợ học phí chưa dạy** vẫn là link mở popup lịch sử nạp / số dư học sinh.
- FE `/admin/students`: thêm nút xóa (icon thùng rác) ở cuối mỗi dòng học sinh (desktop) với popup xác nhận; gọi `DELETE /student/:id` và tự refresh danh sách sau khi xóa.
- BE staff/student: chặn xóa cứng khi còn dữ liệu liên kết (staff còn `sessions.teacher_id`, student còn `attendance.student_id`), trả lỗi 400 rõ ràng để FE toast thay vì phát sinh lỗi Prisma foreign key (P2003).
- FE `/staff`: section **Thưởng** giờ cho bấm từng dòng để mở popup **Điều chỉnh thưởng** ngay tại chỗ; popup self-service giữ layout add/edit chung, hiển thị `payment status` ở dạng chỉ đọc và chỉ cho staff sửa nội dung thưởng của chính mình.
- FE `/admin/customer_care_detail/[staffId]` và `/staff/customer-care-detail`: tab **Hoa hồng** giờ hiển thị trạng thái thanh toán CSKH theo từng buổi học bằng badge lấy từ `customerCarePaymentStatus`; danh sách chi tiết buổi được đổi sang layout một hàng/ledger thay vì card, vẫn giữ học phí, hệ số CSKH và tiền commission trên cùng dòng.
- BE customer-care: `GET /customer-care/staff/:staffId/students/:studentId/session-commissions` trả thêm `paymentStatus` (fallback `pending` cho record cũ còn `null`) và co hẹp `select` trên truy vấn attendance để chỉ lấy đúng cột cần cho màn chi tiết CSKH.
- FE tab `Công việc` (`/admin/lesson-plans`): thêm tick chọn nhiều + popup cập nhật `paymentStatus` hàng loạt cho bảng **Bài giáo án đã làm**; thanh bulk action chỉ hiện khi có ít nhất 1 item được chọn và dùng cùng UI checkbox minimal/bulk bar của hệ thống.
- FE bulk selection UI: chuẩn hoá checkbox tick (minimal) và bulk action bar chỉ hiện khi có selection cho các bảng lịch sử buổi học (lớp + nhân sự), đồng bộ UX “tick → hiện thanh hành động”.
- FE bulk selection UI: áp dụng cùng behavior “chỉ hiện thanh bulk khi đã chọn” cho các màn thanh toán hàng loạt (Chi phí, Trợ cấp thêm, Giáo án theo nhân sự) và chuẩn hoá checkbox tick theo style minimal dùng chung.
- FE `/admin/classes/:id`: đồng bộ và cải tiến UI/UX vùng **Lịch sử & Khảo sát** theo backup (tab underline, thanh điều khiển tổng buổi + điều hướng tháng + nút thêm), đồng thời bật chọn nhiều buổi để chuyển nhanh trạng thái thanh toán ngay trong tab Lịch sử.
- FE `/admin/lesson-manage-details`: mở rộng khung hiển thị (max width lớn hơn), bỏ block heading mô tả “Quản lí Giáo Án chi tiết…”, và thêm nút **Quay lại** về trang `lesson-plans`.
- FE tab **Giáo Án**: đồng bộ cụm thao tác cột `Link` theo backup với icon **copy / mở liên kết / xóa** trên từng dòng bài (giữ layout cột `Tag | Tên bài | Link`).
- FE `/admin/lesson-plans`: flow chi tiết `LessonOutput` quay về popup dùng chung trong workspace; tab **Công việc**, tab **Giáo Án**, màn hình phóng to và trang task detail đều mở popup ngay tại chỗ thay vì dựa vào route detail riêng.
- FE tab **Giáo Án**: đồng bộ header popup với tab **Công việc** (kicker `Bài giáo án`, title `Chỉnh sửa thông tin bài`, cùng chiều rộng modal) để UI thống nhất.
- FE tab **Giáo Án** popup bài trong chuyên đề: tối ưu lại để dùng chung trực tiếp `LessonOutputEditorForm` (cùng form với tab **Công việc**), không duy trì form chỉnh sửa riêng.
- FE tab **Giáo Án** popup **Thông tin chi tiết bài**: thêm nút **Chỉnh sửa** ở cuối form chi tiết; bấm vào sẽ mở form chỉnh sửa ngay trong popup và lưu bằng API update output.
- FE tab **Giáo Án** popup **Thông tin chi tiết bài**: bổ sung hiển thị thêm **Ngày tạo** và **Người tạo** để form chi tiết đầy đủ hơn khi bấm vào bài trong chuyên đề.
- FE tab **Giáo Án** (tab bài tập cũ): bấm vào dòng bài hoặc tên bài trong danh sách chuyên đề giờ mở popup **Thông tin chi tiết bài** ngay trong tab, không điều hướng sang trang mới.
- FE `/admin/dashboard`: trong bảng **Báo cáo tài chính**, đổi nhãn dòng cuối từ **Tổng niên** thành **Tổng nhận** để đúng wording nghiệp vụ.
- FE `/admin/dashboard`: khối **Cảnh báo & hành động** đồng bộ lại đúng 4 thẻ theo backup (`Học sinh cần gia hạn`, `Chờ thanh toán trợ cấp`, `Lớp chưa báo cáo lần 4`, `Chưa thu học phí`) cùng tone màu riêng cho từng thẻ và style item trong card.
- FE `/admin/dashboard`: đồng bộ lại UI/UX khối **Cảnh báo & hành động** theo màu từng loại cảnh báo (warning/destructive/info/default), card rõ trọng tâm hơn và mỗi dòng cảnh báo có thể bấm để đi tới trang chi tiết tương ứng.
- BE/FE dashboard alerts: mở rộng payload `actionAlerts` với `targetType` + `targetId`; thêm nhóm cảnh báo lớp (`Lớp cảnh báo`) dựa trên `classPerformance.balanceRisk` để hỗ trợ điều hướng sang `/admin/classes/:id`.
- FE `/admin/dashboard`: bấm vào giá trị dòng **Tổng nạp** trong bảng tài chính sẽ mở popup **Lịch sử nạp** theo backup (ngày giờ, học sinh, số tiền nạp, ghi chú, tổng nạp tích lũy trước/sau) theo tháng đang chọn.
- FE `/admin/dashboard`: bấm vào giá trị dòng **Nợ học phí chưa dạy** sẽ mở popup chi tiết theo backup với bảng 3 cột **Học sinh / Lớp / Số dư**.
- FE `/admin/dashboard`: thay 2 ô lọc tháng/chọn tháng bằng thanh hành vi chuyển tháng (nút trước/sau + nhãn tháng hiện tại) để thao tác nhanh hơn.
- FE `/admin/dashboard`: tinh chỉnh lần 2 để bám sát backup hơn (thêm card `Chưa thu` cùng cụm KPI, highlight 2 dòng tài chính trọng tâm, card cảnh báo dạng cột có header màu + danh sách scroll, bỏ cụm summary cuối trang).
- FE `/admin/dashboard`: đồng bộ UI/UX và bố cục theo backup theo hướng tối giản (lọc thời gian + xuất PDF/Excel, dải KPI card, bảng báo cáo tài chính, card cảnh báo & hành động, quick-view theo phân hệ với tab + chọn năm), giữ dữ liệu thật từ `GET /dashboard`.
- Web dependencies: thêm `recharts` cho `apps/web` để sửa lỗi build `Module not found: Can't resolve 'recharts'` ở trang `/admin/dashboard`.
- FE popup `EditStudentPopup` (`/admin/students/:id`): tối giản bố cục form chỉnh sửa hồ sơ học sinh (bỏ bớt mô tả dài, giảm tầng card/bo góc/spacing, giữ nguyên logic cập nhật dữ liệu và các khối CSKH + lịch thi).
- FE `/admin/lesson_plan_detail/[staffId]`: tối giản trang chi tiết giáo án theo staff, chỉ giữ 3 card tổng hợp (**Tổng số bài**, **Đã thanh toán**, **Chưa thanh toán**) và bảng danh sách bài đã làm theo cấu trúc tab `Công việc` (Tag/Level/Tên bài/Trạng thái/Contest/Link), bỏ hero + metadata nhân sự và detail-row mở rộng.
- FE tab **Công việc**: sau khi tạo bài mới sẽ tự mở popup chi tiết của output vừa tạo để chỉnh tiếp ngay tại workspace, không còn điều hướng qua route riêng.
- FE `/admin/lesson-plans/tasks/[taskId]`: ngoài flow tạo resource mới, trang chi tiết task có thêm panel **Đính kèm từ DB** để tìm trực tiếp trong bảng `LessonResources` và gắn/chuyển resource có sẵn sang task hiện tại.
- FE `/admin/lesson-plans/tasks/[taskId]`: bấm vào resource trong trang detail task giờ mở đúng popup `LessonResource` shared giống `/admin/lesson-plans`, thay vì dùng popup detail riêng hoặc bật link trực tiếp từ list.
- FE/BE `/admin/lesson-plans/tasks/[taskId]` + `GET /lesson-resource-options`: sửa lỗi panel search tài nguyên có thể trả rỗng sai khi resource chưa gắn task; query backend giờ giữ lại standalone resources và FE hiển thị trạng thái lỗi/retry rõ ràng nếu API search thất bại.
- FE/BE `/admin/lesson-plans/tasks/[taskId]`: thêm thao tác **Gỡ khỏi task** ngay trên từng resource card; FE gọi `PATCH /lesson-resources/:id` với `lessonTaskId = null` để trả resource về thư viện chung mà không xóa bản ghi.
- FE `LessonTagPicker`: dropdown tag chuyển sang render bằng portal theo vị trí input, nên có thể tràn ra ngoài popup/modal mà không bị clip; popup tạo/chỉnh sửa lesson resource trong `/admin/lesson-plans` hưởng luôn UX này.
- FE popup **Chỉnh sửa thông tin bài** (tab Công việc) đồng bộ lại theo backup: bố cục 2 cột gọn, field tiếng Việt theo thứ tự nhập liệu thực tế (Tên bài, Link gốc, Tên gốc/Nguồn, Tag/Level, Ngày + Checker/Code + Chi phí, Trạng thái, Contest, Link), giữ UX tag picker và thao tác lưu nhanh tại chỗ.
- FE tab **Công việc**: bấm vào dòng trong bảng “Bài giáo án đã làm” giờ mở popup **Chỉnh sửa thông tin bài** ngay trong trang (load chi tiết theo `lesson-output id`, cập nhật bằng `PATCH /lesson-outputs/:id`), giúp chỉnh sửa nhanh không cần rời tab.
- FE `LessonWorkAddLessonForm` (Thêm bài mới): tối giản bố cục theo hướng compact (giảm tầng card/spacing, rút gọn phần tag nhanh và helper text) để nhập liệu nhanh hơn trong tab Công việc.
- FE tab **Công việc**: bảng “Bài giáo án đã làm” đồng bộ lại theo backup (layout gọn, cột checkbox · Tag · Level · Tên bài · Trạng thái thanh toán · Contest · Link; cụm icon copy/mở/xóa bên phải).
- FE tag filter picker: cho phép chọn liên tục nhiều tag (multi-select chips) như backup; BE `GET /lesson-work` cập nhật filter `tag` hỗ trợ nhiều term phân tách bằng dấu phẩy/chấm phẩy.
- FE **Bộ lọc nhanh** (tab Công việc/Giáo Án): trường Tag chuyển sang picker UI/UX giống form thêm bài (dropdown nhóm level + search + chọn trực tiếp), đồng bộ thao tác với backup.
- FE tag picker (`LessonTagPicker`): nhóm **KHÁC** ở cuối list giờ hiển thị toàn bộ tag mới đã từng được thêm (lưu local), đúng flow backup khi chọn tag cũ/tag mới.
- FE tag UX trong form **Thêm bài mới** (Giáo án): chọn tag cũ qua dropdown nhóm level theo backup, mỗi tag có icon, và thêm tag mới ngay trong form bằng Enter/nút **Thêm** trước khi submit.
- FE lesson forms (`LessonWorkAddLessonForm`, `LessonOutputEditorForm`): UI/UX chọn tag đồng bộ backup bằng dropdown list phân nhóm `LEVEL 0..5` + `KHÁC`, hỗ trợ tìm kiếm và chọn trực tiếp nhiều tag.
- FE `/admin/lesson-plans` tab **Công việc** + tab **Giáo Án**: tối giản UI khối **Bộ lọc nhanh** và **Thêm bài mới** (ẩn mặc định, bấm mới mở), bỏ các đoạn ghi chú/phụ đề dài để form gọn hơn; icon phóng to ở tab **Giáo Án** đổi sang style hiện đại (outline + subtle motion).
- FE `/admin/lesson-plans` tab thứ 3 đổi tiêu đề thành **Giáo Án**; thêm icon phóng to ở góc header để mở `/admin/lesson-manage-details` (bản quản lí chi tiết/phóng to của cùng dataset), và có nút thu gọn quay về tab trong workspace.
- FE `/admin/lesson-plans` tab **Giáo Án** (`LessonExercisesTab`): thay placeholder — sidebar Level 0–5, bộ lọc nhanh (`ex*`), bảng Các bài đã làm (Tag · Tên bài · Link), cùng API `GET /lesson-work`; BE `GET /lesson-work`: thêm query `level` (`0`…`5`); response mỗi output thêm `originalLink` (fallback link).
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
- Docker Compose production: pin `api.PORT=4000` và `web.PORT=3000` ngay trong `docker-compose.prod.yml` vì cả hai service cùng dùng chung `.env`; tránh việc `PORT=4000` của backend override Next.js khiến container `web` listen ở `4000` còn Nginx vẫn proxy sang `web:3000` và phát sinh 502.
- Nginx (`nginx/conf.d/app.conf`): thêm exact-match redirect `location = /api { return 301 /api/; }` để `GET /api` không rơi xuống `location /` và trả HTML của Next.js; với proxy đang strip prefix, verify backend bằng `GET /api/` (kỳ vọng `Hello World!`) hoặc mở Swagger tại `/api/api`.
- Nginx (`nginx/conf.d/app.conf`): bỏ khối `upstream` tĩnh, dùng `resolver 127.0.0.11` + `proxy_pass` qua biến (`web`/`api`) để Docker DNS cập nhật IP sau khi recreate container — tránh 502 `connect() failed (111: Connection refused)` tới IP cũ (ví dụ `172.18.0.3:3000`). `server_name` đổi thành `_` để truy cập bằng IP không bị lệch virtual host.
- Docker API: copy `prisma.config.ts` vào image production (cùng `WORKDIR /app`). Prisma 7 lấy `datasource.url` từ file này (`process.env.DATABASE_URL`); thiếu file khiến `prisma migrate deploy` trên VPS báo `The datasource.url property is required in your Prisma config file` dù đã có `--schema`.
- Docker API/Web: sau khi `COPY` vào image, chạy `chown -R appuser:appgroup /app` để tiến trình không-root ghi được dưới `node_modules` (Prisma cần ghi thư mục `@prisma/engines`). Tránh lỗi deploy `Can't write to ... @prisma/engines please make sure you install "prisma" with the right permissions`.
- FE popup xem tutorial Codeforces (`ProblemTutorialPopup`): HTML từ TipTap được chuyển sang chuỗi markdown trước `react-markdown` + KaTeX (`lib/tutorial-markdown.ts`), không còn hiển thị literal thẻ `<p>` / `</p>` khi xem nội dung đã lưu dạng HTML.
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
