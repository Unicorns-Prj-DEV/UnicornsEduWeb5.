import { describe, expect, it } from "vitest";
import { renderLatexPreview } from "@/lib/math-render";

describe("renderLatexPreview", () => {
  it("returns null for blank input", () => {
    expect(renderLatexPreview("   ", false)).toBeNull();
  });

  it("renders valid latex to KaTeX html", () => {
    const result = renderLatexPreview("\\frac{a}{b}", true);
    expect(result?.ok).toBe(true);
    expect(result?.ok && result.html).toContain("katex-display");
  });

  it("reports parse errors without the KaTeX prefix", () => {
    const result = renderLatexPreview("\\frac{a}{", false);
    expect(result?.ok).toBe(false);
    expect(result?.ok === false && result.message).not.toMatch(/^KaTeX parse error/);
  });
});
