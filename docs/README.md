# Unicorns Edu 5.0 – Docs

Tài liệu dự án, dùng làm context khi làm việc với codebase.

---

## Mục lục

| Tài liệu | Mô tả |
|----------|--------|
| [**Database Schema**](Database%20Schema.md) | Schema DB (Prisma), danh sách bảng, quan hệ, enums, cách tạo lại DB từ schema |
| [**UI-Schema**](UI-Schema.md) | Design system: màu, token, theme, component conventions |
| [**Workplan**](Workplan.md) | Kế hoạch theo tuần, phân công, milestone |
| [**Cách làm việc**](Cách%20làm%20việc.md) | Quy ước làm việc, workflow, convention |
| [**Pages (README)**](pages/README.md) | Spec từng route (admin, mentor, student, assistant, auth, landing) |

---

## Nhanh

- **Backend / DB:** Đọc [Database Schema](Database%20Schema.md) → schema tại `apps/api/prisma/schema/*.prisma`, tạo bảng: `cd apps/api && npx prisma migrate deploy --schema=./prisma/schema/`.
- **Frontend / UI:** Đọc [UI-Schema](UI-Schema.md) và [pages/README](pages/README.md).
- **Tiến độ:** Đọc [Workplan](Workplan.md) và [Cách làm việc](Cách%20làm%20việc.md).
