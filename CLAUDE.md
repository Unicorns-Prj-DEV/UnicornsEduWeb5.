# Project Rules

## Documentation Sync (Bắt buộc)

Khi thay đổi code, **luôn cập nhật tài liệu liên quan trong cùng phiên làm việc**.

### Quy tắc bắt buộc
1. Mọi thay đổi ảnh hưởng hành vi hệ thống phải có cập nhật docs tương ứng.
2. Không kết thúc task khi docs còn lệch với code.
3. Nếu chưa có tài liệu phù hợp, tạo mục mới trong `docs/`.

### Mapping cập nhật docs
- Thay đổi Prisma schema (`apps/api/prisma/schema/*`) → cập nhật `docs/Database Schema.md`.
- Thay đổi API/DTO/response/auth flow → cập nhật tài liệu API tương ứng trong `docs/`.
- Thay đổi env/config/runtime dependency → cập nhật `.env.example` và tài liệu setup.
- Thay đổi kiến trúc/module quan trọng → cập nhật tài liệu kiến trúc hoặc README liên quan.

### Checklist trước khi hoàn tất
- [ ] Đã rà soát docs bị ảnh hưởng
- [ ] Đã cập nhật docs tương ứng
- [ ] Nội dung docs khớp với code hiện tại
