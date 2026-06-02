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
  connections between keys and modes. _Currently a standalone HTML prototype._

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

The monorepo foundation (Phase 0) is in place:

```
apps/shell/               # the Idolmancer host app (Vite + React + Tailwind)
packages/
  tokens/                 # dark-theme Tailwind preset + typed colour tokens
  data-model/             # canonical types + cross-tool selection store
  theory-core/            # pitch/scale/chord/tuning math (unit-tested)
chordgen/                 # existing tool — integrated into the shell in Phase 1
transition_engine.html    # existing prototype — ported & integrated in Phase 1
```

### Develop

Requires Node ≥ 20 and pnpm 10.

```bash
pnpm install
pnpm dev          # run the shell at http://localhost:5173

pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit across all packages
pnpm test         # vitest (theory-core)
pnpm build        # production build of the shell
```

CI runs lint → typecheck → test → build on every push (`.github/workflows/ci.yml`).

### The existing tools (not yet integrated)

- **chordgen** — `cd chordgen && npm install && npm run dev`.
- **transition engine** — open `transition_engine.html` directly in a browser.

Phase 1 moves chordgen into `tools/chordgen/`, ports the transition engine into
`tools/transition-engine/`, and registers both in the shell.

---

## Status

🚧 Early planning — architecture decided. Idolmancer is **offline-first and
strictly client-side**: a Tauri shell, a single dark theme, equal-temperament
tuning (toggleable per tool), wav-file import for analysis (no live capture),
app-storage persistence, and a shared data model that lets tools pass work
between each other. The next milestone is scaffolding the monorepo and bringing
both existing tools into the shell. See [PLAN.md](./PLAN.md) for decisions and roadmap.
