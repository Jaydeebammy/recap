import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/assemblyai", async (orig) => ({
  ...(await orig<typeof import("@/lib/assemblyai")>()),
  startTranscription: vi.fn().mockResolvedValue("tr_abc123"),
  getTranscription: vi.fn().mockResolvedValue({ id: "tr_abc123", status: "processing" }),
}));
vi.mock("@/lib/notes", async (orig) => ({
  ...(await orig<typeof import("@/lib/notes")>()),
  generateNotes: vi.fn().mockResolvedValue({ summary: "s", decisions: [], actionItems: [] }),
}));

const { POST: postTranscription } = await import("./transcriptions/route");
const { GET: getTranscription } = await import("./transcriptions/[id]/route");
const { POST: postNotes } = await import("./notes/route");
const assembly = await import("@/lib/assemblyai");

function upload(file?: File, extra: Record<string, string> = {}) {
  const form = new FormData();
  if (file) form.set("audio", file);
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  return new Request("http://local/api/transcriptions", { method: "POST", body: form });
}

describe("POST /api/transcriptions", () => {
  beforeEach(() => vi.mocked(assembly.startTranscription).mockClear());

  it("queues an audio file and returns its id", async () => {
    const res = await postTranscription(upload(new File(["abc"], "call.m4a", { type: "audio/mp4" }), { keyterms: "Recap, Jaydee" }));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ id: "tr_abc123" });
    expect(vi.mocked(assembly.startTranscription).mock.calls[0][1]).toEqual({ keyterms: ["Recap", "Jaydee"] });
  });

  it("rejects a missing or non-audio file", async () => {
    expect((await postTranscription(upload())).status).toBe(400);
    expect((await postTranscription(upload(new File(["x"], "notes.pdf", { type: "application/pdf" })))).status).toBe(415);
  });
});

describe("GET /api/transcriptions/[id]", () => {
  it("returns the status", async () => {
    const res = await getTranscription(new Request("http://local") as never, { params: Promise.resolve({ id: "tr_abc123" }) } as never);
    expect(await res.json()).toEqual({ id: "tr_abc123", status: "processing" });
  });
  it("rejects a malformed id", async () => {
    const res = await getTranscription(new Request("http://local") as never, { params: Promise.resolve({ id: "../etc" }) } as never);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/notes", () => {
  const post = (body: unknown) =>
    postNotes(new Request("http://local/api/notes", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));

  it("returns notes for a valid request", async () => {
    const res = await post({ title: "Sync", meetingDate: "2026-10-16", utterances: [{ speaker: "Ben", startMs: 0, text: "hi" }] });
    expect(res.status).toBe(200);
    expect((await res.json()).notes.summary).toBe("s");
  });

  it("validates the body", async () => {
    expect((await post({ meetingDate: "16/10/2026", utterances: [] })).status).toBe(400);
    expect((await post({ meetingDate: "2026-10-16", utterances: [] })).status).toBe(400);
  });
});
