// Canonical data vocabulary for Idolmancer. Every tool depends on these types
// (and never on another tool directly), which is what lets tools interoperate
// while staying independently developable. This schema starts minimal and grows
// as real cross-tool relationships emerge.

/** A pitch class as an integer 0–11 (C=0 … B=11), enharmonics collapsed. */
export type PitchClass = number;

/** A concrete pitch: a pitch class plus a scientific-pitch octave (C4 = middle C). */
export interface Note {
  pitchClass: PitchClass;
  octave: number;
}

export type ChordQuality =
  | 'Major'
  | 'Minor'
  | 'Diminished'
  | 'Augmented'
  | 'Major7'
  | 'Minor7'
  | 'Dominant7';

export interface Chord {
  root: PitchClass;
  quality: ChordQuality;
}

export type ScaleName =
  | 'Major'
  | 'Natural Minor'
  | 'Dorian'
  | 'Phrygian'
  | 'Lydian'
  | 'Mixolydian'
  | 'Locrian';

export interface KeyMode {
  tonic: PitchClass;
  scale: ScaleName;
}

export interface Progression {
  chords: Chord[];
}

export type ThemeName = 'dark';

/** App-wide settings, persisted across sessions. */
export interface Settings {
  /** Equal-temperament reference pitch (A4) in Hz. */
  referenceA4: number;
  theme: ThemeName;
}

/**
 * Tuning context. Equal temperament is fixed for now; tools that care about
 * absolute frequency can read the reference pitch and may expose a toggle.
 */
export interface TuningContext {
  /** Frequency of A4 in Hz (typically 440). */
  referenceA4: number;
}

/** A decoded audio sample imported from a wav file (no live capture). */
export interface AudioSample {
  name: string;
  sampleRate: number;
  channelData: Float32Array[];
}

// ── Tool contract ──────────────────────────────────────────────────────────
// The framework-agnostic half of a tool's public interface. The matching React
// component is registered by the shell (which owns the React dependency).

export type ToolCategory = 'composition' | 'analysis' | 'utility';

export interface ToolManifest {
  /** Stable, URL-safe identifier, e.g. "chordgen". */
  id: string;
  /** Human-readable name shown in navigation. */
  name: string;
  category: ToolCategory;
  /** Semver of the tool, surfaced in the shell for "what's new". */
  version: string;
  /** Optional icon name (resolved to an icon component by the shell). */
  icon?: string;
}
