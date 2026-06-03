// Tempo math: convert BPM (quarter-note beats per minute) to durations in
// milliseconds, with subdivision calculations. Pure functions for the bpm-ms tool.

export interface NoteValue {
  name: string;
  /** Length in quarter-note beats (quarter = 1). */
  beats: number;
}

export const NOTE_VALUES: readonly NoteValue[] = [
  { name: 'Whole', beats: 4 },
  { name: 'Half', beats: 2 },
  { name: 'Quarter', beats: 1 },
  { name: 'Eighth', beats: 0.5 },
  { name: 'Sixteenth', beats: 0.25 },
  { name: 'Thirty-second', beats: 0.125 },
];

/** Milliseconds per quarter note at the given tempo. */
export function quarterNoteMs(bpm: number): number {
  return 60000 / bpm;
}

/** Milliseconds for an arbitrary number of quarter-note beats. */
export function beatsToMs(bpm: number, beats: number): number {
  return quarterNoteMs(bpm) * beats;
}

export type Modifier = 'straight' | 'dotted' | 'triplet';

/** Apply a rhythmic modifier to a beat count (dotted = ×1.5, triplet = ×2/3). */
export function modifyBeats(beats: number, modifier: Modifier): number {
  if (modifier === 'dotted') return beats * 1.5;
  if (modifier === 'triplet') return beats * (2 / 3);
  return beats;
}

export interface SubdivisionRow {
  name: string;
  beats: number;
  straightMs: number;
  dottedMs: number;
  tripletMs: number;
}

/** A full table of note values at a tempo, with straight/dotted/triplet timings. */
export function subdivisionTable(bpm: number): SubdivisionRow[] {
  return NOTE_VALUES.map((v) => ({
    name: v.name,
    beats: v.beats,
    straightMs: beatsToMs(bpm, v.beats),
    dottedMs: beatsToMs(bpm, modifyBeats(v.beats, 'dotted')),
    tripletMs: beatsToMs(bpm, modifyBeats(v.beats, 'triplet')),
  }));
}

/** The frequency in Hz of the quarter-note pulse (useful for LFO/delay sync). */
export function bpmToHz(bpm: number): number {
  return bpm / 60;
}
