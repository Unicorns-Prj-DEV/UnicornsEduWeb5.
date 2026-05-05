# PRD (điều chỉnh): % trên quan hệ gia sư–lớp — dùng `class_teachers.tax_rate_percent`

## Bối cảnh kỹ thuật (đọc trước khi triển khai)

- Bảng **`class_teachers`** đã có cột **`tax_rate_percent`**.
- Trong Prisma, cột này map tới field **`operatingDeductionRatePercent`** trên model `ClassTeacher`.
- Theo tài liệu và luồng payroll hiện tại, **semantic chính thức** của cột này là **% khấu trừ vận hành** (áp trên gross trợ cấp buổi), **không** phải **% khấu trừ thuế thu nhập** sau vận hành (cái sau đang resolve theo role + `staff_tax_deduction_overrides`, snapshot ở `sessions.teacher_tax_deduction_rate_percent`).

**Hệ quả cho product:** Nếu màn “Lớp phụ trách” cần hiển thị/sửa đúng **“thuế / khấu trừ thu nhập theo lớp”** thì **không thể** dùng chung một cột `tax_rate_percent` với khấu trừ vận hành — cần **cột mới trên `class_teachers`** (ví dụ `teacher_income_tax_deduction_rate_percent`) hoặc bảng lịch sử riêng. Nếu màn hình thực chất cần **% vận hành theo lớp** (trùng với tên DB legacy), plan dưới đây là đủ.

## Problem Statement

Admin cần trên `/admin/staffs/[id]` (card **Lớp phụ trách**) **nhìn thấy và chỉnh** tỷ lệ % gắn với mối quan hệ **gia sư–lớp** mà hệ thống **đã lưu sẵn** trên `class_teachers`, thay vì thêm một lớp dữ liệu trùng ý nghĩa.

## Solution (điều chỉnh)

- **Không** thêm bảng `class_teacher_tax_deduction_rates` cho mục đích này.
- **Nguồn đọc/ghi:** một dòng `class_teachers` theo `(class_id, teacher_id)` — field **`tax_rate_percent`** / Prisma **`operatingDeductionRatePercent`**.
- **Backend:** mở rộng payload staff detail và/hoặc income summary để mỗi lớp phụ trách kèm **`operatingDeductionRatePercent`** (hoặc tên API thống nhất `tax_rate_percent` snake nếu DTO công khai theo convention hiện có).
- **Ghi:** cập nhật qua luồng đã có (ví dụ cập nhật gia sư lớp) hoặc **`PATCH`** nhỏ gọn theo cặp `(staffId, classId)` chỉ sửa cột này, có kiểm tra tồn tại `class_teachers` và quyền **chỉ admin** nếu product yêu cầu.
- **Frontend:** cột % trên bảng/card + input inline (mobile/desktop), TanStack Query invalidate `staff` detail / income nếu cần; **chỉ admin** được sửa nếu giữ policy như PRD trước.
- **Luồng session:** giữ nguyên cách resolve **vận hành** hiện tại (`resolveOperatingDeductionRate` + fallback `class_teachers.operatingDeductionRatePercent`) — không đổi semantic cột; **không** gán cột này vào `teacher_tax_deduction_rate_percent` (thuế thu nhập).

## User Stories (rút gọn theo hướng mới)

1. As an **admin**, I want to see **`class_teachers.tax_rate_percent`** (operating %) per assigned class on the staff detail “Lớp phụ trách” card, so that relationship-level % is visible next to money columns.
2. As an **admin**, I want to **edit** that % inline (or save row), so that updates persist on **`class_teachers`** without a parallel rates table.
3. As **ops**, I want **new/updated sessions** to keep using the **existing** operating resolution so behavior stays consistent with today’s payroll semantics.

## Implementation Decisions (thay thế bản cũ)

- **Data model:** chỉ `class_teachers`; không tạo bảng tax deduction mới cho tính năng này.
- **API:** mở rộng `GET /staff/:id` (hoặc field trong income summary nếu card chỉ đọc từ đó) để include **`operatingDeductionRatePercent`** trên từng phần tử `classTeachers`; **`PATCH`** tối thiểu hoặc tái dùng endpoint class/teachers hiện có.
- **Auth:** chỉ **User admin** (hoặc theo policy đã chốt) được PATCH % nhạy cảm này.
- **Copy UI:** tránh nhãn “Thuế thu nhập” nếu đang hiển thị đúng **khấu trừ vận hành**; dùng nhãn rõ ràng ví dụ **“KH vận hành (%)”** hoặc **“% theo lớp (class_teachers)”** tùy product.

## Testing Decisions

- Kiểm tra **GET** trả đúng % sau khi cập nhật `class_teachers`.
- Kiểm tra **session create** vẫn snapshot operating đúng khi không có bản ghi `class_teacher_operating_deduction_rates` (fallback cột `class_teachers`).

## Out of Scope

- Đổi nghĩa cột `tax_rate_percent` thành thuế thu nhập mà không đổi tên cột / không thêm cột mới.
- Tự động sửa snapshot `sessions.teacher_tax_deduction_rate_percent` khi đổi % trên `class_teachers`.

## Further Notes

- Nếu sau review product xác nhận cần **thuế thu nhập theo lớp** tách biệt vận hành: lập PRD bổ sung **cột mới** trên `class_teachers` + resolver `resolveTaxDeductionRate` có nhánh theo `classId`, **không** tái dụng `tax_rate_percent`.
