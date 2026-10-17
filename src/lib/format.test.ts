import { describe, expect, it } from "vitest";
import { applySpeakerNames, clockToMs, msToClock, transcriptForPrompt } from "./format";

describe("clock helpers", () => {
  it("formats and parses round-trip", () => {
    expect(msToClock(65_000)).toBe("01:05");
    expect(msToClock(3_725_000)).toBe("1:02:05");
    expect(clockToMs("01:05")).toBe(65_000);
    expect(clockToMs("1:02:05")).toBe(3_725_000);
    expect(clockToMs("75:10")).toBe(4_510_000);
  });
  it("rejects bad clocks", () => {
    expect(clockToMs("1:99")).toBeNull();
    expect(clockToMs("abc")).toBeNull();
    expect(clockToMs("1")).toBeNull();
  });
});

describe("applySpeakerNames", () => {
  it("renames labels and keeps unnamed ones", () => {
    const out = applySpeakerNames(
      [{ speaker: "Speaker A", startMs: 0, text: "hi" }, { speaker: "Speaker B", startMs: 1, text: "yo" }],
      { "Speaker A": " Ben ", "Speaker B": "  " },
    );
    expect(out.map((u) => u.speaker)).toEqual(["Ben", "Speaker B"]);
  });
});

describe("transcriptForPrompt", () => {
  it("renders Name [mm:ss]: text and collapses whitespace", () => {
    expect(transcriptForPrompt([{ speaker: "Ben", startMs: 61_000, text: "a\n  b" }])).toBe("Ben [01:01]: a b");
  });
});
