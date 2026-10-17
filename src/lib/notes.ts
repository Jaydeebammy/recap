import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { resolveDueDate } from "./due-dates";
import { transcriptForPrompt } from "./format";
import type { MeetingNotes, Utterance } from "./types";

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export const NOTES_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "2–4 sentences. Lead with the outcome of the meeting.",
    },
    decisions: {
      type: "array",
      items: { type: "string" },
      description: "Things the group agreed. One line each.",
    },
    action_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          task: { type: "string", description: "A concrete task, phrased as a to-do starting with a verb." },
          why: { type: "string", description: "One short line of context from the meeting." },
          due_text: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "The deadline exactly as spoken, e.g. \"Thursday\". null if none was said.",
          },
          quote_ms: {
            type: "integer",
            description: "The [mm:ss] start of the turn the task comes from, converted to milliseconds.",
          },
        },
        required: ["task", "why", "due_text", "quote_ms"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "decisions", "action_items"],
  additionalProperties: false,
} as const;

export function systemPrompt(ownerName: string): string {
  return [
    `You turn meeting transcripts into notes for ${ownerName}.`,
    "Use only what was said. Never invent tasks, decisions or dates.",
    `${ownerName} does every task: list each commitment made in the meeting as a to-do for ${ownerName}, whoever said it.`,
    "Skip small talk, product demos and questions that were not turned into a commitment.",
    "Merge duplicates. Keep the transcript's language.",
  ].join("\n");
}

export function userMessage(input: { title: string; meetingDate: string; utterances: Utterance[] }): string {
  return [
    `Meeting: ${input.title || "Untitled meeting"}`,
    `Date: ${input.meetingDate}`,
    "",
    "<transcript>",
    transcriptForPrompt(input.utterances),
    "</transcript>",
  ].join("\n");
}

type RawNotes = {
  summary: string;
  decisions: string[];
  action_items: { task: string; why: string; due_text: string | null; quote_ms: number }[];
};

/** Snap a model-supplied timestamp to the start of the turn that contains it. */
export function snapToTurn(ms: number, utterances: Utterance[]): number {
  let best = utterances[0]?.startMs ?? 0;
  for (const u of utterances) {
    if (u.startMs <= ms) best = u.startMs;
    else break;
  }
  return best;
}

export function toMeetingNotes(raw: RawNotes, meetingDate: string, utterances: Utterance[]): MeetingNotes {
  return {
    summary: raw.summary.trim(),
    decisions: raw.decisions.map((d) => d.trim()).filter(Boolean),
    actionItems: raw.action_items.map((a) => ({
      task: a.task.trim(),
      why: a.why.trim(),
      dueText: a.due_text?.trim() || null,
      dueDate: resolveDueDate(a.due_text, meetingDate),
      quoteMs: snapToTurn(a.quote_ms, utterances),
    })),
  };
}

export class NotesError extends Error {}

export async function generateNotes(
  input: { title: string; meetingDate: string; utterances: Utterance[] },
  opts: { client?: Pick<Anthropic, "messages">; model?: string; ownerName?: string } = {},
): Promise<MeetingNotes> {
  if (input.utterances.length === 0) throw new NotesError("The transcript is empty.");
  const client = opts.client ?? new Anthropic();
  const response = await client.messages.parse({
    model: opts.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
    max_tokens: 8000,
    system: systemPrompt(opts.ownerName ?? process.env.OWNER_NAME ?? "me"),
    messages: [{ role: "user", content: userMessage(input) }],
    output_config: { format: jsonSchemaOutputFormat(NOTES_SCHEMA) },
  });
  if (response.stop_reason === "refusal") throw new NotesError("The model declined to write notes for this transcript.");
  if (response.stop_reason === "max_tokens") throw new NotesError("The notes were cut off. Try a shorter transcript.");
  const parsed = response.parsed_output as RawNotes | null;
  if (!parsed) throw new NotesError("The model returned notes in an unexpected shape.");
  return toMeetingNotes(parsed, input.meetingDate, input.utterances);
}
