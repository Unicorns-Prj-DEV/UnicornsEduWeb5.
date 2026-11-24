import { describe, expect, it } from "vitest";
import { questionFormToPayload } from "@/components/admin/question/question-form-payload";
import { emptyQuestionFormValue } from "@/components/admin/question/QuestionFormFields";
import { QuestionTypeDto } from "@/dtos/question.dto";

const essay = (essayMaxChars: string) => ({
  ...emptyQuestionFormValue,
  moduleId: "m1",
  difficultyLevelId: "d1",
  type: QuestionTypeDto.essay,
  content: "<p>自己紹介を書いてください。</p>",
  essayMaxChars,
});

describe("questionFormToPayload — giới hạn ký tự tự luận", () => {
  it("JP: gửi giới hạn và xoá kiểu ô cũ", () => {
    const result = questionFormToPayload(essay(" 200 "), { essayMaxChars: true });
    expect(result).toMatchObject({
      payload: { essayMaxChars: 200, essayInputSize: null },
    });
  });

  it("JP: để trống = không giới hạn (null, để sửa câu xoá được giới hạn)", () => {
    const result = questionFormToPayload(essay(""), { essayMaxChars: true });
    expect(result).toMatchObject({ payload: { essayMaxChars: null } });
  });

  it.each(["0", "5001", "1.5", "abc"])("JP: từ chối %s", (raw) => {
    expect(questionFormToPayload(essay(raw), { essayMaxChars: true })).toEqual({
      error: "Giới hạn ký tự phải là số nguyên 1–5000, hoặc để trống",
    });
  });

  it("hồ sơ khác: không gửi trường giới hạn", () => {
    const result = questionFormToPayload(essay("200"));
    expect("payload" in result && "essayMaxChars" in result.payload).toBe(false);
  });
});
