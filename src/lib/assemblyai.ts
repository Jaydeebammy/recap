import { AssemblyAI, type Transcript } from "assemblyai";
import type { TranscriptionResult, Utterance } from "./types";

export const SPEECH_MODELS = ["universal-3-5-pro", "universal-2"];

type Client = Pick<AssemblyAI, "files" | "transcripts">;

export function assemblyClient(): Client {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY is not set. Add it to .env.local.");
  return new AssemblyAI({ apiKey });
}

/** Keyterms help with names and jargon. Each must be under 50 characters. */
export function cleanKeyterms(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(/[,\n]/).map((t) => t.trim()).filter((t) => t.length > 0 && t.length < 50))].slice(0, 200);
}

/** Uploads the audio and queues transcription. Returns the transcript id to poll. */
export async function startTranscription(
  audio: Buffer,
  opts: { keyterms?: string[]; client?: Client } = {},
): Promise<string> {
  const client = opts.client ?? assemblyClient();
  const audioUrl = await client.files.upload(audio);
  const transcript = await client.transcripts.submit({
    audio: audioUrl,
    speech_models: SPEECH_MODELS,
    language_detection: true,
    speaker_labels: true,
    speaker_options: { min_speakers_expected: 2, max_speakers_expected: 10 },
    ...(opts.keyterms?.length ? { keyterms_prompt: opts.keyterms } : {}),
  });
  return transcript.id;
}

export function toUtterances(t: Pick<Transcript, "utterances">): Utterance[] {
  return (t.utterances ?? []).map((u) => ({
    speaker: `Speaker ${u.speaker}`,
    startMs: u.start,
    endMs: u.end,
    text: u.text,
  }));
}

export async function getTranscription(id: string, opts: { client?: Client } = {}): Promise<TranscriptionResult> {
  const client = opts.client ?? assemblyClient();
  const t = await client.transcripts.get(id);
  if (t.status === "error") return { id, status: "error", error: t.error ?? "Transcription failed." };
  if (t.status !== "completed") return { id, status: t.status };
  const utterances = toUtterances(t);
  if (utterances.length === 0) return { id, status: "error", error: "No speech was found in this recording." };
  return { id, status: "completed", utterances };
}
