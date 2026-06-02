# Idolmancer

A music composition and theory workbench. Idolmancer is a single shell
application that presents many focused **tools** — each developed as its own
project and imported into the shell to be displayed and organized on its own page.

**Primary target:** Windows 11 desktop · **Planned:** Android mobile

> 📋 See **[PLAN.md](./PLAN.md)** for the full architecture, roadmap, and open questions.

---

## Tools

### Included now
- **chordgen** — chord & progression generator (key / scale / genre / mood),
  with playback and MIDI export. _Vite + React + TypeScript + Tailwind, Tone.js._
- **transition engine** — harmonic voice-leading engine that finds smooth
  connections between keys and modes. _Typed engine core + React view._

### Planned
- **Hertz / Harmonics** — notes & chords → frequencies, with harmonic and
  sub-harmonic series of the selection.
- **BPM ↔ Milliseconds** — tempo to milliseconds with note-subdivision math.
- **Waveform Analysis** — time-domain view of a sample or input.
- **Spectrum Analysis** — frequency-domain (FFT) view.
- **Frequency-Response / EQ Preview** — how a response curve affects an audio
  sample or live input.

---

## Architecture at a glance

Every tool is a self-contained Vite + React + TypeScript package that exports:
1. a **headless core** of pure theory/DSP math (framework-free, unit-tested),
2. a **default React component** that renders the tool, and
3. a **manifest** (id, name, icon, category) the shell uses to register it.

The shell hosts a tool registry, navigation, layout, and a shared design system.
Shared music-theory math, the Web Audio engine, and UI components live in common
`packages/` so tools don't duplicate logic. The whole app is **client-side**;
it is wrapped in a thin native shell (Tauri) for Windows 11, with a path to
Android from the same codebase.

> **Why one stack?** chordgen already runs its audio in the browser, and the
> transition engine is pure pitch-class math — neither needs a server. Rather
> than maintain a React/Tailwind tool alongside a plain-HTML one (or introduce
> Python), all tools standardize on the same web stack. The transition engine
> will be ported from HTML into a TypeScript module + React view. See
> [PLAN.md](./PLAN.md) for the reasoning.

### Planned repository layout
```
idolmancer/
├─ apps/shell/            # the Idolmancer host application
├─ tools/                 # one folder per tool (chordgen, transition-engine, …)
├─ packages/              # shared: theory-core, audio-engine, ui, tokens
├─ PLAN.md
└─ README.md
```

---

## Repository layout

Monorepo foundation (Phase 0) plus both tools integrated into the shell (Phase 1):

```
apps/shell/               # the Idolmancer host app (Vite + React + Tailwind)
packages/
  tokens/                 # dark-theme Tailwind preset + typed colour tokens
  data-model/             # canonical types + cross-tool selection store
  theory-core/            # pitch/scale/chord/tuning math (unit-tested)
  storage/                # app-storage persistence for the shared selection
tools/
  chordgen/               # chord & progression generator (Tone.js + MIDI export)
  transition-engine/      # harmonic voice-leading engine (typed core + React view)
  harmonics/              # note → Hz, harmonic & sub-harmonic series
  bpm-ms/                 # tempo → milliseconds with subdivisions
```

Each tool is a `@idolmancer/*` package exporting a default React component and a
light `./manifest`. The shell's tool registry (`apps/shell/src/registry.ts`) lists
them and lazy-loads each component — adding a tool is one entry there.

### Develop

Requires Node ≥ 20 and pnpm 10.

```bash
pnpm install
pnpm dev          # run the shell at http://localhost:5173

pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit across all packages
pnpm test         # vitest (theory-core + transition-engine)
pnpm build        # production build of the shell (code-splits each tool)
```

CI runs lint → typecheck → test → build on every push (`.github/workflows/ci.yml`).

---

## Status

🚧 Phases 0–2 complete. The monorepo foundation is in place; four tools (chordgen,
transition engine, harmonics, bpm-ms) are integrated as lazy-loaded pages; shared
theory math lives in `theory-core`; the cross-tool selection is persisted to app
storage; and the first association is wired (chordgen publishes its key/scale, which
the transition engine and harmonics tools can load). Idolmancer is **offline-first
and strictly client-side**: a Tauri shell, a single dark theme, equal-temperament
tuning (toggleable where relevant), wav-file import for analysis (no live capture),
and a shared data model that lets tools pass work between each other. Next: Phase 3 —
the `audio-engine` (wav decode + offline analysis) and the waveform/spectrum/EQ
tools. See [PLAN.md](./PLAN.md) for decisions and roadmap.
