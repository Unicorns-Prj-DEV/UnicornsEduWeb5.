# Project Rules

## Cài đặt dependencies (Package installation)

- **Luôn cài đặt thư viện vào `node_modules` của từng app**, không dùng `.pnpm-store` trong project.
- Khi thêm package mới, chạy `pnpm add <package>` **từ thư mục của app**:
  - API: `cd apps/api && pnpm add <package>`
  - Web: `cd apps/web && pnpm add <package>`
- Để tránh tạo `.pnpm-store` trong project, chạy một lần trên máy:  
  `pnpm config set store-dir ~/.local/share/pnpm/store` (hoặc bỏ qua nếu đã dùng store global).

## Documentation Sync (Bắt buộc)

Trước khi bắt đầu bất kỳ task nào, **luôn đọc `docs/`** (tương ứng `../../docs/` từ `apps/api`) để nắm context tài liệu hiện tại.

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

## Quy tắc bổ sung (Bắt buộc)

- Luôn viết báo cáo khi hoàn tất yêu cầu (nêu rõ thay đổi, phạm vi ảnh hưởng, kết quả verify).
- Frontend phải dùng Sonner để thông báo cho người dùng (toast success/error) thay vì render thông báo inline nếu không có yêu cầu đặc biệt.
---

## Best practices & stack conventions

- Trước khi implement, **luôn kiểm tra và áp dụng best practice** tương ứng (framework, bảo mật, hiệu năng) theo tài liệu chính thống hoặc `docs/`.

### Frontend (`apps/web`)

- **TanStack Query (React Query):** Dùng cho mọi server state: fetch dữ liệu, cache, mutation. Ưu tiên `useQuery` / `useMutation` với Axios client trong `lib/client.ts`. Không fetch trong `useEffect` thuần khi dữ liệu là server state.
- **Validation/Transform:** Chọn giải pháp phù hợp theo từng module (không bắt buộc `class-validator` / `class-transformer`).

### Backend (`apps/api`) & DTO

- **Swagger (OpenAPI):** Mọi controller phải có Swagger decorators: `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, `@ApiBody()`, `@ApiParam()`, `@ApiCookieAuth()` khi cần.
- **DTO:** Dùng interface cho request/response types.
