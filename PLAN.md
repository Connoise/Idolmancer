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

> _This is the recommended default. The shell choice (Tauri vs Electron vs plain PWA)
> is **Open Question #1** below — it is reversible early and worth confirming._

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
│  ├─ theory-core/        # shared music-theory math (scales, chords, pitch classes)
│  ├─ audio-engine/       # shared Web Audio helpers (playback, analyser, transport)
│  ├─ ui/                 # shared React components (controls, panels, piano, meters)
│  └─ tokens/             # design tokens / Tailwind preset (one visual language)
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
  engine, and harmonics — single source of truth, no duplication.
- **audio-engine:** one Web Audio context, transport, playback, and an `AnalyserNode`
  pipeline reused by waveform/spectrum/EQ tools and chordgen playback.
- **ui + tokens:** one design language and theme (dark mode) across all pages.

---

## 4. Phased roadmap

### Phase 0 — Foundation
- [ ] Decide shell (confirm Open Q #1) and package manager (pnpm recommended).
- [ ] Scaffold monorepo (workspaces), shared `tokens` Tailwind preset, CI (lint + test + build).
- [ ] Stand up an empty `apps/shell` with routing, a nav sidebar, and the tool registry.

### Phase 1 — Integrate the two existing tools
- [ ] Move `chordgen/` → `tools/chordgen/`; expose its manifest + default component.
- [ ] Port `transition_engine.html` → `tools/transition-engine/` as `theory-core` math +
      a React view. Add unit tests for the voice-leading/inversion logic.
- [ ] Render both inside the shell as pages. First end-to-end build of the desktop app.

### Phase 2 — Shared foundations
- [ ] Extract common theory math from chordgen + transition engine into `theory-core`.
- [ ] Build `audio-engine` (shared context, transport, analyser).
- [ ] Build the `harmonics` and `bpm-ms` tools (light, mostly theory-core + UI).

### Phase 3 — Analysis tools
- [ ] `waveform`, `spectrum`, `eq-preview` on top of `audio-engine`.
- [ ] Audio file import + (if confirmed) live input capture.

### Phase 4 — Desktop polish & release
- [ ] Persistence/presets, cross-tool data flow, settings (tuning, theme).
- [ ] Packaging, code signing, installer, auto-update for Windows 11.

### Phase 5 — Android (later)
- [ ] Tauri mobile build; touch/responsive passes; decide feature parity (Open Q #14).

---

## 5. Open questions (to confirm before/while building)

> These are the questions whose answers most shape the architecture. Defaults
> reflect the recommendations above; confirming or overriding them is the next step.

1. **Shell technology** — Tauri v2 (recommended), Electron, or plain PWA? This sets the desktop **and** Android path.
2. **Offline-first?** — Must every tool work with zero network? (Assumed: yes.)
3. **Backend?** — Is anything allowed to require a server/cloud service, or strictly client-side? (Assumed: strictly client-side.)
4. **Audio input scope** — Do the analysis tools need **live mic/line capture**, or only imported files? Which file formats (wav/mp3/flac/aiff)?
5. **Persistence** — Where do user projects/presets live: app storage, user-chosen files, and/or cloud sync across devices?
6. **Cross-tool data flow** — Should one tool's output feed another (e.g. a chordgen progression → transition engine → harmonics)? Do we need a shared "current project/selection" state?
7. **MIDI** — Beyond chordgen's file export, do you want **Web MIDI** device in/out? Any DAW/VST integration?
8. **Tuning system** — Fixed 12-TET at A=440, or adjustable reference pitch / alternate temperaments / microtonal support? (Critical for the harmonics tool.)
9. **Design & accessibility** — Is there a brand/visual identity for "Idolmancer"? Dark mode only or themeable? Any accessibility targets (keyboard, contrast, screen reader)?
10. **DSP performance targets** — Acceptable to do all FFT/analysis in-browser (Web Audio + WASM)? Target sample rate, FFT size, and latency for real-time spectrum/waveform?
11. **Distribution** — How do you want to ship Windows builds: standalone installer, MSIX, or Microsoft Store? Code signing certificate available? Auto-update wanted? License (proprietary vs open source)?
12. **Tool coupling/versioning** — Should tools live in **this monorepo** (recommended) or stay as separate repos pulled in via git submodules / a private npm registry? How should a tool update propagate to the shell?
13. **Testing & CI expectations** — How much do you want: unit tests for theory/DSP math, visual/snapshot tests, audio regression tests, automated builds per PR?
14. **Android scope** — When mobile arrives: full feature parity or a curated subset? Touch-first redesign or responsive reuse of the desktop UI? Rough timeline.
15. **Users & scale** — Single local user forever, or eventual accounts/sync? Any monetization/licensing? Internationalization needed?

---

## 6. Immediate next steps
1. Get answers to the Open Questions (especially #1, #4, #8, #11).
2. Choose package manager and scaffold the monorepo (Phase 0).
3. Port the transition engine to TypeScript and bring both existing tools into the shell (Phase 1).
