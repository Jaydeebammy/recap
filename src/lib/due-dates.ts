import * as chrono from "chrono-node";

/** "2026-10-16" → a Date at local noon, so timezone shifts can't move the day. */
export function meetingDay(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Friday of the week containing `d` (or of the following week if offset = 1). */
function fridayOf(d: Date, weekOffset = 0): Date {
  const day = d.getDay(); // 0 Sun … 6 Sat
  const toFriday = (5 - day + 7) % 7;
  // On Saturday "end of this week" has passed; use the coming Friday.
  return addDays(d, toFriday + weekOffset * 7);
}

/**
 * Resolves a spoken deadline against the meeting date.
 * Returns YYYY-MM-DD, or null when the phrase has no date in it.
 */
export function resolveDueDate(dueText: string | null | undefined, meetingDate: string): string | null {
  if (!dueText || !dueText.trim()) return null;
  const text = dueText.trim().toLowerCase();
  const ref = meetingDay(meetingDate);

  if (/\b(end of|by the end of|eow)\b.*\b(this|the)\s+week\b|^eow$|^end of week$/.test(text)) {
    return toIsoDate(fridayOf(ref));
  }
  if (/\bend of next week\b/.test(text)) return toIsoDate(fridayOf(ref, 1));
  if (/\b(end of|by the end of)\b.*\b(this|the)\s+month\b|^eom$/.test(text)) {
    return toIsoDate(new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 12));
  }
  if (/\b(today|end of (the )?day|eod)\b/.test(text)) return toIsoDate(ref);

  const parsed = chrono.parseDate(dueText, { instant: ref }, { forwardDate: true });
  return parsed ? toIsoDate(parsed) : null;
}
