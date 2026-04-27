import { expect, test, describe } from "bun:test";
import { makeDiffConcise } from "../src/shared/diff-utils";

describe("makeDiffConcise", () => {
  test("should keep changes (+ and - lines)", () => {
    const input = "  1 line\n+2 line\n-3 line\n  4 line";
    const output = makeDiffConcise(input);
    expect(output).toContain("+2 line");
    expect(output).toContain("-3 line");
  });

  test("should keep context lines immediately adjacent to changes", () => {
    const input = "  1 context\n+2 change\n  3 context\n  4 irrelevant\n  5 irrelevant\n+6 change";
    const output = makeDiffConcise(input);
    
    expect(output).toContain("  1 context"); // adjacent to +2
    expect(output).toContain("  3 context"); // adjacent to +2
    expect(output).not.toContain("  4 irrelevant");
    // Line 5 is adjacent to +6, so it should be kept.
    expect(output).toContain("  5 irrelevant");
  });

  test("should replace blocks of irrelevant context with ellipses", () => {
    const input = "  1 change context\n+2 change\n  3 context\n  4 irrelevant\n  5 irrelevant\n  6 irrelevant\n  7 context\n+8 change";
    const output = makeDiffConcise(input);
    
    expect(output).toContain("  ...");
    const lines = output.split("\n");
    const ellipsisCount = lines.filter(l => l.trim() === "...").length;
    expect(ellipsisCount).toBe(1);
  });

  test("should handle empty or null input", () => {
    expect(makeDiffConcise("")).toBe("");
    // @ts-ignore
    expect(makeDiffConcise(null)).toBe(null);
  });

  test("should handle multiple blocks of irrelevant context", () => {
    const input = "  c1\n+ch1\n  c2\n  irr1\n  irr2\n  c3\n+ch2\n  c4\n  irr3\n  irr4\n  c5\n+ch3";
    const output = makeDiffConcise(input);
    const lines = output.split("\n");
    const ellipsisCount = lines.filter(l => l.trim() === "...").length;
    expect(ellipsisCount).toBe(2);
    expect(output).toContain("  ...");
  });

  test("should handle diff starting with change", () => {
    const input = "+start change\n  context\n  irrelevant\n  irrelevant";
    const output = makeDiffConcise(input);
    expect(output).toContain("+start change");
    expect(output).toContain("  context");
    expect(output).not.toContain("  irrelevant");
    expect(output).toContain("  ...");
  });

  test("should handle diff ending with change", () => {
    const input = "  irrelevant\n  irrelevant\n  context\n+end change";
    const output = makeDiffConcise(input);
    expect(output).toContain("+end change");
    expect(output).toContain("  context");
    expect(output).not.toContain("  irrelevant");
    expect(output).toContain("  ...");
  });

  test("should handle diff with only changes", () => {
    const input = "+line 1\n-line 2\n+line 3";
    const output = makeDiffConcise(input);
    expect(output).toBe(input);
  });

  test("should handle diff with only context (no changes)", () => {
    const input = "  line 1\n  line 2\n  line 3\n  line 4";
    const output = makeDiffConcise(input);
    // It should keep none if no change is present, but current implementation 
    // depends on prev/next lines being changes.
    // Let's see what happens.
    // Line 1: prev=undefined, next="  line 2" -> not kept
    // Line 2: prev="  line 1", next="  line 3" -> not kept
    // etc.
    // It might return just "  ..." once.
    expect(output.trim()).toBe("...");
  });
});
