// Harmonic Transition Engine — pure computational core.
//
// Ported verbatim (in behaviour) from the original single-file HTML prototype
// into a typed, DOM-free module. Everything is computed in pitch-class space
// (0–11, enharmonics collapsed); the "spelled layer" lives in the prose fields
// of each candidate. The React view renders the structured result this returns.

import { pcStep } from '@idolmancer/theory-core';

// Re-exported so the rest of the engine (and the view) keep a single import site.
export { pcStep };

export const PC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const PC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_TO_PC: Record<string, number> = {
  C: 0, 'B#': 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, FB: 4, F: 5, 'E#': 5,
  'F#': 6, GB: 6, G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11, CB: 11,
};

export const MODES = {
  Ionian: [0, 2, 4, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Aeolian: [0, 2, 3, 5, 7, 8, 10],
  Locrian: [0, 1, 3, 5, 6, 8, 10],
} as const;

export type ModeName = keyof typeof MODES;
export const MODE_ORDER: ModeName[] = [
  'Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian',
];

// flat-side keys spell with flats; otherwise sharps
const FLAT_TONICS = new Set([5, 10, 3, 8, 1, 6]); // F Bb Eb Ab Db Gb
export function speller(tonicPc: number): string[] {
  return FLAT_TONICS.has(tonicPc) ? PC_FLAT : PC_SHARP;
}

const ROMAN_MAJOR: Record<number, string> = { 0: 'I', 2: 'II', 4: 'III', 5: 'IV', 7: 'V', 9: 'VI', 11: 'VII' };
const ROMAN_ALT: Record<number, string> = { 1: '♭II', 3: '♭III', 6: '♯IV', 8: '♭VI', 10: '♭VII' };

export function scaleOf(tonic: number, mode: ModeName): number[] {
  return MODES[mode].map((i) => (tonic + i) % 12);
}

type Quality = 'maj' | 'min' | 'dim' | 'aug' | '?';

function triadQuality(t: number, f: number): Quality {
  if (t === 4 && f === 7) return 'maj';
  if (t === 3 && f === 7) return 'min';
  if (t === 3 && f === 6) return 'dim';
  if (t === 4 && f === 8) return 'aug';
  return '?';
}

interface Triad {
  pcs: number[];
  root: number;
  quality: Quality;
}

export function diatonicTriad(scale: number[], deg: number): Triad {
  const r = scale[deg];
  const th = scale[(deg + 2) % 7];
  const fi = scale[(deg + 4) % 7];
  return { pcs: [r, th, fi], root: r, quality: triadQuality((th - r + 12) % 12, (fi - r + 12) % 12) };
}

export function roman(relRoot: number, quality: Quality | string): string {
  let base = ROMAN_MAJOR[relRoot] || ROMAN_ALT[relRoot] || '?';
  if (quality === 'min') base = base.toLowerCase();
  else if (quality === 'dim') base = base.toLowerCase() + '°';
  else if (quality === 'aug') base = base + '+';
  return base;
}

export function nameChord(pcs: number[], tonicPc: number): string {
  const sp = speller(tonicPc);
  return pcs.map((p) => sp[p]).join('–');
}

/* ---- voice-leading: minimal total semitone motion between equal-size sets ---- */
function perms(a: number[]): number[][] {
  if (a.length <= 1) return [a];
  const o: number[][] = [];
  for (let i = 0; i < a.length; i++) {
    const r = a.slice(0, i).concat(a.slice(i + 1));
    for (const p of perms(r)) o.push([a[i], ...p]);
  }
  return o;
}

export function vlCost(A: number[], B: number[]): number {
  let best = Infinity;
  for (const p of perms(B)) {
    let s = 0;
    for (let i = 0; i < A.length; i++) s += pcStep(A[i], p[i]);
    best = Math.min(best, s);
  }
  return best;
}

/* ---- chain building ---- */
const MINOR_MODES = new Set<ModeName>(['Dorian', 'Phrygian', 'Aeolian', 'Locrian']);
function isMinorMode(m: ModeName): boolean {
  return MINOR_MODES.has(m);
}
function tonicRoman(mode: ModeName): string {
  return mode === 'Locrian' ? 'i°' : isMinorMode(mode) ? 'i' : 'I';
}

export interface ChainStep {
  pcs: number[];
  roman: string;
  name: string;
  source?: boolean;
  connector?: boolean;
  tonic?: boolean;
  cadence?: boolean;
  predom?: boolean;
}

function predominantOptions(tScale: number[], tT: number): { ii: ChainStep; iv: ChainStep } {
  const mk = (deg: number): ChainStep => {
    const ch = diatonicTriad(tScale, deg);
    return { pcs: ch.pcs, roman: roman(((ch.root - tT) + 12) % 12, ch.quality), name: 'predominant', predom: true };
  };
  return { ii: mk(1), iv: mk(3) };
}

function targetCadence(tT: number, tMode: ModeName, hasLT: boolean): ChainStep & { functional?: boolean } {
  if (hasLT) {
    return { pcs: [(tT + 7) % 12, (tT + 11) % 12, (tT + 2) % 12], roman: 'V⁷', name: 'dominant', functional: true };
  }
  const root = tMode === 'Phrygian' || tMode === 'Locrian' ? tT + 1 : tT + 10; // ♭II for Phrygian/Locrian, else ♭VII
  return {
    pcs: [root % 12, (root + 4) % 12, (root + 7) % 12],
    roman: tMode === 'Phrygian' || tMode === 'Locrian' ? '♭II' : '♭VII',
    name: 'modal cadence',
    functional: false,
  };
}

function dominantTriad(tT: number): ChainStep {
  return { pcs: [(tT + 7) % 12, (tT + 11) % 12, (tT + 2) % 12], roman: 'V', name: 'dominant' };
}

interface ChainCtx {
  srcStep: ChainStep;
  predom: ChainStep;
  cadence: ChainStep;
  tonicStep: ChainStep;
  tT: number;
}

function buildChain(c: Candidate, ctx: ChainCtx): ChainStep[] {
  const { srcStep, predom, cadence, tonicStep, tT } = ctx;
  const conn: ChainStep = { pcs: c.pcs.slice(0, 3), roman: c.roman, name: c.name, connector: true };
  switch (c.tag) {
    case 'functional': // source → predominant → V⁷(this connector) → I
      return [srcStep, predom, { ...conn, roman: 'V⁷', pcs: c.pcs.slice(0, 4), cadence: true }, tonicStep];
    case 'characteristic': // source → predominant → modal cadence(this connector) → i
      return [srcStep, predom, { ...conn, cadence: true }, tonicStep];
    case 'spelled-fork': // source → aug6(this connector) → V → I
      return [srcStep, conn, { ...dominantTriad(tT), cadence: true }, tonicStep];
    default: // pivot / colour: source → connector → predominant → cadence → tonic
      return [srcStep, conn, predom, { ...cadence, cadence: true }, tonicStep];
  }
}

/* ---- inversion assignment (Viterbi DP over the chain) ---- */
const TRIAD_FIG = ['5/3', '6', '6/4'];
const TRIAD_INV = ['root', '1st inv', '2nd inv'];
const TRIAD_PEN = [0, 0.25, 1.4];
const SEV_FIG = ['7', '6/5', '4/3', '4/2'];
const SEV_INV = ['root', '1st inv', '2nd inv', '3rd inv'];
const SEV_PEN = [0, 0.3, 0.6, 0.85];

export interface InvChoice {
  pc: number;
  ti: number;
  figure: string;
  inv: string;
  pen: number;
}

export function assignInversions(chain: ChainStep[]): InvChoice[] {
  const opts: InvChoice[][] = chain.map((s) => {
    const pin = s.source || s.tonic || s.cadence; // forced to root position
    const seventh = s.pcs.length === 4;
    const out: InvChoice[] = [];
    s.pcs.forEach((pc, ti) => {
      if (pin && ti !== 0) return;
      out.push({
        pc,
        ti,
        figure: seventh ? SEV_FIG[ti] : TRIAD_FIG[ti],
        inv: seventh ? SEV_INV[ti] : TRIAD_INV[ti],
        pen: seventh ? SEV_PEN[ti] : TRIAD_PEN[ti],
      });
    });
    return out;
  });
  const N = opts.length;
  const dp = opts.map((o) => o.map(() => Infinity));
  const back = opts.map((o) => o.map(() => -1));
  opts[0].forEach((o, j) => (dp[0][j] = o.pen));
  for (let i = 1; i < N; i++) {
    opts[i].forEach((o, j) => {
      opts[i - 1].forEach((p, k) => {
        const cost = dp[i - 1][k] + pcStep(p.pc, o.pc) + o.pen;
        if (cost < dp[i][j]) {
          dp[i][j] = cost;
          back[i][j] = k;
        }
      });
    });
  }
  let bj = 0;
  dp[N - 1].forEach((v, j) => {
    if (v < dp[N - 1][bj]) bj = j;
  });
  const chosen = new Array<InvChoice>(N);
  let cur = bj;
  for (let i = N - 1; i >= 0; i--) {
    chosen[i] = opts[i][cur];
    cur = back[i][cur];
  }
  return chosen;
}

/* ---- candidate generation ---- */
type Tag = 'functional' | 'characteristic' | 'pivot' | 'colour' | 'spelled-fork';

export interface Candidate {
  name: string;
  tag: Tag;
  pcs: number[];
  quality?: Quality;
  roman: string;
  directness: number;
  modality: number;
  spell: string;
  why: string;
  relRoot: number;
  chain: ChainStep[];
  predomUsed: string | null;
  inversions: InvChoice[];
  smoothness: number;
  _vl: number;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export interface CandidateSet {
  candidates: Candidate[];
  tScale: number[];
  sScale: number[];
  tSet: Set<number>;
  sSet: Set<number>;
  targetHasLT: boolean;
  tonicPcs: number[];
  overlap: number;
}

export function generateCandidates(sT: number, sMode: ModeName, tT: number, tMode: ModeName): CandidateSet {
  const sScale = scaleOf(sT, sMode);
  const tScale = scaleOf(tT, tMode);
  const tSet = new Set(tScale);
  const sSet = new Set(sScale);
  const targetTonicTriad = diatonicTriad(tScale, 0);
  const tonicPcs = targetTonicTriad.pcs;
  const targetHasLT = tSet.has((tT + 11) % 12); // natural leading tone present?

  // Partial candidates as authored, completed with chain/scoring below.
  type RawCandidate = Omit<Candidate, 'relRoot' | 'chain' | 'predomUsed' | 'inversions' | 'smoothness' | '_vl'> &
    Partial<Pick<Candidate, 'relRoot'>>;
  const C: RawCandidate[] = [];

  const major = (r: number) => [r % 12, (r + 4) % 12, (r + 7) % 12];
  const dom7 = (r: number) => [r % 12, (r + 4) % 12, (r + 7) % 12, (r + 10) % 12];

  function add(o: RawCandidate) {
    o.relRoot = ((o.pcs[0] - tT) + 12) % 12;
    o.roman = o.roman || roman(o.relRoot, o.quality || 'maj');
    C.push(o);
  }

  // 1 — Functional dominant of target
  add({
    name: 'Functional dominant', tag: 'functional', pcs: dom7(tT + 7), quality: 'maj', roman: 'V⁷',
    directness: 1.0,
    modality: targetHasLT ? 0.9 : 0.18,
    spell:
      `Spelled as a dominant seventh: the third is a leading tone resolving up a semitone to the new tonic, the seventh resolving down. ` +
      (targetHasLT
        ? `${tMode} contains that leading tone, so this is both functional and native.`
        : `${tMode} has a ♭7 subtonic, not a leading tone — playing V⁷ imports a foreign sharpened 7th and the ear will hear major/minor, not ${tMode}. Strong, but it overwrites the mode.`),
    why: `The tritone + leading-tone pull forces any target. Maximally <b>direct</b>; ${targetHasLT ? 'mode-safe here' : 'mode-erasing here'}.`,
  });

  // 2 — Mode-characteristic cadence(s)
  const modal: Record<ModeName, { r: number; q: Quality; rn: string; deg: string; txt: string }[]> = {
    Ionian: [],
    Lydian: [{ r: tT + 2, q: 'maj', rn: 'II', deg: '♯4', txt: 'The major II carries Lydian’s raised fourth into the cadence — the one note that separates Lydian from Ionian.' }],
    Mixolydian: [{ r: tT + 10, q: 'maj', rn: '♭VII', deg: '♭7', txt: 'The ♭VII→I step is Mixolydian’s signature; it cadences with no leading tone, preserving the ♭7.' }],
    Dorian: [
      { r: tT + 10, q: 'maj', rn: '♭VII', deg: '♮6/♭7', txt: '♭VII→i keeps the subtonic; pair with the bright major IV to expose Dorian’s natural 6.' },
      { r: tT + 5, q: 'maj', rn: 'IV', deg: '♮6', txt: 'The major IV is Dorian’s tell — it contains the natural sixth that distinguishes it from Aeolian.' },
    ],
    Aeolian: [{ r: tT + 10, q: 'maj', rn: '♭VII', deg: '♭7', txt: '♭VII→i (often via ♭VI–♭VII–i) is the natural-minor cadence — no raised 7th, mode intact.' }],
    Phrygian: [{ r: tT + 1, q: 'maj', rn: '♭II', deg: '♭2', txt: 'The Phrygian cadence: ♭II→i, the ♭2 collapsing a half-step onto the tonic. Its most identifying gesture.' }],
    Locrian: [{ r: tT + 1, q: 'maj', rn: '♭II', deg: '♭2/♭5', txt: 'Locrian’s tonic is a diminished triad and resists tonicization; ♭II is the least unstable approach, but expect the centre to feel provisional.' }],
  };
  (modal[tMode] || []).forEach((m) => {
    add({
      name: `Modal cadence · ${m.deg}`, tag: 'characteristic', pcs: major(m.r), quality: m.q, roman: m.rn,
      directness: 0.6, modality: 1.0,
      spell: `Native to ${tMode}. ${m.txt}`,
      why: `Cadences using the mode’s characteristic degree (<b>${m.deg}</b>) — strongest possible <b>modality preservation</b>.`,
    });
  });

  // 3 — Common-tone pivots (chords diatonic to BOTH collections)
  const both: Triad[] = [];
  for (let d = 0; d < 7; d++) {
    const ch = diatonicTriad(tScale, d);
    if (ch.pcs.every((p) => sSet.has(p))) both.push(ch);
  }
  both.slice(0, 2).forEach((ch) => {
    add({
      name: 'Common-tone pivot', tag: 'pivot', pcs: ch.pcs, quality: ch.quality,
      roman: roman(((ch.root - tT) + 12) % 12, ch.quality),
      directness: 0.35, modality: 0.72,
      spell: `This triad belongs to both ${PC_SHARP[sT]} ${sMode} and ${PC_SHARP[tT]} ${tMode}; it is reinterpreted without any voice moving. Smoothest possible hinge.`,
      why: `Shared by both collections — pivot beneath it and reassign its function. Low friction, low <b>directness</b>.`,
    });
  });

  // 4 — Chromatic mediant
  add({
    name: 'Chromatic mediant · ♭VI', tag: 'colour', pcs: major(tT + 8), quality: 'maj', roman: '♭VI',
    directness: 0.4, modality: 0.7,
    spell: `Shares a single common tone with the tonic; the other voices shift by step. No functional leading tone is asserted, so the mode is left untouched — colour without commitment.`,
    why: `A third-related chord linked by one held tone — surprising yet smooth. Often pairs with a single sustained melody note.`,
  });

  // 5 — Neapolitan (skip if it duplicates a modal ♭II already added)
  if (!C.some((c) => c.roman === '♭II')) {
    add({
      name: 'Neapolitan', tag: 'colour', pcs: major(tT + 1), quality: 'maj', roman: '♭II',
      directness: 0.62, modality: 0.6,
      spell: `A ♭II major chord, conventionally in first inversion, sliding to the dominant of the target. Chromatic predominant — strong push, mild mode tint.`,
      why: `A flat-second predominant — colourful approach with real cadential drive.`,
    });
  }

  // 6 — Augmented sixth (spelled-layer demonstration)
  add({
    name: 'Augmented sixth', tag: 'spelled-fork', pcs: [(tT + 8) % 12, tT % 12, (tT + 6) % 12], quality: 'maj', roman: 'It⁺⁶→V',
    directness: 0.8, modality: 0.48,
    spell: `Enharmonically identical to a dominant seventh — same keys on the piano — but spelled with an augmented sixth (♭6 and ♯4) that <i>expands outward</i> to the dominant rather than resolving down to a tonic. This is the case pitch-class space cannot see: identical sound, opposite grammar. It lives entirely in the spelled layer.`,
    why: `Predominant that levers hard into the target’s V. Demonstrates why function needs spelling: the pitch-class core would mistake this for V⁷.`,
  });

  /* ---- build a chain for each candidate; try ii vs IV; score the path ---- */
  const sTonicTriad = diatonicTriad(sScale, 0);
  const baseCtx = {
    tT,
    srcStep: { pcs: sTonicTriad.pcs, roman: tonicRoman(sMode), name: 'source tonic', source: true } as ChainStep,
    cadence: targetCadence(tT, tMode, targetHasLT),
    tonicStep: { pcs: targetTonicTriad.pcs, roman: tonicRoman(tMode), name: 'target tonic', tonic: true } as ChainStep,
  };
  const preOpts = predominantOptions(tScale, tT);
  const maxVL = 6;
  const overlap = [...tSet].filter((p) => sSet.has(p)).length;
  const chainVL = (ch: ChainStep[]): number => {
    let t = 0;
    for (let i = 0; i < ch.length - 1; i++) t += vlCost(ch[i].pcs.slice(0, 3), ch[i + 1].pcs.slice(0, 3));
    return t / (ch.length - 1);
  };

  const completed: Candidate[] = C.map((raw) => {
    const c = raw as Candidate;
    let best: { chain: ChainStep[]; vl: number; key: string; usesPre: boolean } | null = null;
    (['ii', 'iv'] as const).forEach((key) => {
      const chain = buildChain(c, { ...baseCtx, predom: preOpts[key] });
      const usesPre = chain.some((s) => s.predom);
      const vl = chainVL(chain);
      if (!best || vl < best.vl) best = { chain, vl, key, usesPre };
    });
    const resolved = best!;
    c.chain = resolved.chain;
    c.predomUsed = resolved.usesPre ? resolved.key : null;
    c.inversions = assignInversions(c.chain);
    c.smoothness = clamp01(0.62 * (1 - resolved.vl / maxVL) + 0.38 * (overlap / 7));
    c._vl = resolved.vl;
    return c;
  });

  return { candidates: completed, tScale, sScale, tSet, sSet, targetHasLT, tonicPcs, overlap };
}

/* ---- melody fit, distributed across the chain ---- */
function noteFit(m: number, chordPcs: number[], tSet: Set<number>, tonicPcs: number[]): number {
  const chord = new Set(chordPcs);
  if (chord.has(m)) return 1.0; // chord tone
  if ([...chord].some((c) => pcStep(c, m) === 2)) return 0.7; // 9th / colour tension
  if ([...chord, ...tonicPcs].some((c) => pcStep(c, m) === 1)) return 0.6; // resolves by semitone
  if (tSet.has(m)) return 0.45; // diatonic non-chord tone
  return 0.2; // foreign clash
}

export interface MelodyPair {
  pc: number;
  stepIdx: number;
  fit: number;
}

export function melodyFitChain(
  chain: ChainStep[],
  melodyPcs: number[],
  tSet: Set<number>,
  tonicPcs: number[],
): { score: number; neutral: boolean; pairs: MelodyPair[] } {
  if (melodyPcs.length === 0) return { score: 1, neutral: true, pairs: [] };
  const active = chain.slice(1); // connector … tonic
  const pairs: MelodyPair[] = [];
  let total = 0;
  melodyPcs.forEach((m, i) => {
    const idx = Math.min(i, active.length - 1);
    const f = noteFit(m, active[idx].pcs.slice(0, 3), tSet, tonicPcs);
    total += f;
    pairs.push({ pc: m, stepIdx: idx + 1, fit: f });
  });
  return { score: total / melodyPcs.length, neutral: false, pairs };
}

/* ---- inverse inference: deduce (tonic, mode) from a melody fragment ---- */
const DEG_WEIGHT: Record<number, number> = {
  0: 1.0, 7: 0.82, 4: 0.6, 3: 0.58, 5: 0.5, 9: 0.46, 2: 0.46, 11: 0.42, 10: 0.42, 8: 0.4, 6: 0.38, 1: 0.38,
};

export interface InferCandidate {
  tonic: number;
  mode: ModeName;
  score: number;
}

export function inferSource(melodyPcs: number[]): InferCandidate[] {
  if (!melodyPcs.length) return [];
  const res: InferCandidate[] = [];
  const first = melodyPcs[0];
  const last = melodyPcs[melodyPcs.length - 1];
  for (let t = 0; t < 12; t++) {
    for (const mode of MODE_ORDER) {
      const set = new Set(scaleOf(t, mode));
      let s = 0;
      melodyPcs.forEach((p) => {
        const deg = ((p - t) + 12) % 12;
        s += set.has(p) ? DEG_WEIGHT[deg] || 0.4 : -0.6; // foreign note penalised
      });
      s /= melodyPcs.length;
      if (last === t) s += 0.12; // resolves to tonic
      const fd = ((first - t) + 12) % 12;
      if (fd === 0 || fd === 7) s += 0.05; // opens on tonic/dominant
      res.push({ tonic: t, mode, score: Math.max(0, s) });
    }
  }
  res.sort((a, b) => b.score - a.score);
  return res;
}

export function parseMelody(str: string): number[] {
  return str
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((tok): number | null => {
      const t = tok.trim().toUpperCase().replace('♯', '#').replace('♭', 'B');
      if (t in NOTE_TO_PC) return NOTE_TO_PC[t];
      const m = t.match(/^([A-G])([#B]?)/);
      if (!m) return null;
      let pc = NOTE_TO_PC[m[1]];
      if (m[2] === '#') pc = (pc + 1) % 12;
      if (m[2] === 'B') pc = (pc + 11) % 12;
      return pc;
    })
    .filter((p): p is number => p !== null);
}

/* ============================================================
   Top-level analysis — DOM-free. The React view renders this.
   ============================================================ */
export interface Weights {
  smoothness: number;
  directness: number;
  modality: number;
  melody: number;
}

export interface AnalyzeParams {
  sourceTonic: number;
  sourceMode: ModeName;
  targetTonic: number;
  targetMode: ModeName;
  melody: string;
  weights: Weights;
  inferFromMelody?: boolean;
  inferIndex?: number;
}

export interface ScoredConnector extends Candidate {
  melFit: number;
  melNeutral: boolean;
  melPairs: MelodyPair[];
  total: number;
}

export interface AnalyzeResult {
  source: { tonic: number; mode: ModeName; inferred: boolean };
  target: { tonic: number; mode: ModeName };
  melodyPcs: number[];
  inference: { ranking: InferCandidate[]; selectedIndex: number } | null;
  overlap: number;
  targetHasLT: boolean;
  sharedPitchClasses: number[];
  melodyCommonTones: number[];
  connectors: ScoredConnector[];
}

export function analyze(params: AnalyzeParams): AnalyzeResult {
  const { targetTonic: tT, targetMode: tM, weights: w } = params;
  const melodyPcs = parseMelody(params.melody);

  let sT = params.sourceTonic;
  let sM = params.sourceMode;
  let inference: { ranking: InferCandidate[]; selectedIndex: number } | null = null;

  if (params.inferFromMelody) {
    const ranking = inferSource(melodyPcs);
    if (ranking.length) {
      const limit = Math.min(ranking.length, 6);
      const selectedIndex = Math.min(Math.max(params.inferIndex ?? 0, 0), limit - 1);
      sT = ranking[selectedIndex].tonic;
      sM = ranking[selectedIndex].mode;
      inference = { ranking: ranking.slice(0, 6), selectedIndex };
    } else {
      inference = { ranking: [], selectedIndex: 0 };
    }
  }

  const G = generateCandidates(sT, sM, tT, tM);
  const melodyCommonTones = melodyPcs.filter((p) => G.sSet.has(p) && G.tSet.has(p));
  const sharedPitchClasses = [...G.tSet].filter((p) => G.sSet.has(p));

  const wSum = w.smoothness + w.directness + w.modality + w.melody || 1;
  const connectors: ScoredConnector[] = G.candidates
    .map((c) => {
      const mf = melodyFitChain(c.chain, melodyPcs, G.tSet, G.tonicPcs);
      const total =
        (w.smoothness * c.smoothness + w.directness * c.directness + w.modality * c.modality + w.melody * mf.score) /
        wSum;
      return { ...c, melFit: mf.score, melNeutral: mf.neutral, melPairs: mf.pairs, total };
    })
    .sort((a, b) => b.total - a.total);

  return {
    source: { tonic: sT, mode: sM, inferred: !!params.inferFromMelody },
    target: { tonic: tT, mode: tM },
    melodyPcs,
    inference,
    overlap: G.overlap,
    targetHasLT: G.targetHasLT,
    sharedPitchClasses,
    melodyCommonTones,
    connectors,
  };
}
