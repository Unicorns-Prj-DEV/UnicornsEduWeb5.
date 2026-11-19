import { describe, expect, it } from "vitest";
import { insertBlankAnswerSlot, offsetPastMarker } from "./fill-blank";

describe("insertBlankAnswerSlot", () => {
  it("chèn giữa: ô sau dời theo, ô mới trống", () => {
    expect(insertBlankAnswerSlot([["a"], ["b"]], 2, 1)).toEqual([
      ["a"],
      [""],
      ["b"],
    ]);
  });

  it("chèn đầu và cuối", () => {
    expect(insertBlankAnswerSlot([["a"]], 1, 0)).toEqual([[""], ["a"]]);
    expect(insertBlankAnswerSlot([["a"]], 1, 1)).toEqual([["a"], [""]]);
  });

  it("đáp án chưa đủ ô thì bù trước khi chèn", () => {
    expect(insertBlankAnswerSlot([], 2, 1)).toEqual([[""], [""], [""]]);
  });

  it("vị trí ngoài khoảng bị kẹp", () => {
    expect(insertBlankAnswerSlot([["a"]], 1, 9)).toEqual([["a"], [""]]);
    expect(insertBlankAnswerSlot([["a"]], 1, -1)).toEqual([[""], ["a"]]);
  });

  it("không đổi mảng gốc", () => {
    const key = [["a"], ["b"]];
    insertBlankAnswerSlot(key, 2, 0);
    expect(key).toEqual([["a"], ["b"]]);
  });
});

describe("offsetPastMarker", () => {
  const text = "ab[[#x]]cd"; // dấu ở 2..8

  it("ngoài dấu giữ nguyên", () => {
    for (const o of [0, 1, 2, 8, 9, 10]) expect(offsetPastMarker(text, o)).toBe(o);
  });

  it("trong dấu dời ra sau dấu", () => {
    for (const o of [3, 4, 5, 6, 7]) expect(offsetPastMarker(text, o)).toBe(8);
  });

  it("dấu chưa đóng không đụng tới", () => {
    expect(offsetPastMarker("a[[b", 3)).toBe(3);
  });

  it("dấu trước đã đóng không ảnh hưởng", () => {
    expect(offsetPastMarker("[[___]] x [[___]]", 9)).toBe(9);
  });
});
