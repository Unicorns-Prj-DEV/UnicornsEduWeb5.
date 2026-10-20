# ADR: Video bảo vệ — đồng bộ qua UNIOJ, LMS tự ký token phát theo YouTube ID

- **Status:** Accepted
- **Date:** 2026-10-18
- **Liên quan:** UniVideo `docs/adr/0004-phat-theo-youtube-id-cho-lms.md`

## Context

Video tiết lý thuyết (`lessons.video_url`) và recording buổi học (`sessions.recording_url`) đang nhúng YouTube, học sinh thấy được link gốc. Kho video nội bộ UniVideo phát HLS mã hoá qua Cloudflare Worker, nhưng LMS chỉ có quyền gọi API `video-sync` của UNIOJ (nhận link, trả trạng thái theo `youtube_id`, không trả id Video, không cấp link phát) và không sửa được UNIOJ.

## Decision

1. LMS gửi link qua `POST /api/video-sync/` của UNIOJ mỗi khi link được lưu/đổi; trạng thái lưu một dòng mỗi `youtube_id`, cron 60 giây poll các dòng chưa xong. Học sinh mở trang chỉ đọc DB.
2. LMS tự ký token cho route Worker `/y/{youtube_id}` bằng `YT_TOKEN_SECRET` riêng, TTL cố định 4 giờ, chỉ trong endpoint đã kiểm quyền xem tiết/buổi (nhận `classId` + `lessonId`/`sessionId`, không nhận `youtube_id`).
3. Link YouTube không bao giờ tới trình duyệt học sinh. Video chưa sẵn sàng → «Video đang xử lý», không phát dự phòng bằng YouTube. Bật ngay cho mọi dữ liệu cũ, chấp nhận gián đoạn tới khi backfill xong.
4. Player: Vidstack + hls.js, tự xử lý `403` (xin link mới, phát tiếp đúng vị trí).

## Considered options

- **Gọi thẳng UniVideo `/v1` bằng Khóa API riêng:** đầy đủ nhất (thu hồi, SSE, xoá), nhưng chủ hệ thống chọn chỉ đi qua UNIOJ.
- **Fallback YouTube khi chưa sẵn sàng:** không gián đoạn, nhưng phá mục tiêu giấu link.
- **Backfill xong mới bật:** không gián đoạn, nhưng chủ hệ thống chọn bật ngay.

## Consequences

- Không thu hồi tức thì: gỡ/đổi link chỉ ngừng cấp link mới; ai đang cầm link phát tiếp tối đa 4 giờ.
- Vòng đời phát phụ thuộc Asset còn sống nhờ Video của UNIOJ; UNIOJ cam kết không xoá video gửi qua API.
- Link YouTube trong text tự do (nội dung tiết, tutorial buổi, BTVN) không được bảo vệ.
- Cần operator thêm domain LMS vào `CORS_ORIGIN` của Worker.
