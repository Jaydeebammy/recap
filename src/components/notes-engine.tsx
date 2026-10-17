"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { applySpeakerNames, msToClock, speakersOf } from "@/lib/format";
import { formatDue, notesToMarkdown } from "@/lib/markdown";
import { parseTranscript } from "@/lib/parse-transcript";
import type { MeetingNotes, TranscriptionResult, Utterance } from "@/lib/types";
import { Avatar, Banner, Button, Card, Icon, Logo, Overline, StatusBadge } from "./ui";

type Step = "input" | "transcribing" | "naming" | "generating" | "notes";
type Source = "upload" | "paste";

const POLL_MS = 3000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const noopSubscribe = () => () => {};

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
  } catch {}
  return `Request failed (${res.status}).`;
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function NotesEngine() {
  const [step, setStep] = useState<Step>("input");
  const [source, setSource] = useState<Source>("upload");
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [keyterms, setKeyterms] = useState("");
  const [pasted, setPasted] = useState("");
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<MeetingNotes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [focusMs, setFocusMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const cancelled = useRef(false);

  // Today's date is read on the client only, so the server render stays deterministic.
  const today = useSyncExternalStore(noopSubscribe, todayIso, () => "");
  const date = meetingDate || today;
  const elapsed = startedAt && now > startedAt ? Math.floor((now - startedAt) / 1000) : 0;

  useEffect(() => {
    cancelled.current = false;
    return () => { cancelled.current = true; };
  }, []);
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const speakers = useMemo(() => speakersOf(utterances), [utterances]);
  const named = useMemo(() => applySpeakerNames(utterances, names), [utterances, names]);
  const toneOf = (label: string) => Math.max(0, speakers.indexOf(label));
  const pastedTurns = useMemo(() => (source === "paste" && pasted.trim() ? parseTranscript(pasted) : []), [source, pasted]);

  function loadTranscript(turns: Utterance[]) {
    setUtterances(turns);
    const initial: Record<string, string> = {};
    for (const s of speakersOf(turns)) initial[s] = /^Speaker [A-Z0-9]+$/.test(s) ? "" : s;
    setNames(initial);
    setStep("naming");
  }

  async function transcribe() {
    if (!file) return;
    setError(null);
    setStartedAt(Date.now());
    setStep("transcribing");
    try {
      const form = new FormData();
      form.set("audio", file);
      if (keyterms.trim()) form.set("keyterms", keyterms);
      const res = await fetch("/api/transcriptions", { method: "POST", body: form });
      if (!res.ok) throw new Error(await readError(res));
      const { id } = (await res.json()) as { id: string };
      while (!cancelled.current) {
        await sleep(POLL_MS);
        const poll = await fetch(`/api/transcriptions/${id}`, { cache: "no-store" });
        if (!poll.ok) throw new Error(await readError(poll));
        const result = (await poll.json()) as TranscriptionResult;
        if (result.status === "error") throw new Error(result.error ?? "Transcription failed.");
        if (result.status === "completed" && result.utterances) return loadTranscript(result.utterances);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("input");
    }
  }

  function usePasted() {
    setError(null);
    if (pastedTurns.length === 0) {
      setError("No speaker turns found. Use lines like “00:12 Ben : text” or “Ben: text”.");
      return;
    }
    loadTranscript(pastedTurns);
  }

  async function writeNotes() {
    setError(null);
    setStartedAt(Date.now());
    setStep("generating");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, meetingDate: date, utterances: named }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const body = (await res.json()) as { notes: MeetingNotes };
      setNotes(body.notes);
      setDone(new Set());
      setStep("notes");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("naming");
    }
  }

  async function copyMarkdown() {
    if (!notes) return;
    await navigator.clipboard.writeText(notesToMarkdown({ title, meetingDate: date, notes }));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function jumpTo(ms: number) {
    setFocusMs(ms);
    document.getElementById(`turn-${ms}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function startOver() {
    setStep("input"); setNotes(null); setUtterances([]); setNames({}); setFile(null); setPasted(""); setError(null); setFocusMs(null);
  }

  const busyLabel = step === "transcribing" ? "Transcribing" : "Summarising";

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-8 sm:px-10">
      <header className="flex items-center justify-between">
        <Logo />
        <ol className="hidden items-center gap-4 text-xs text-fg-3 sm:flex" aria-label="Progress">
          {["Add meeting", "Name speakers", "Notes"].map((label, i) => {
            const active = (i === 0 && (step === "input" || step === "transcribing")) || (i === 1 && (step === "naming" || step === "generating")) || (i === 2 && step === "notes");
            return <li key={label} className={active ? "font-medium text-fg" : ""} aria-current={active ? "step" : undefined}>{i + 1}. {label}</li>;
          })}
        </ol>
      </header>

      {error && <Banner type="error" title="Something went wrong">{error}</Banner>}

      {/* ---------- Step 1: input ---------- */}
      {(step === "input" || step === "transcribing") && (
        <section className="mx-auto w-full max-w-2xl space-y-6">
          <div className="space-y-2">
            <h1 className="font-display font-medium tracking-[-0.02em] text-4xl leading-[44px] sm:text-[40px]">Turn a meeting into notes</h1>
            <p className="text-sm text-fg-2">Upload a recording or paste a transcript. You’ll name the speakers, then get a summary, decisions and your action items.</p>
          </div>

          <Card className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <label className="space-y-1.5">
                <span className="text-xs font-medium">Meeting title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product launch sync"
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-fg-3 hover:border-line-strong" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium">Date</span>
                <input type="date" value={date} onChange={(e) => setMeetingDate(e.target.value)} required
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm hover:border-line-strong" />
              </label>
            </div>

            <div role="tablist" aria-label="Source" className="flex gap-4 border-b border-line">
              {(["upload", "paste"] as const).map((s) => (
                <button key={s} role="tab" aria-selected={source === s} onClick={() => setSource(s)}
                  className={`-mb-px border-b-2 px-1 pb-2 text-sm font-medium ${source === s ? "border-brand text-fg" : "border-transparent text-fg-2 hover:text-fg"}`}>
                  {s === "upload" ? "Upload recording" : "Paste transcript"}
                </button>
              ))}
            </div>

            {source === "upload" ? (
              <div className="space-y-4">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong bg-subtle px-6 py-10 text-center hover:bg-hover">
                  <Icon.Upload className="text-fg-2" />
                  <span className="text-sm font-medium">{file ? file.name : "Choose an audio or video file"}</span>
                  <span className="text-xs text-fg-3">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "MP3, M4A, WAV, WEBM or MP4, up to 250 MB"}</span>
                  <input type="file" accept="audio/*,video/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium">Names and terms (optional)</span>
                  <input value={keyterms} onChange={(e) => setKeyterms(e.target.value)} placeholder="Names, client names, product words, separated by commas"
                    className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-fg-3" />
                  <span className="text-xs text-fg-3">Helps the transcriber spell names and jargon correctly.</span>
                </label>
                <Button onClick={transcribe} disabled={!file || !date || step === "transcribing"} className="w-full"
                  icon={step === "transcribing" ? <Icon.Spinner size={18} /> : undefined}>
                  {step === "transcribing" ? `Transcribing… ${msToClock(elapsed * 1000)}` : "Transcribe"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="sr-only">Transcript</span>
                  <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={10}
                    placeholder={"00:00 Ben : Welcome, everyone.\n00:40 Chris : Where do we start?"}
                    className="w-full rounded-lg border border-line bg-surface p-3 font-mono text-[13px] leading-[18px] placeholder:text-fg-3" />
                </label>
                <p className="text-xs text-fg-3" aria-live="polite">
                  {pasted.trim() ? `${pastedTurns.length} turns · ${speakersOf(pastedTurns).length} speakers found` : "Works with Tactiq exports and “Name: text” lines."}
                </p>
                <Button onClick={usePasted} disabled={!pasted.trim() || !date} className="w-full">Continue</Button>
              </div>
            )}
          </Card>
          {step === "transcribing" && (
            <Banner type="info" title="Transcribing">A 40-minute call usually takes 1–2 minutes. Keep this tab open.</Banner>
          )}
        </section>
      )}

      {/* ---------- Step 2: name speakers ---------- */}
      {(step === "naming" || step === "generating") && (
        <section className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="font-display font-medium tracking-[-0.02em] text-4xl">{title || "Untitled meeting"}</h1>
              <p className="text-sm text-fg-2">{utterances.length} turns · {speakers.length} speakers</p>
            </div>
            <Card className="max-h-[70vh] space-y-1 overflow-y-auto">
              {named.map((u, i) => (
                <Turn key={i} utterance={u} tone={toneOf(utterances[i].speaker)} />
              ))}
            </Card>
          </div>
          <aside className="space-y-4">
            <Card className="space-y-3">
              <Overline>Speakers</Overline>
              <p className="text-xs text-fg-3">Name each speaker once. The notes use these names.</p>
              {speakers.map((s, i) => {
                const first = utterances.find((u) => u.speaker === s)?.text ?? "";
                return (
                  <div key={s} className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={names[s] || s} tone={i} />
                      <input aria-label={`Name for ${s}`} value={names[s] ?? ""} placeholder={s}
                        onChange={(e) => setNames((n) => ({ ...n, [s]: e.target.value }))}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-fg-3 hover:border-line-strong" />
                    </div>
                    <p className="line-clamp-1 pl-10 text-xs text-fg-3">“{first}”</p>
                  </div>
                );
              })}
            </Card>
            <Button onClick={writeNotes} disabled={step === "generating"} className="w-full"
              icon={step === "generating" ? <Icon.Spinner size={18} /> : <Icon.Sparkle size={18} />}>
              {step === "generating" ? `Writing notes… ${msToClock(elapsed * 1000)}` : "Write notes"}
            </Button>
            <Button variant="ghost" onClick={startOver} className="w-full" icon={<Icon.ArrowLeft size={18} />}>Start over</Button>
          </aside>
        </section>
      )}

      {/* ---------- Step 3: notes ---------- */}
      {step === "notes" && notes && (
        <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <h1 className="font-display font-medium tracking-[-0.02em] text-[40px] leading-[44px]">{title || "Meeting notes"}</h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-fg-2">
                  <span className="inline-flex items-center gap-1.5"><Icon.Calendar size={16} />{formatDue(date, null)}</span>
                  <span className="inline-flex items-center gap-1.5"><Icon.Clock size={16} />{msToClock(utterances.at(-1)?.endMs ?? utterances.at(-1)?.startMs ?? 0)}</span>
                  <StatusBadge status="Done" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={copyMarkdown} icon={copied ? <Icon.Check size={18} /> : <Icon.Copy size={18} />}>{copied ? "Copied" : "Copy Markdown"}</Button>
                <Button variant="ghost" onClick={startOver}>New meeting</Button>
              </div>
            </div>

            <Card className="space-y-5">
              <div className="space-y-2">
                <Overline>Summary</Overline>
                <p className="text-base leading-[26px]">{notes.summary}</p>
              </div>
              {notes.decisions.length > 0 && (
                <div className="space-y-2">
                  <Overline>Decisions</Overline>
                  <ul className="space-y-2">
                    {notes.decisions.map((d, i) => (
                      <li key={i} className="flex gap-2.5 text-sm"><Icon.Check size={16} className="mt-0.5 shrink-0 text-brand-fg" />{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Overline>Your action items</Overline>
                  <span className="text-xs text-fg-2">{notes.actionItems.length - done.size} open · {done.size} done</span>
                </div>
                {notes.actionItems.length === 0 && <p className="py-2 text-sm text-fg-3">No commitments were made in this meeting.</p>}
                <ul>
                  {notes.actionItems.map((a, i) => {
                    const isDone = done.has(i);
                    return (
                      <li key={i} className="flex gap-3 rounded-lg p-3 hover:bg-subtle">
                        <input type="checkbox" checked={isDone} aria-label={`Mark “${a.task}” done`}
                          onChange={() => setDone((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                          className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--color-bg-brand)]" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className={`text-sm ${isDone ? "text-fg-3 line-through" : ""}`}>{a.task}</p>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-2">
                            <Icon.Calendar size={14} />
                            <span title={a.dueText ?? undefined}>{formatDue(a.dueDate, a.dueText)}</span>
                            <span className="text-fg-3">·</span>
                            <button onClick={() => jumpTo(a.quoteMs)} className="font-mono text-[11px] text-brand-fg hover:underline">at {msToClock(a.quoteMs)}</button>
                            {a.why && <><span className="text-fg-3">·</span><span className="text-fg-3">{a.why}</span></>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          </div>
          <aside className="space-y-3">
            <Overline>Transcript</Overline>
            <Card className="max-h-[80vh] space-y-1 overflow-y-auto p-3">
              {named.map((u, i) => (
                <Turn key={i} utterance={u} tone={toneOf(utterances[i].speaker)} highlighted={focusMs === u.startMs} />
              ))}
            </Card>
          </aside>
        </section>
      )}

      {(step === "transcribing" || step === "generating") && (
        <p className="sr-only" aria-live="polite">{busyLabel}…</p>
      )}
    </div>
  );
}

function Turn({ utterance, tone, highlighted }: { utterance: Utterance; tone: number; highlighted?: boolean }) {
  return (
    <div id={`turn-${utterance.startMs}`} className={`flex gap-3 rounded-lg px-3 py-2 ${highlighted ? "bg-warning-subtle" : ""}`}>
      <Avatar name={utterance.speaker} tone={tone} size="sm" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="flex items-center gap-2 text-xs font-medium">
          {utterance.speaker}
          <span className="font-mono text-[11px] font-normal text-fg-3">{msToClock(utterance.startMs)}</span>
        </p>
        <p className="text-sm leading-[22px]">{utterance.text}</p>
      </div>
    </div>
  );
}
