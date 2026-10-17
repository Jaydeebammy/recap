import { clockToMs } from "./format";
import type { Utterance } from "./types";

/**
 * Turns a pasted transcript into speaker turns. Handles the common export shapes:
 *
 *   00:12 Ben : Welcome, everyone        (Tactiq)
 *   [00:12] Ben: Welcome, everyone
 *   Ben (00:12): Welcome, everyone
 *   Ben: Welcome, everyone               (no timestamps)
 *
 * Lines that don't start a new turn are joined onto the previous one, which
 * repairs text that was wrapped across lines (for example, copied from a PDF).
 * Header lines before the first turn are ignored.
 */

const TIME = String.raw`\d{1,2}:\d{2}(?::\d{2})?`;
const SPEAKER = String.raw`[^\s:\[\]()][^:\[\]()]{0,59}?`;

const TIME_FIRST = new RegExp(String.raw`^\s*\[?(${TIME})\]?\s*[-–]?\s*(${SPEAKER})\s*:\s*(.*)$`);
const NAME_THEN_TIME = new RegExp(String.raw`^\s*(${SPEAKER})\s*[(\[](${TIME})[)\]]\s*:?\s*(.*)$`);
// Untimed "Name: text" — name is 1–4 words, no sentence punctuation.
const NAME_ONLY = /^\s*([A-Za-z][\w'’.-]*(?:\s+[A-Za-z][\w'’.-]*){0,3})\s*:\s+(.*)$/;

const NOISE = [/^view original transcript/i, /^transcript$/i];

type Mode = "time-first" | "name-then-time" | "name-only";

function detectMode(lines: string[]): Mode | null {
  const counts: Record<Mode, number> = { "time-first": 0, "name-then-time": 0, "name-only": 0 };
  for (const line of lines) {
    if (TIME_FIRST.test(line)) counts["time-first"]++;
    else if (NAME_THEN_TIME.test(line)) counts["name-then-time"]++;
    else if (NAME_ONLY.test(line)) counts["name-only"]++;
  }
  // Timestamped formats win whenever they appear: "Note: …" inside text
  // must not be mistaken for a speaker when real turns carry times.
  if (counts["time-first"] > 0 && counts["time-first"] >= counts["name-then-time"]) return "time-first";
  if (counts["name-then-time"] > 0) return "name-then-time";
  if (counts["name-only"] >= 2) return "name-only";
  return null;
}

function matchTurn(line: string, mode: Mode): { speaker: string; clock: string | null; text: string } | null {
  if (mode === "time-first") {
    const m = TIME_FIRST.exec(line);
    return m ? { clock: m[1], speaker: m[2], text: m[3] } : null;
  }
  if (mode === "name-then-time") {
    const m = NAME_THEN_TIME.exec(line);
    return m ? { speaker: m[1], clock: m[2], text: m[3] } : null;
  }
  const m = NAME_ONLY.exec(line);
  return m ? { speaker: m[1], clock: null, text: m[2] } : null;
}

export function parseTranscript(raw: string): Utterance[] {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim() !== "" && !NOISE.some((re) => re.test(l.trim())));

  const mode = detectMode(lines);
  if (!mode) return [];

  const turns: Utterance[] = [];
  let lastMs = 0;
  for (const line of lines) {
    const turn = matchTurn(line, mode);
    if (turn) {
      const ms = turn.clock ? clockToMs(turn.clock) : null;
      if (ms !== null) lastMs = ms;
      turns.push({ speaker: turn.speaker.trim(), startMs: lastMs, text: turn.text.trim() });
    } else if (turns.length > 0) {
      const prev = turns[turns.length - 1];
      prev.text = `${prev.text} ${line.trim()}`.trim();
    }
  }

  // Fill end times from the next turn's start.
  for (let i = 0; i < turns.length - 1; i++) {
    if (turns[i + 1].startMs >= turns[i].startMs) turns[i].endMs = turns[i + 1].startMs;
  }
  return turns.filter((t) => t.text.length > 0);
}
