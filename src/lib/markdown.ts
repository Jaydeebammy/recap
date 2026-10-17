import { msToClock } from "./format";
import type { MeetingNotes } from "./types";

export function formatDue(dueDate: string | null, dueText: string | null): string {
  if (dueDate) {
    const [y, m, d] = dueDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }
  return dueText ?? "No date";
}

export function notesToMarkdown(input: { title: string; meetingDate: string; notes: MeetingNotes }): string {
  const { title, meetingDate, notes } = input;
  const lines = [`# ${title || "Meeting notes"}`, "", `_${meetingDate}_`, "", "## Summary", "", notes.summary, ""];
  if (notes.decisions.length) {
    lines.push("## Decisions", "", ...notes.decisions.map((d) => `- ${d}`), "");
  }
  if (notes.actionItems.length) {
    lines.push(
      "## Action items",
      "",
      ...notes.actionItems.map(
        (a) => `- [ ] ${a.task} — ${formatDue(a.dueDate, a.dueText)} (at ${msToClock(a.quoteMs)})`,
      ),
      "",
    );
  }
  return lines.join("\n");
}
