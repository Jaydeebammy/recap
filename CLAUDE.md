@AGENTS.md

# Recap

A single-user meeting notetaker (a personal Tactiq). The owner does every action item, so notes only list the owner's tasks.

- Build plan: Claude Docs "Personal Meeting Notetaker — Build Plan". Roadmap: week 1 Figma ✓, week 2 notes engine ✓ (this code), week 3 Supabase storage + dashboard, weeks 4–6 Chrome MV3 extension (tabCapture + mic in an offscreen document), week 7 polish, week 8 landing page.
- Figma file: https://www.figma.com/design/IRuOxpJ1eBuhfRTEEqKaGF — pages Foundations, Components, Extension, Dashboard. Build UI from those components and the Color/Spacing variables.

## Conventions

- Next.js 16 with `cacheComponents`. Read `node_modules/next/dist/docs/` before using an API you are unsure of. Route handlers type params with `RouteContext<'/path/[id]'>`; run `npm run typecheck` (it runs `next typegen` first).
- Styling: Tailwind v4. Use the token utilities from `@theme inline` in `globals.css` (`bg-canvas`, `bg-surface`, `text-fg-2`, `border-line`, `bg-brand`…), never raw hex. `font-display` is DM Sans for headings.
- Client components must not read the clock during render. Use `useSyncExternalStore` with an empty server snapshot, as `notes-engine.tsx` does.
- Claude calls go through `src/lib/notes.ts` (`messages.parse` + `jsonSchemaOutputFormat`). Schemas need `additionalProperties: false` on every object.
- Every lib module has a `*.test.ts` next to it. Run `npm test`, `npm run lint` and `npm run build` before committing.
