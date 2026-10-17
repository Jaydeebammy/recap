import { describe, expect, it } from "vitest";
import { resolveDueDate } from "./due-dates";

// 16 Oct 2026 is a Friday.
const MEETING = "2026-10-16";

describe("resolveDueDate", () => {
  it.each([
    ["Thursday", "2026-10-22"],
    ["by Thursday", "2026-10-22"],
    ["tomorrow", "2026-10-17"],
    ["end of this week", "2026-10-16"],
    ["by the end of the week", "2026-10-16"],
    ["end of next week", "2026-10-23"],
    ["end of the month", "2026-10-31"],
    ["today", "2026-10-16"],
    ["October 30", "2026-10-30"],
  ])("%s → %s", (text, expected) => {
    expect(resolveDueDate(text, MEETING)).toBe(expected);
  });

  it("returns null when there is no date", () => {
    expect(resolveDueDate("soon", MEETING)).toBeNull();
    expect(resolveDueDate(null, MEETING)).toBeNull();
    expect(resolveDueDate("  ", MEETING)).toBeNull();
  });

  it("treats end of this week as the coming Friday from mid-week", () => {
    expect(resolveDueDate("end of this week", "2026-10-13")).toBe("2026-10-16");
  });
});
