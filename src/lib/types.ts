/** One speaker turn in a transcript. */
export type Utterance = {
  speaker: string;
  /** Milliseconds from the start of the meeting. */
  startMs: number;
  endMs?: number;
  text: string;
};

export type ActionItem = {
  task: string;
  /** One line of context: why the task exists. */
  why: string;
  /** The deadline as spoken ("Thursday", "end of this week"), or null. */
  dueText: string | null;
  /** dueText resolved against the meeting date, as YYYY-MM-DD, or null. */
  dueDate: string | null;
  /** Start of the transcript turn the task came from. */
  quoteMs: number;
};

export type MeetingNotes = {
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
};

export type TranscriptionStatus = "queued" | "processing" | "completed" | "error";

export type TranscriptionResult = {
  id: string;
  status: TranscriptionStatus;
  error?: string;
  utterances?: Utterance[];
};
