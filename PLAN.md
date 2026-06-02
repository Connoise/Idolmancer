# Idolmancer — Development Plan

> A music composition and theory workbench. A single shell app presents many
> focused composition/analysis **tools**, each developed as its own project and
> imported into Idolmancer for display and organization.
>
> **Primary target:** Windows 11 desktop. **Later:** Android mobile.

---

## 1. Current state

| Tool | Location | Stack | Audio | Notes |
|------|----------|-------|-------|-------|
| **chordgen** | `chordgen/` | Vite + React 18 + TypeScript + Tailwind | Tone.js (Web Audio) + `@tonejs/midi` | Chord & progression generator with key/scale/genre/mood, playback, MIDI export. ~1k LOC. |
| **transition engine** | `transition_engine.html` | Single-file vanilla HTML/CSS/JS | none | Harmonic voice-leading engine between keys/modes. Pure pitch-class math, no framework. ~670 LOC. |

### Planned future tools (separate projects, added later)
1. **Hertz / Harmonics** — notes & chords → frequencies; shows harmonic & sub-harmonic series of the selection.
2. **BPM ↔ Milliseconds** — tempo to ms with note-subdivision calculations.
3. **Waveform Analysis** — time-domain visualization of an audio sample/input.
4. **Spectrum Analysis** — frequency-domain (FFT) visualization.
5. **Frequency-Response / EQ Preview** — show how a response curve affects an audio sample or live input.

---

## 2. The core question: reconciling the two stacks

**The decision: standardize every tool on one web stack — Vite + React + TypeScript + Tailwind — and ship it as a desktop app via a thin native shell. Do _not_ introduce Python.**

### Why not Python for the transition engine?

- The entire product is **client-side**. chordgen already does its audio in the
  browser (Web Audio via Tone.js). The transition engine is **pure, dependency-free
  math** (pitch-class voice-leading, shortest-path inversions). Neither needs a server.
- Adding Python would force a runtime decision with real cost in every direction:
  - a **bundled interpreter** (PyInstaller) + local server process, or
  - **Pyodide** (a multi-MB WASM Python in the browser),

  and it would **break the Android path**, where shipping CPython is painful.
- Python's only genuine pull is heavy DSP/numeric work (numpy/scipy/librosa) for
  the waveform/spectrum/EQ tools — but those have first-class **browser-native**
  equivalents: the Web Audio `AnalyserNode` (real-time FFT), plus `fft.js` /
  `meyda` for feature extraction, all running on the same thread model on desktop
  **and** mobile.

**Recommendation:** keep the transition engine's logic exactly as-is conceptually,
but **port it into a framework-agnostic TypeScript module** (a pure `core` library
with zero DOM/React dependencies), then wrap a thin React view around it. This is a
few hours of mechanical work, it deletes the stack split, and the math stays unit-testable.

### How future tools should be developed

Every tool is its own Vite + React + TS package that:
1. exports a **headless core** (pure TS: theory/DSP math, no React) — testable in isolation, and
2. exports a **default React component** that renders the tool, and
3. exports a **manifest** (id, display name, icon, category, version) the shell uses to register it.

This makes each tool independently runnable (`npm run dev` in its own folder) **and**
importable by the shell without modification.

---

## 3. Target architecture

### 3.1 Desktop/mobile shell

- **Desktop (now):** **Tauri v2**. Small bundles, native Windows 11 webview (WebView2),
  good signing/installer story, low memory vs Electron.
- **Mobile (later):** **Tauri v2 mobile** targets Android from the same codebase — the
  single biggest reason to pick Tauri over Electron (which has no mobile path).
- The shell is a normal web app inside the native window, so day-to-day development
  is just a browser (`npm run dev`); the native wrapper is only needed for packaging.

> ✅ **Confirmed.** Tauri is approved. The product is **offline-first** and **strictly
> client-side** — no server, no network dependency. Distribution is informal (personal
> use by you and a few others later), so no installer/store/signing effort is planned.
> Android later targets **full feature parity** (no timeline).

### 3.2 Monorepo layout

A single repository with workspaces (pnpm or npm workspaces) so tools share code,
versioning, and tooling while remaining independently buildable.

```
idolmancer/
├─ apps/
│  └─ shell/              # Idolmancer host: routing, nav, tool registry, layout, theming
├─ tools/
│  ├─ chordgen/           # (moved from ./chordgen)
│  ├─ transition-engine/  # (ported from ./transition_engine.html)
│  ├─ harmonics/          # future
│  ├─ bpm-ms/             # future
│  ├─ waveform/           # future
│  ├─ spectrum/           # future
│  └─ eq-preview/         # future
├─ packages/
│  ├─ data-model/         # shared types + cross-tool "current selection" store (see §3.5)
│  ├─ theory-core/        # shared music-theory math (scales, chords, pitch classes)
│  ├─ audio-engine/       # shared Web Audio helpers (playback, wav decode/analysis)
│  ├─ storage/            # app-storage persistence (projects, presets, wav files)
│  ├─ ui/                 # shared React components (controls, panels, piano, meters)
│  └─ tokens/             # design tokens / Tailwind preset (single dark theme)
├─ PLAN.md
└─ README.md
```

### 3.3 The tool contract

```ts
// every tool exposes this from its package entry point
export interface ToolManifest {
  id: string;                 // "chordgen"
  name: string;               // "Chord Generator"
  category: 'composition' | 'analysis' | 'utility';
  icon: LucideIcon;
  version: string;
}

export const manifest: ToolManifest;
export default function Tool(props: ToolProps): JSX.Element; // mounted by the shell
```

The shell keeps a **registry** that imports each tool's manifest and lazy-loads the
component into a page/route. Adding a tool = add a package + one registry entry.

### 3.4 Shared concerns owned by `packages/`
- **theory-core:** note/interval/scale/chord math reused by chordgen, transition
  engine, and harmonics — single source of truth, no duplication. Exposes a
  **tuning context** (12-TET / equal temperament fixed for now, with a reference
  pitch) that tools can toggle/consume where relevant (Q8).
- **audio-engine:** one Web Audio context, plus **wav decode + offline analysis**
  (FFT/feature extraction over imported files) reused by waveform/spectrum/EQ tools
  and chordgen playback. Analysis runs **offline over imported wav files** — no live
  capture and no real-time pipeline required (Q4, Q10).
- **storage:** persistence to **app storage** for projects, presets, and imported
  wav samples (Q5). No cloud sync.
- **ui + tokens:** one design language and a **single dark theme** across all pages;
  no extra accessibility accommodations planned at this time (Q9).

### 3.5 Shared data model & cross-tool associations (Q6)

You want tools to share a **unified language of data** that can be refined as
relationships emerge. The `data-model` package owns that vocabulary so tools agree
on types and can pass work between each other:

- **Canonical types:** `PitchClass`, `Note`, `Interval`, `Chord`, `Progression`,
  `KeyMode`, `TuningContext`, `AudioSample` (decoded wav), `Selection`.
- **A shared "current selection" store** (a small framework-agnostic state container
  the shell provides, e.g. Zustand): the user's active key/mode/chord/progression and
  any loaded sample. Tools **read** it to seed their inputs and **write** it to publish
  results — so a chordgen progression can flow into the transition engine, and a chord
  can flow into the harmonics tool, without point-to-point coupling.
- **Refine over time:** start with the minimum (key/mode + chord + progression +
  sample) and grow the schema as real cross-tool relationships appear. Versioning the
  schema lives here too, keeping migrations in one place.

Tools must depend only on `data-model` types, never on each other directly — this is
what keeps them independently developable while still interoperable.

---

## 4. Phased roadmap

### Phase 0 — Foundation ✅ (complete)
- [x] Package manager = **pnpm**; scaffold monorepo workspaces.
- [x] Create `tokens` (dark-theme Tailwind preset), `data-model`, and `theory-core` packages.
- [x] Minimal CI: lint → typecheck → test → build (see §5.2).
- [x] Stand up an empty `apps/shell` with routing, a nav sidebar, and the tool registry.

> Implemented: pnpm workspaces (`apps/*`, `packages/*`); `@idolmancer/tokens`
> (dark Tailwind preset + typed colours), `@idolmancer/data-model` (canonical types +
> the vanilla `selectionStore`), `@idolmancer/theory-core` (pitch/scale/chord/tuning
> math with 13 passing Vitest cases); `@idolmancer/shell` (Vite + React + Tailwind,
> HashRouter, sidebar, lazy-loading tool registry). GitHub Actions runs
> lint → typecheck → test → build on every push. The `tools/*` workspace glob is
> commented out until Phase 1 adds the first tool.

### Phase 1 — Integrate the two existing tools
- [ ] Move `chordgen/` → `tools/chordgen/`; expose its manifest + default component.
- [ ] Port `transition_engine.html` → `tools/transition-engine/` as `theory-core` math +
      a React view. Add Vitest unit tests for the voice-leading/inversion logic.
- [ ] Render both inside the shell as pages. First end-to-end Tauri build (Windows 11).

### Phase 2 — Shared foundations
- [ ] Extract common theory math from chordgen + transition engine into `theory-core`
      (incl. the equal-temperament **tuning context** + toggle).
- [ ] Build the **current-selection store** and `storage` (app-storage persistence).
- [ ] Wire the first cross-tool association (chordgen progression → transition engine).
- [ ] Build the `harmonics` and `bpm-ms` tools (light, mostly theory-core + UI).

### Phase 3 — Analysis tools (offline, wav-based)
- [ ] `audio-engine`: wav import/decode + offline FFT/feature extraction (no real-time).
- [ ] `waveform`, `spectrum`, `eq-preview` reading imported wav samples from the store.

### Phase 4 — Desktop polish
- [ ] Presets, richer cross-tool data flow, settings (tuning toggle, theme).
- [ ] Tauri packaging for Windows 11 (informal distribution — no store/signing).

### Phase 5 — Android (later, full parity)
- [ ] Tauri mobile build; touch/responsive passes targeting **full feature parity**.

---

## 5. Resolved decisions

These are settled and baked into the architecture above.

| # | Question | Decision |
|---|----------|----------|
| 1 | Shell technology | **Tauri** (Windows 11 now, Android later). |
| 2 | Offline | **Offline-first / ideal** — no network dependency. |
| 3 | Backend | **Strictly client-side.** |
| 4 | Audio input | **No live capture.** Import **wav files**. |
| 5 | Persistence | **App storage.** |
| 6 | Cross-tool data | **Yes** — shared `data-model` vocabulary + "current selection" store, refined over time (see §3.5). |
| 7 | MIDI | **No Web MIDI.** (chordgen keeps file export.) |
| 8 | Tuning | **Fixed/equal temperament**, exposed as a **toggle** where a tool needs it. |
| 9 | Design / a11y | **Single dark theme**, no special accommodations now. |
| 10 | DSP | **No real-time.** Offline analysis over imported wav. |
| 11 | Distribution | **None** — personal use by you + a few others. |
| 14 | Android | **Full feature parity**, no timeline. |
| 15 | Users / scale | **Mainly a single user**, no monetization, no i18n. |

### 5.1 Tool-update propagation (Q12 — you were unsure)

Because everything lives in **one monorepo with workspaces**, there is no
cross-repo "publish" step to worry about: the shell imports each tool directly
from the workspace, so **the moment a tool's code changes, the next build of the
shell picks it up automatically.** Recommendation:

- Treat tools and `packages/*` as **internal workspace packages** referenced by
  name (e.g. `"@idolmancer/chordgen": "workspace:*"`). No registry, no submodules.
- Keep a lightweight **changelog per tool** and bump its `manifest.version` when its
  behaviour changes, so the shell can show "what's new" — but propagation itself is
  just `git pull` + build.
- _If_ a tool ever needs to be developed in a fully separate repo, add it back as a
  published private package or a git submodule then — but don't pay that complexity
  cost until there's a concrete reason. **Default: keep it all in this monorepo.**

### 5.2 Testing & CI (Q13 — you were unsure)

For a small/single-user project, aim for **high-value tests only**, not exhaustive
coverage:

- **Unit-test the pure logic** in `theory-core`, `data-model`, and the ported
  transition-engine math with **Vitest**. These are deterministic pure functions —
  cheap to test and exactly where a silent wrong answer would hurt most (a bad chord
  or voice-leading is hard to spot by eye).
- **Skip** visual/snapshot and audio-regression tests for now — low payoff at this scale.
- A minimal **CI** on each push (GitHub Actions): `lint` → `typecheck` → `test` →
  `build`. This catches breakage early and costs almost nothing to maintain.
- Revisit if/when the audience or tool count grows.

---

## 6. Immediate next steps
1. Choose package manager (**pnpm** recommended) and scaffold the monorepo (Phase 0):
   workspaces, the `data-model`/`theory-core`/`tokens` packages, the empty `apps/shell`,
   and the minimal CI from §5.2.
2. Port the transition engine to TypeScript (`theory-core` math + React view) and bring
   both existing tools into the shell as registered pages (Phase 1).
3. Stand up the shared "current selection" store and wire the first cross-tool
   association (chordgen progression → transition engine).
