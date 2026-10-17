import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTranscript } from "./parse-transcript";
import { speakersOf } from "./format";

const tactiq = readFileSync(new URL("../test/fixtures/tactiq-demo.txt", import.meta.url), "utf8");

describe("parseTranscript", () => {
  it("parses a Tactiq export and ignores the header", () => {
    const turns = parseTranscript(tactiq);
    expect(turns[0]).toMatchObject({ speaker: "Ben", startMs: 0 });
    expect(turns[0].text).toMatch(/^Welcome, everyone!/);
    expect(speakersOf(turns)).toEqual(["Ben", "Chris", "Sasha", "Amelia"]);
    expect(turns.every((t) => t.text.length > 0)).toBe(true);
  });

  it("joins lines that were wrapped by the PDF", () => {
    const turns = parseTranscript(tactiq);
    expect(turns[0].text).toContain("Tactiq can transform your meetings");
    const sasha = turns.find((t) => t.speaker === "Sasha" && t.startMs === 70_000);
    expect(sasha?.text).toContain("I’ve drafted a rough timeline, but it needs some updates.");
  });

  it("drops the trailing 'View original transcript' footer", () => {
    const turns = parseTranscript(tactiq);
    expect(turns.at(-1)?.text).not.toMatch(/View original transcript/);
  });

  it("fills end times from the next turn", () => {
    const turns = parseTranscript(tactiq);
    expect(turns[0].endMs).toBe(turns[1].startMs);
  });

  it("handles [mm:ss] Name: text", () => {
    const turns = parseTranscript("[00:05] Ada: Hello\n[01:02:03] Tunde: Hi there\ncontinued");
    expect(turns).toEqual([
      { speaker: "Ada", startMs: 5_000, endMs: 3_723_000, text: "Hello" },
      { speaker: "Tunde", startMs: 3_723_000, text: "Hi there continued" },
    ]);
  });

  it("handles Name (mm:ss): text", () => {
    const turns = parseTranscript("Ada (00:05): Hello\nTunde (00:09): Hi");
    expect(turns.map((t) => [t.speaker, t.startMs])).toEqual([["Ada", 5_000], ["Tunde", 9_000]]);
  });

  it("handles untimed Name: text", () => {
    const turns = parseTranscript("Ada: Hello\nTunde: Hi\nAda: Bye");
    expect(turns.map((t) => t.speaker)).toEqual(["Ada", "Tunde", "Ada"]);
  });

  it("does not treat 'Note:' inside timed text as a new speaker", () => {
    const turns = parseTranscript("00:01 Ada : Plan below\nNote: ship Friday\n00:09 Tunde : ok");
    expect(turns).toHaveLength(2);
    expect(turns[0].text).toBe("Plan below Note: ship Friday");
  });

  it("returns nothing for text with no turns", () => {
    expect(parseTranscript("just some notes\nwith no speakers")).toEqual([]);
  });
});
