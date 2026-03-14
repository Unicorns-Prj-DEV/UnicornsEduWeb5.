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
- Trang Ghi chú môn học (`/admin/notes-subject`): 2 tab Quy định và Tài liệu. Tab Quy định cho phép thêm bài post quy định (tiêu đề, mô tả, nội dung TipTap) dùng mock data trong page; Tab Tài liệu hiển thị list contest của group Codeforces, bấm contest hiện list bài (theo thứ tự gốc), bấm bài mở popup chỉnh sửa tutorial.
- Tab Tài liệu (Ghi chú môn học): 3 dòng tài liệu (Luyện tập, Khảo sát, Thực chiến); bấm vào mới load contest của group tương ứng; hiển thị website link đầu mỗi contest; nút "Mở trên CF" dùng custom domain (unicornsedu.contest.codeforces.com, v.v.) thay vì codeforces.com.
- Khi bấm vào contest: mở rộng hiển thị danh sách bài trong contest (theo thứ tự gốc).
- Khi bấm vào bài: mở popup chỉnh sửa tutorial (rich text).
- API proxy Codeforces: `GET /codeforces/doc-groups`, `GET /codeforces/contests?groupCode=`, `GET /codeforces/contests/:contestId/problems` (yêu cầu CODEFORCES_API_KEY, CODEFORCES_API_SECRET).
- API tutorial bài: `GET /cf-problem-tutorial/:contestId/:problemIndex`, `PATCH /cf-problem-tutorial/:contestId/:problemIndex`.
- Model Prisma `CfProblemTutorial` lưu tutorial theo contestId + problemIndex.

### Changed
- Cập nhật `.env.example`: thêm 3 nhóm tài liệu (CODEFORCES_GROUP_LUYEN_TAP, CODEFORCES_GROUP_KHAO_SAT, CODEFORCES_GROUP_THUC_CHIEN) và 3 website (CODEFORCES_WEBSITE_LUYEN_TAP, CODEFORCES_WEBSITE_KHAO_SAT, CODEFORCES_WEBSITE_THUC_CHIEN).

---

## [0.0.0] – Khởi tạo

- Changelog và rule ghi log trước khi push.
