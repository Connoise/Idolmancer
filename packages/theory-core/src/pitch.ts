import type { PitchClass } from '@idolmancer/data-model';

/** Sharp spellings of the twelve pitch classes, index = pitch class. */
export const PITCH_CLASS_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;

/** Flat spellings of the twelve pitch classes, index = pitch class. */
export const PITCH_CLASS_NAMES_FLAT = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
] as const;

export type PitchClassName = (typeof PITCH_CLASS_NAMES)[number];

const NAME_TO_PITCH_CLASS: Record<string, PitchClass> = {
  C: 0,
  'C#': 1, Db: 1,
  D: 2,
  'D#': 3, Eb: 3,
  E: 4,
  F: 5,
  'F#': 6, Gb: 6,
  G: 7,
  'G#': 8, Ab: 8,
  A: 9,
  'A#': 10, Bb: 10,
  B: 11,
};

/** Normalise any integer to a pitch class in the range 0–11. */
export function normalizePitchClass(value: number): PitchClass {
  return ((value % 12) + 12) % 12;
}

/** Parse a note name (sharps or flats) into a pitch class. */
export function pitchClassFromName(name: string): PitchClass {
  const pc = NAME_TO_PITCH_CLASS[name];
  if (pc === undefined) {
    throw new Error(`Unknown pitch class name: "${name}"`);
  }
  return pc;
}

/** The sharp-spelled name of a pitch class. */
export function pitchClassName(pc: PitchClass): PitchClassName {
  return PITCH_CLASS_NAMES[normalizePitchClass(pc)];
}

/** Convert a pitch class + scientific octave to a MIDI note number (A4 = 69). */
export function noteToMidi(pitchClass: PitchClass, octave: number): number {
  return (octave + 1) * 12 + normalizePitchClass(pitchClass);
}

/**
 * Shortest distance in semitones between two pitch classes around the 12-tone
 * circle (0–6). The core voice-leading primitive shared across tools.
 */
export function pcStep(a: number, b: number): number {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
}
