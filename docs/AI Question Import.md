# Nhập câu hỏi từ AI

Cổng nhập câu hỏi hàng loạt cho Ngân hàng câu hỏi của một Khoá học. Người dùng chép một prompt dựng sẵn sang ChatGPT/Claude, dán JSON kết quả vào hệ thống, soát lại từng câu, rồi nhập.

Hai chỗ gọi cùng một component:

- Đội giáo án: trang Ngân hàng câu hỏi của khoá → **Nhập từ AI**.
- Gia sư: panel **Thêm chuyên đề → Tạo riêng cho lớp** → khối câu hỏi → **✨ Nhập từ AI** (mở inline trong panel).

Câu hỏi nhập vào luôn thuộc **ngân hàng của khoá**, kể cả khi gia sư nhập từ một chuyên đề riêng lớp.

## Định dạng JSON

Đầu vào là một **JSON array**. Mỗi phần tử là một câu hỏi.

```json
[
  {
    "type": "single_choice",
    "content": "Đạo hàm của hàm số $y = \\ln(2x+1)$ là:",
    "options": ["$\\frac{1}{2x+1}$", "$\\frac{2}{2x+1}$", "$\\frac{2x}{2x+1}$", "$\\frac{\\ln 2}{2x+1}$"],
    "correctIndex": 1,
    "explanation": "Áp dụng công thức đạo hàm hàm hợp $(\\ln u)' = u'/u$.",
    "difficulty": "Thông hiểu"
  },
  {
    "type": "essay",
    "content": "Chứng minh rằng phương trình $x^5 + x - 1 = 0$ có nghiệm duy nhất.",
    "answerGuide": "Xét tính đơn điệu bằng đạo hàm, kết hợp định lý giá trị trung gian.",
    "difficulty": "Vận dụng cao"
  }
]
```

| Trường | Bắt buộc | Áp dụng cho | Ràng buộc |
|---|---|---|---|
| `type` | có | mọi câu | `"single_choice"` hoặc `"essay"` |
| `content` | có | mọi câu | chuỗi không rỗng |
| `options` | có | chỉ `single_choice` | mảng 2–6 chuỗi, không tự đánh A/B/C/D |
| `correctIndex` | có | chỉ `single_choice` | số nguyên, đếm từ 0, `< options.length` |
| `explanation` | không | `single_choice` | chuỗi |
| `answerGuide` | không | chỉ `essay` | chuỗi, dùng làm barem cho gia sư chấm |
| `difficulty` | có | mọi câu | khớp tuyệt đối một giá trị trong `difficulty_levels` của khoá |

Trường lạ ngoài danh sách trên bị từ chối, không bị bỏ qua im lặng.

Công thức toán viết bằng LaTeX đặt giữa hai dấu `$`, khớp với extension `@tiptap/extension-mathematics` đang dùng ở editor.

## Prompt dựng sẵn

Hệ thống sinh prompt theo khoá đang mở, không hard-code. Các tham số hệ thống tự điền:

- Tên khoá học
- Danh sách `difficulty_levels` của khoá (in nguyên chuỗi để mô hình khớp tuyệt đối)
- Tỉ lệ độ khó mặc định

Hai tham số người dùng chỉnh trên panel: **số câu cần sinh** và **chủ đề / yêu cầu thêm**.

```
Bạn là trợ lý soạn câu hỏi cho khoá {{TÊN KHOÁ}} của Unicorns Edu.

NHIỆM VỤ
Sinh {{SỐ CÂU}} câu hỏi về: {{CHỦ ĐỀ}}.

ĐỊNH DẠNG ĐẦU RA — BẮT BUỘC
Chỉ in ra một JSON array. Không markdown, không rào ```json,
không lời dẫn, không giải thích nào ngoài JSON.

Mỗi phần tử là một object:
{
  "type": "single_choice" | "essay",
  "content": "Nội dung câu hỏi",
  "options": ["...", "...", "...", "..."],
  "correctIndex": 0,
  "explanation": "Lời giải ngắn gọn",
  "answerGuide": "Barem/ý chính cần có",
  "difficulty": "Nhận biết"
}

QUY TẮC TỪNG TRƯỜNG
- type          bắt buộc. Chỉ nhận "single_choice" hoặc "essay".
- content       bắt buộc, không được rỗng.
- options       CHỈ có ở single_choice. Từ 2 đến 6 phương án.
                Không tự đánh A/B/C/D hay 1./2. ở đầu phương án.
- correctIndex  CHỈ có ở single_choice. Số nguyên đếm từ 0,
                phải nhỏ hơn số phần tử của options.
- explanation   tuỳ chọn, dùng cho single_choice.
- answerGuide   CHỈ có ở essay. Ý chính để gia sư chấm.
- difficulty    bắt buộc. Phải trùng KHỚP TUYỆT ĐỐI một trong:
                {{DANH SÁCH ĐỘ KHÓ}}
Không thêm bất kỳ trường nào khác.

CÔNG THỨC TOÁN
- Viết LaTeX đặt giữa hai dấu $, ví dụ: $y = x^3 - 3x + 2$.
- Trong chuỗi JSON, gạch chéo ngược phải nhân đôi:
  đúng   "$\\frac{1}{2}$"
  sai    "$\frac{1}{2}$"

TỈ LỆ ĐỘ KHÓ
{{TỈ LỆ ĐỘ KHÓ}}

TỰ KIỂM TRA TRƯỚC KHI TRẢ LỜI
1. Kết quả parse được bằng JSON.parse.
2. Mọi single_choice đều có options hợp lệ và correctIndex trong khoảng.
3. Mọi essay đều KHÔNG có options và KHÔNG có correctIndex.
4. Mọi difficulty đều nằm trong danh sách đã cho.
5. Ký tự đầu tiên là [ và ký tự cuối cùng là ]
```

Ba dòng ràng buộc dễ bị coi là thừa nhưng đều xử lý một lỗi có thật:

- **Cấm rào ` ```json `** — không dặn thì mô hình gần như luôn bọc markdown và `JSON.parse` hỏng ngay.
- **Dặn nhân đôi gạch chéo ngược** — lỗi phổ biến nhất khi nội dung có LaTeX.
- **Liệt kê nguyên chuỗi độ khó** — mô hình hay tự chế `"Khó"`, `"cực khó"`, trong khi validate khớp tuyệt đối với `difficulty_levels` của khoá.

## Luồng nhập

1. **Lấy prompt** — panel prompt, nhập số câu và chủ đề, bấm Sao chép.
2. **Dán JSON** — validate ngay tại client, hiện số câu hợp lệ và lỗi từng câu kèm tên trường sai.
3. **Soát từng câu** — bắt buộc, không bỏ qua được. Sửa nội dung, đổi độ khó, chọn chuyên đề gắn vào.
4. **Nhập** — một request duy nhất tạo toàn bộ câu hợp lệ.

Câu lỗi **không nhập được**. Người dùng sửa JSON rồi dán lại, hoặc bỏ những câu đó.

Không có bảng draft: toàn bộ bước soát diễn ra ở client, chỉ một lần ghi khi bấm Nhập.

## Quyền

- Đội giáo án được gán vào khoá (`course_editors`) và `lesson_plan_head`: nhập vào mọi khoá mình có quyền.
- Gia sư: nhập vào ngân hàng của khoá mà lớp mình đang dạy thuộc về.
