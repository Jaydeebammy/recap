import { describe, expect, it, vi } from "vitest";
import { cleanKeyterms, getTranscription, startTranscription } from "./assemblyai";

function fakeClient(transcript: object = {}) {
  return {
    files: { upload: vi.fn().mockResolvedValue("https://cdn.example/upload/abc") },
    transcripts: {
      submit: vi.fn().mockResolvedValue({ id: "tr_123" }),
      get: vi.fn().mockResolvedValue(transcript),
    },
  };
}

describe("startTranscription", () => {
  it("uploads, then submits with speaker labels and the 3.5 Pro model", async () => {
    const client = fakeClient();
    const id = await startTranscription(Buffer.from("audio"), { keyterms: ["Recap", "Elementor"], client: client as never });
    expect(id).toBe("tr_123");
    expect(client.files.upload).toHaveBeenCalledOnce();
    expect(client.transcripts.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: "https://cdn.example/upload/abc",
        speech_models: ["universal-3-5-pro", "universal-2"],
        speaker_labels: true,
        keyterms_prompt: ["Recap", "Elementor"],
      }),
    );
  });

  it("omits keyterms when there are none", async () => {
    const client = fakeClient();
    await startTranscription(Buffer.from("audio"), { client: client as never });
    expect(client.transcripts.submit.mock.calls[0][0]).not.toHaveProperty("keyterms_prompt");
  });
});

describe("getTranscription", () => {
  it("passes through in-progress statuses", async () => {
    const r = await getTranscription("tr_1", { client: fakeClient({ status: "processing" }) as never });
    expect(r).toEqual({ id: "tr_1", status: "processing" });
  });

  it("maps utterances to labelled speaker turns", async () => {
    const client = fakeClient({ status: "completed", utterances: [{ speaker: "A", start: 0, end: 1500, text: "Hi" }] });
    const r = await getTranscription("tr_1", { client: client as never });
    expect(r.utterances).toEqual([{ speaker: "Speaker A", startMs: 0, endMs: 1500, text: "Hi" }]);
  });

  it("reports errors and silent recordings", async () => {
    expect((await getTranscription("tr_1", { client: fakeClient({ status: "error", error: "bad audio" }) as never })).error).toBe("bad audio");
    const empty = await getTranscription("tr_1", { client: fakeClient({ status: "completed", utterances: [] }) as never });
    expect(empty.status).toBe("error");
  });
});

describe("cleanKeyterms", () => {
  it("splits, trims, dedupes and drops terms of 50+ characters", () => {
    expect(cleanKeyterms("Recap, Elementor\nRecap,  ," + "x".repeat(50))).toEqual(["Recap", "Elementor"]);
    expect(cleanKeyterms(null)).toEqual([]);
  });
});
