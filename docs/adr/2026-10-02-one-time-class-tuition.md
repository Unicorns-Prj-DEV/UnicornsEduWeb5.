# ADR: Lớp bán một lần ghi nhận doanh thu ở buổi đầu, không hoàn ví

- **Status:** Accepted
- **Date:** 2026-10-02

## Context

Khoá `THPTQG` và `PREVOI` bán một lần, nhưng lớp đang tính `per_session`. Học phí trên điểm danh bị rải theo từng buổi, nên lợi nhuận dashboard cũng rải theo ngày buổi. Trên data vận hành, tổng học phí điểm danh không khớp từng giao dịch ví, và một phần trợ cấp trợ lí 3% đã `paid`/`pending` được tính từ học phí từng buổi.

## Decision

Thêm `ClassPricingMode.one_time`. Lớp của hai khoá này dùng chế độ đó. Với mỗi học sinh, toàn bộ học phí `present`/`excused` dồn vào buổi sớm nhất; các buổi sau và các dòng `absent` về 0. Số dư ví và giao dịch ví giữ nguyên. Trợ cấp gia sư từng buổi giữ nguyên. Dòng hoa hồng đã `paid` hoặc `pending` lưu học phí cũ ở `payroll_basis_tuition_fee` để số đã chốt không đổi khi doanh thu dồn đi. Buổi mới của học sinh đã có buổi tính phí thì học phí bằng 0. Học sinh chưa từng tính phí bị trừ tổng gói ở buổi đầu.

## Considered options

- **Hoàn ví về tổng gói đang lưu:** bị loại vì gói THPTQG đang là 300.000đ / 1 buổi, trùng học phí mỗi buổi, trong khi điểm danh đã ghi 18.300.000đ. Hoàn theo gói sẽ xoá doanh thu.
- **Chỉ bật cờ cho buổi tương lai:** bị loại vì lợi nhuận các kỳ đã qua vẫn rải theo buổi.
- **Dồn cả trợ cấp gia sư về buổi đầu:** bị loại vì gia sư đã dạy và đã được trả theo từng buổi.

## Consequences

- Lợi nhuận theo kỳ đổi ngày ghi nhận, không đổi tổng học phí `present`/`excused`.
- Sổ ví vẫn kể lại các lần trừ cũ. Đối soát ví với học phí buổi đầu sẽ lệch ở data lịch sử.
- Tắt `one_time` trên UI không tính lại học phí, để tránh đụng ví.
