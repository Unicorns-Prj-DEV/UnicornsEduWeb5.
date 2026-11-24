# Hướng dẫn sử dụng LMS — hồ sơ tiếng Nhật (JP)

Tài liệu cho buổi họp: cách **soạn** từng loại câu hỏi, gom câu thành **Bộ câu hỏi** (bài đọc / bài nghe), dựng **tiết thực hành**, **giao cho lớp**, cách **học sinh làm bài** và cách **gia sư chấm**.

> Áp dụng cho instance chạy `LMS_PROFILE=jp`. Đã test lại đầu-cuối trên trình duyệt ngày 20/11/2026 (xem mục 9).

---

## 1. Tổng quan luồng

```
Khoá học ─┬─ Tab "Câu hỏi"  → soạn câu lẻ + Bộ câu hỏi (ngân hàng của khoá)
          └─ Tab "Nội dung" → Chuyên đề → Tiết thực hành → chọn câu từ ngân hàng, đặt trọng số
Lớp học  ── Tab "Chuyên đề"  → Thêm tiết vào lớp (= giao bài)
Học sinh ── Lớp → tiết thực hành → Bắt đầu làm bài → Nộp → xem điểm
Gia sư   ── Lớp → tiết thực hành → Chấm bài (câu tự luận) → học sinh thấy điểm + nhận xét
```

Mọi câu hỏi thuộc **một khoá**, gắn **một chuyên đề** và **một độ khó** (vd N5, N4…), và có **ít nhất một kỹ năng**.

---

## 2. Năm loại câu hỏi JP

| Loại | Học sinh làm gì | Chấm | Ghi chú khi soạn |
|---|---|---|---|
| **Trắc nghiệm** | Chọn 1 trong 2–6 phương án | Tự động | Đánh dấu phương án đúng |
| **Đúng/Sai** | Chọn 1 trong 2 nhãn | Tự động | Chọn kiểu nhãn: `○ / ×` (mặc định), `Đúng / Sai`, `True / False` |
| **Điền vào ô trống** | Gõ chữ vào từng ô 【1】【2】… | Tự động, **từng ô** (đúng 1/2 ô → được nửa điểm câu) | Mỗi ô có thể có **nhiều đáp án hợp lệ** (vd `で` / `では`) |
| **Sắp xếp** | Chạm thẻ để xếp theo thứ tự (kéo để đổi chỗ) | Tự động, đúng cả câu mới có điểm | 2–12 thẻ, nhập **đúng thứ tự** — hệ thống tự xáo khi giao |
| **Tự luận** | Gõ câu trả lời (có bộ đếm nếu gia sư đặt giới hạn ký tự) | **Gia sư chấm tay** | Tuỳ chọn **Giới hạn ký tự**; có ô **Hướng dẫn / barem** cho người chấm |

**Kỹ năng** (bắt buộc chọn ≥ 1): Kanji · Từ vựng · Ngữ pháp · Đọc hiểu · Nghe hiểu · Hội thoại · Viết câu. Dùng để lọc ngân hàng câu.

---

## 3. Soạn câu lẻ

**Khoá học → tab "Câu hỏi" → `+ Thêm câu hỏi`**

1. Chọn **Chuyên đề\***, **Độ khó\***, **Loại câu**, **Kỹ năng**.
2. Nhập **nội dung** (editor hỗ trợ đậm/nghiêng, danh sách, công thức, bảng, **ảnh** — dán hoặc kéo-thả ảnh đều được).
3. Phần riêng theo loại:
   - **Trắc nghiệm:** nhập phương án, tick phương án đúng.
   - **Đúng/Sai:** nội dung là *một nhận định*; chọn đáp án và **kiểu nhãn**.
   - **Điền vào ô trống:** đặt con trỏ tại chỗ cần trống → bấm **Chèn ô trống** (hoặc gõ `[[___]]`). Ô được chèn **đúng tại con trỏ**; chèn ô vào giữa thì đáp án các ô sau **tự dời theo**, không phải nhập lại. Mỗi ô xuất hiện một khung đáp án; bấm **+ Thêm đáp án hợp lệ** để thêm cách viết khác. So khớp bỏ khoảng trắng đầu/cuối.
   - **Sắp xếp:** nhập từng thẻ theo **đúng thứ tự** (vd `わたしは` / `バスで` / `がっこうへ` / `いきます`).
   - **Tự luận:** (tuỳ chọn) nhập **Giới hạn ký tự** (1–5000; để trống = không giới hạn) — học sinh không gõ quá số này; nhập hướng dẫn chấm.
4. (Tuỳ chọn) **Giải thích** — học sinh thấy sau khi nộp.
5. Bấm **Lưu**. Thiếu trường nào, toast báo đúng trường đó ("Chọn chuyên đề", "Chọn độ khó", "Nhập nội dung câu hỏi", "Ô 2 cần ít nhất một đáp án"…).

> Cách nhanh: **Nhập từ AI** — dán JSON câu hỏi do AI sinh theo prompt dựng sẵn (xem `docs/AI Question Import.md`).

---

## 4. Bộ câu hỏi (bài đọc / bài nghe dùng chung)

Dùng khi nhiều câu cùng dựa trên **một đoạn văn, ảnh hoặc file nghe**.

**Tab "Câu hỏi" → `+ Thêm bộ câu hỏi`**

1. **Tên bộ** (chỉ người soạn thấy), **Chuyên đề**.
2. **Phần đầu bộ**: đoạn văn / ảnh. Cần ít nhất một trong: văn bản, ảnh, audio.
3. **Audio của bộ** (bài nghe): tải file `mp3 / m4a / aac / wav`, tối đa 20 MB.
   - **Số lần nghe khi làm bài:** Không giới hạn / 1 lần / 2 lần.
   - **Cho tua khi làm bài:** bật/tắt.
   - Khi **xem lại sau nộp** và **ôn nhẹ**, học sinh luôn nghe tự do.
4. Bấm **Tạo bộ** → form ở lại để thêm câu:
   - **Thêm câu**: soạn câu mới ngay trong bộ (câu tự nhận chuyên đề của bộ).
   - **Chuyển câu có sẵn**: **chuyển** một câu lẻ trong ngân hàng vào bộ (câu rời khỏi danh sách câu lẻ).
5. **Vị trí trống trong đoạn văn** (kiểu đề JLPT “（ 27 ）”): đặt con trỏ trong **Phần đầu bộ** tại chỗ trống → chọn câu → **Chèn vị trí trống** → dấu `[[#…]]` vào đúng chỗ con trỏ. Học sinh thấy số thứ tự câu, vd **（2）**.
6. Bấm **Lưu**.

> Sửa bộ khi bộ đã nằm trong tiết đang giao: bài **đã bắt đầu** giữ nội dung cũ; lượt làm mới nhận nội dung mới.

---

## 5. Tiết thực hành (đề kiểm tra)

**Khoá học → tab "Nội dung" → chuyên đề → Thêm tiết học → Tiết thực hành**

1. Đặt tên, **thời lượng** (phút).
2. Trong tiết: **Thêm câu hỏi từ ngân hàng** → lọc theo độ khó / loại / kỹ năng → thêm từng câu lẻ hoặc **Thêm bộ** (cả bộ vào cùng lúc).
3. Sắp xếp thứ tự câu (mũi tên lên/xuống; bộ di chuyển cả khối).
4. **Trọng số**: bấm nút **Trọng số 1** cạnh câu → gõ số → Enter. Mặc định = 1.
   - Điểm luôn quy về **thang 100**, chia theo trọng số; phần lẻ chia theo phương pháp **Hamilton** (tổng luôn đúng 100).
   - Ví dụ đã test — 6 câu trọng số `1, 3, 1, 2, 1, 1` (tổng 9) → điểm câu `11, 34, 11, 22, 11, 11` = 100.
5. Chế độ xem **Đầy đủ / Gọn** để soát đề; xem trước hiển thị giới hạn nghe (“nghe tối đa 2 lần · không tua được”).

> Sửa câu trong tiết là sửa **bản gốc trong ngân hàng** (mọi đề dùng câu đó đổi theo). Bài đã nộp giữ nguyên snapshot cũ.

---

## 6. Giao cho lớp

**Lớp học → tab "Chuyên đề" → Thêm tiết vào lớp** → chọn chuyên đề / tiết thực hành.

- Thêm tiết thực hành = tạo **lần giao**; đồng hồ của mỗi học sinh chạy riêng từ lúc bấm bắt đầu.
- Điểm tính theo **lượt đã chấm gần nhất** — học sinh làm lại thì điểm mới thay điểm cũ.

---

## 7. Học sinh làm bài

**Lớp → mục lục chuyên đề → tiết thực hành → Bắt đầu làm bài** (lần sau: **Làm lại**).

- **Thứ tự câu và phương án được xáo** theo từng lượt; thẻ sắp xếp cũng xáo.
- Thanh bên: **đồng hồ đếm ngược** + lưới câu với 3 trạng thái **Chưa làm / Đã làm / Quay lại**. Nút 🔖 trên mỗi câu để **đánh dấu quay lại**. Trên điện thoại, đồng hồ + lưới câu dính đầu màn hình; lưới là **một hàng vuốt ngang** để chừa chỗ đọc đề. Câu sắp xếp chỉ tính "Đã làm" khi dùng hết thẻ; câu điền ô khi mọi ô có chữ.
- **Tự động lưu** ("Đã lưu lúc hh:mm") — tải lại trang không mất bài.
- Cách trả lời từng loại:
  - Trắc nghiệm / Đúng-Sai: bấm chọn.
  - Điền ô trống: gõ vào từng ô 【n】.
  - Sắp xếp: **chạm thẻ** để đưa lên dòng trả lời, **chạm lại** để gỡ, **kéo** để đổi chỗ, **Xếp lại** để làm lại từ đầu.
  - Tự luận: gõ vào ô. Câu có giới hạn ký tự hiện bộ đếm `n/N ký tự` dưới ô, gõ tới N thì ô không nhận thêm (dán đoạn dài bị cắt ở N).
- **Bài nghe**: nút ▶ + dòng “Còn 2/2 lượt nghe · không tua được”. Mỗi lần bấm nghe trừ 1 lượt (tính ở server, tải lại trang không hồi lượt). Hết lượt → “Đã hết lượt nghe”, nút khoá. Mỗi **lượt làm bài mới** có lại đủ số lần nghe.
- **Nộp bài** → màn **Xem lại trước khi nộp** (số câu đã làm / chưa làm / quay lại) → **Xác nhận nộp bài**.
- Sau nộp: điểm ngay phần tự động (“Trắc nghiệm: 78 · Tự luận: đang chờ chấm”), từng câu hiện điểm, đáp án đúng, thứ tự đúng (câu sắp xếp), đáp án hợp lệ từng ô, giải thích.

---

## 8. Gia sư chấm tự luận

**Lớp → tiết thực hành** → trang kết quả (Đã nộp, Điểm trung bình, **Chờ chấm**, tỉ lệ đúng theo câu, **Xuất CSV**).

1. Lọc **Chờ chấm** → bấm học sinh → tab **Chấm điểm**.
2. Mỗi câu tự luận: xem câu trả lời + **Hướng dẫn**, nhập **Điểm / tối đa** (nút nhanh **0** / **Tối đa**), **Nhận xét cho học sinh** → **Lưu điểm**.
3. Chấm xong câu cuối → toast “Đã chấm hết bài chờ chấm.” và quay về danh sách.
4. Học sinh tải lại trang thấy tổng điểm mới + **Nhận xét của gia sư** dưới câu.

---

## 9. Kết quả kiểm thử đầu-cuối (20/11/2026)

Tiết “QA Kiểm tra N5”, 6 câu (1 câu mỗi loại + 1 câu nghe trong bộ có audio, giới hạn 2 lần, không tua).

| Kịch bản | Kết quả |
|---|---|
| Lượt 1 — trả lời đúng hết, ô 2 dùng đáp án phụ `では`, ô 1 có khoảng trắng thừa | Tự động **78/100**; chấm tự luận 18/22 → **96/100**, học sinh thấy nhận xét |
| Lượt 2 — sắp xếp sai, Đúng/Sai sai, ô trống đúng 1/2, bỏ trống tự luận + 1 câu | **40/100** (ô trống được 6/11 — chấm từng ô) |
| Nghe 2 lần → hết lượt, tải lại trang | Vẫn “Đã hết lượt nghe” (đếm ở server) |
| Tải lại giữa bài | Mọi câu trả lời + đánh dấu quay lại còn nguyên |

### Lỗi đã phát hiện và sửa trong đợt rà soát

1. **Thêm câu trong Bộ câu hỏi không lưu, dialog bộ tự đóng** (lỗi nghiêm trọng) — form câu lồng trong form bộ, bấm Lưu câu kích hoạt lưu bộ. Đã tách form.
2. Thêm đáp án hợp lệ cho ô trống: con trỏ tự vào ô mới.
3. Thông báo lỗi form soạn câu báo đúng trường thiếu; nhãn Chuyên đề / Độ khó có dấu `*`.
4. Ô trọng số tự focus khi bấm.
5. Dialog chọn câu cho tiết: ô trống hiện 【1】 thay `[[___]]`; câu sắp xếp ghi “n thẻ”.
6. Ẩn nút khối code Python / C++ trên toolbar editor ở hồ sơ JP (chỉ còn ở IT).
7. **Chèn ô trống** / **Chèn vị trí trống** trước đây luôn nối vào cuối nội dung → giờ chèn tại con trỏ; con trỏ lọt giữa dấu `[[…]]` cũ được dời ra sau dấu để không hỏng dấu.
8. Chèn ô trống vào giữa làm lệch đáp án các ô sau → giờ đáp án tự dời theo ô.
9. Trang làm bài trên điện thoại: lưới câu nhiều hàng chiếm gần nửa màn hình (đề 40 câu) → một hàng vuốt ngang (~86px).
10. Nút **Câu có sẵn** đổi nhãn thành **Chuyển câu có sẵn**.

Đã kiểm tra thêm ở màn 375px: dialog soạn câu, trang làm bài (trắc nghiệm, Đúng/Sai, ô trống, sắp xếp chạm thẻ, tự luận, audio) — không tràn ngang, trả lời dở vẫn còn sau khi tải lại.

### Ghi nhận (chưa đổi, cần quyết định)

- Câu **tự luận bỏ trống** vẫn vào hàng **chờ chấm** (giống hồ sơ IT) — có thể cân nhắc tự chấm 0 (đổi ngữ nghĩa chấm, ảnh hưởng cả IT).
- Câu lẻ chưa gắn audio riêng; câu nghe phải nằm trong **Bộ câu hỏi** có audio.
