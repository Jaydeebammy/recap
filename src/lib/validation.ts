import { z } from "zod";

export const MAX_UPLOAD_BYTES = 250 * 1024 * 1024; // 250 MB, about 4 hours of compressed audio

export const utteranceSchema = z.object({
  speaker: z.string().trim().min(1).max(80),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative().optional(),
  text: z.string().max(20_000),
});

export const notesRequestSchema = z.object({
  title: z.string().trim().max(200).default(""),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "meetingDate must be YYYY-MM-DD"),
  utterances: z.array(utteranceSchema).min(1, "The transcript is empty.").max(5_000),
});

export const transcriptIdSchema = z.string().regex(/^[A-Za-z0-9_-]{6,64}$/, "Invalid transcript id");

export function isAudioOrVideo(type: string, name: string): boolean {
  if (type.startsWith("audio/") || type.startsWith("video/")) return true;
  return /\.(mp3|m4a|wav|webm|ogg|opus|aac|flac|mp4|mov|mkv)$/i.test(name);
}
