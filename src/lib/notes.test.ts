import { describe, expect, it, vi } from "vitest";
import { NOTES_SCHEMA, NotesError, generateNotes, snapToTurn, systemPrompt } from "./notes";
import type { Utterance } from "./types";

const utterances: Utterance[] = [
  { speaker: "Ben", startMs: 0, text: "Let's plan the launch." },
  { speaker: "Amelia", startMs: 92_000, text: "I'll finish content approvals by Thursday." },
  { speaker: "Sasha", startMs: 132_000, text: "I'll finish testing by the end of this week." },
];

function fakeClient(response: object) {
  const parse = vi.fn().mockResolvedValue(response);
  return { client: { messages: { parse } } as never, parse };
}

describe("snapToTurn", () => {
  it("snaps to the turn that contains the timestamp", () => {
    expect(snapToTurn(100_000, utterances)).toBe(92_000);
    expect(snapToTurn(132_000, utterances)).toBe(132_000);
    expect(snapToTurn(999_999, utterances)).toBe(132_000);
  });
});

describe("generateNotes", () => {
  it("sends a structured-output request and resolves due dates", async () => {
    const { client, parse } = fakeClient({
      stop_reason: "end_turn",
      parsed_output: {
        summary: " Launch stays on track. ",
        decisions: ["Launch in three weeks", " "],
        action_items: [
          { task: "Complete content approvals", why: "Needed before launch", due_text: "Thursday", quote_ms: 93_000 },
          { task: "Finish final testing", why: "Engineering readiness", due_text: "end of this week", quote_ms: 132_000 },
          { task: "Share specs with sales", why: "Client calls", due_text: null, quote_ms: 5_000 },
        ],
      },
    });
    const notes = await generateNotes(
      { title: "Launch sync", meetingDate: "2026-10-16", utterances },
      { client, model: "test-model", ownerName: "Jaydee" },
    );

    const req = parse.mock.calls[0][0];
    expect(req.model).toBe("test-model");
    expect(req.system).toContain("Jaydee does every task");
    expect(req.output_config.format.type).toBe("json_schema");
    expect(req.messages[0].content).toContain("Amelia [01:32]: I'll finish content approvals by Thursday.");

    expect(notes.summary).toBe("Launch stays on track.");
    expect(notes.decisions).toEqual(["Launch in three weeks"]);
    expect(notes.actionItems).toEqual([
      { task: "Complete content approvals", why: "Needed before launch", dueText: "Thursday", dueDate: "2026-10-22", quoteMs: 92_000 },
      { task: "Finish final testing", why: "Engineering readiness", dueText: "end of this week", dueDate: "2026-10-16", quoteMs: 132_000 },
      { task: "Share specs with sales", why: "Client calls", dueText: null, dueDate: null, quoteMs: 0 },
    ]);
  });

  it("throws a readable error on refusal or truncation", async () => {
    for (const stop_reason of ["refusal", "max_tokens"]) {
      const { client } = fakeClient({ stop_reason, parsed_output: null });
      await expect(generateNotes({ title: "", meetingDate: "2026-10-16", utterances }, { client })).rejects.toBeInstanceOf(NotesError);
    }
  });

  it("refuses an empty transcript without calling the API", async () => {
    const { client, parse } = fakeClient({});
    await expect(generateNotes({ title: "", meetingDate: "2026-10-16", utterances: [] }, { client })).rejects.toThrow("empty");
    expect(parse).not.toHaveBeenCalled();
  });
});

describe("NOTES_SCHEMA", () => {
  it("only uses features structured outputs supports", () => {
    const json = JSON.stringify(NOTES_SCHEMA);
    expect(json).not.toMatch(/minLength|maxLength|minimum|maximum|"\$ref"/);
    // every object closes additionalProperties
    const objects = json.match(/"type":"object"/g)?.length ?? 0;
    const closed = json.match(/"additionalProperties":false/g)?.length ?? 0;
    expect(closed).toBe(objects);
  });
  it("names the owner in the system prompt", () => {
    expect(systemPrompt("Ada")).toContain("for Ada");
  });
});
