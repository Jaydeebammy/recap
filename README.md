# Recap

A personal meeting notetaker. Upload a recording or paste a transcript, name the speakers, and get a summary, the decisions and your action items with real due dates.

This repo is **week 2 of the build plan: the notes engine**. Storage and the dashboard come in week 3, and the Chrome extension in weeks 4–6.

## Run it

```bash
npm install
cp .env.example .env.local   # add your AssemblyAI and Anthropic keys
npm run dev                  # http://localhost:3000
```

| Variable | Required | What it does |
| --- | --- | --- |
| `ASSEMBLYAI_API_KEY` | yes | Transcription and speaker labels |
| `ANTHROPIC_API_KEY` | yes | Writes the notes |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-sonnet-5-5` |
| `OWNER_NAME` | no | Your name as people say it in meetings. Action items are only yours. |

## How it works

1. **Add meeting.** An upload goes to `POST /api/transcriptions`, which sends it to AssemblyAI (Universal-3.5 Pro with speaker labels) and returns an id. The page polls `GET /api/transcriptions/[id]` every 3 seconds. A pasted transcript is parsed in the browser instead (`src/lib/parse-transcript.ts` reads Tactiq exports, `[00:05] Name:` and `Name: text`).
2. **Name speakers.** "Speaker A" becomes a real name before anything is summarised, so the notes use names.
3. **Notes.** `POST /api/notes` sends the named transcript to Claude with a JSON schema (structured outputs). Spoken deadlines such as "by Thursday" are turned into dates against the meeting date (`src/lib/due-dates.ts`). Each action item links back to the moment it was said.

```
src/
  app/
    page.tsx                         renders the notes engine
    api/transcriptions/route.ts      upload → AssemblyAI
    api/transcriptions/[id]/route.ts poll status
    api/notes/route.ts               transcript → notes
  components/
    notes-engine.tsx                 the three-step client UI
    ui.tsx                           Button, Avatar, StatusBadge, Banner… (from the Figma design system)
  lib/
    assemblyai.ts  notes.ts  parse-transcript.ts  due-dates.ts  format.ts  markdown.ts  validation.ts
```

Design tokens in `src/app/globals.css` mirror the Figma variables (light and dark). Headings use DM Sans, body text Geist, and timestamps Geist Mono.

## Checks

```bash
npm test          # vitest: parser, dates, notes, AssemblyAI client, routes
npm run lint
npm run build
```

## Known limits (fixed in week 3)

- **Run locally for now.** Vercel functions accept request bodies up to 4.5 MB, so uploads would fail there. Week 3 uploads straight to Supabase Storage and passes AssemblyAI a signed URL.
- Nothing is saved yet. Refreshing the page loses the meeting. Use **Copy Markdown** to keep notes.
- Audio is never stored by Recap. AssemblyAI keeps the upload until the transcript is deleted.
