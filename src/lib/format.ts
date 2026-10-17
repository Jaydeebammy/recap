import type { Utterance } from "./types";

/** 65_000 → "01:05", 3_725_000 → "1:02:05" */
export function msToClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "01:05" → 65_000, "1:02:05" → 3_725_000. Returns null for anything else. */
export function clockToMs(clock: string): number | null {
  const parts = clock.trim().split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    return null;
  }
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  if (m > 59 && parts.length === 3) return null;
  if (s > 59) return null;
  return ((h * 60 + m) * 60 + s) * 1000;
}

/** Unique speaker labels in order of first appearance. */
export function speakersOf(utterances: Utterance[]): string[] {
  return [...new Set(utterances.map((u) => u.speaker))];
}

/** Replace speaker labels using a label → name map. Blank names keep the label. */
export function applySpeakerNames(
  utterances: Utterance[],
  names: Record<string, string>,
): Utterance[] {
  return utterances.map((u) => {
    const name = names[u.speaker]?.trim();
    return name ? { ...u, speaker: name } : u;
  });
}

/** The transcript as the model sees it: `Name [mm:ss]: text`, one turn per line. */
export function transcriptForPrompt(utterances: Utterance[]): string {
  return utterances
    .map((u) => `${u.speaker} [${msToClock(u.startMs)}]: ${u.text.replace(/\s+/g, " ").trim()}`)
    .join("\n");
}
