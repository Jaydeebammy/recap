import { describe, expect, it } from "vitest";
import { formatDue, notesToMarkdown } from "./markdown";

describe("notesToMarkdown", () => {
  it("renders summary, decisions and checkbox action items", () => {
    const md = notesToMarkdown({
      title: "Launch sync",
      meetingDate: "2026-10-16",
      notes: {
        summary: "On track.",
        decisions: ["Launch in three weeks"],
        actionItems: [{ task: "Finish testing", why: "", dueText: "Thursday", dueDate: "2026-10-22", quoteMs: 132_000 }],
      },
    });
    expect(md).toContain("# Launch sync");
    expect(md).toContain("- Launch in three weeks");
    expect(md).toContain("- [ ] Finish testing — Thu 22 Oct (at 02:12)");
  });

  it("skips empty sections", () => {
    const md = notesToMarkdown({ title: "", meetingDate: "2026-10-16", notes: { summary: "x", decisions: [], actionItems: [] } });
    expect(md).not.toContain("## Decisions");
    expect(md).not.toContain("## Action items");
  });
});

describe("formatDue", () => {
  it("falls back to the spoken text, then 'No date'", () => {
    expect(formatDue(null, "soon")).toBe("soon");
    expect(formatDue(null, null)).toBe("No date");
  });
});
