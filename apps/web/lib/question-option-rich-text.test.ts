// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  optionsAsPlainText,
  questionFormToPayload,
} from "@/components/admin/question/question-form-payload";
import { emptyQuestionFormValue } from "@/components/admin/question/QuestionFormFields";
import { QuestionTypeDto } from "@/dtos/question.dto";

const singleChoice = (options: string[]) => ({
  ...emptyQuestionFormValue,
  moduleId: "m1",
  difficultyLevelId: "d1",
  type: QuestionTypeDto.single_choice,
  content: "<p>Chọn đáp án đúng.</p>",
  options,
  correctIndex: 0,
});

describe("phương án trắc nghiệm rich text", () => {
  it("giữ định dạng đậm / nghiêng / gạch chân / màu của phương án", () => {
    const rich = [
      "<p><strong>A</strong> <em>nghiêng</em></p>",
      '<p><u>gạch</u> <span data-text-color="red">đỏ</span></p>',
    ];
    expect(questionFormToPayload(singleChoice(rich))).toMatchObject({
      payload: { options: rich, correctIndex: 0 },
    });
  });

  it("ô rich text rỗng (<p></p>) bị chặn như ô trống", () => {
    expect(questionFormToPayload(singleChoice(["<p>A</p>", "<p></p>"]))).toEqual({
      error: "Phương án không được để trống",
    });
  });

  it("phương án chỉ có công thức / ảnh vẫn hợp lệ", () => {
    const result = questionFormToPayload(
      singleChoice([
        '<p><span data-latex="x^2"></span></p>',
        '<p><img src="https://x.test/a.png"></p>',
      ]),
    );
    expect("payload" in result).toBe(true);
  });

  it("phương án cũ chữ thuần vẫn lưu được", () => {
    expect(questionFormToPayload(singleChoice(["A1", "B1"]))).toMatchObject({
      payload: { options: ["A1", "B1"] },
    });
  });
});

describe("optionsAsPlainText — đổi sang Câu sắp xếp", () => {
  it("bỏ thẻ HTML, giữ chữ", () => {
    expect(
      optionsAsPlainText([
        "<p><strong>私は</strong>&nbsp;</p>",
        '<p><span data-text-color="red">学生</span>です</p>',
      ]),
    ).toEqual(["私は", "学生です"]);
  });

  it("thẻ chữ thuần giữ nguyên, kể cả khoảng trắng", () => {
    expect(optionsAsPlainText(["の ", "a < b"])).toEqual(["の ", "a < b"]);
  });
});
