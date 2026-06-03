import type { Note, PitchClass, TuningContext } from '@idolmancer/data-model';
import { noteToMidi, pitchClassName } from './pitch';
import { DEFAULT_TUNING, midiToFrequency } from './tuning';

/** Frequency in Hz of a note under the given tuning (equal temperament). */
export function noteToFrequency(note: Note, tuning: TuningContext = DEFAULT_TUNING): number {
  return midiToFrequency(noteToMidi(note.pitchClass, note.octave), tuning);
}

/** The (possibly fractional) MIDI number a frequency corresponds to. */
export function frequencyToMidi(freq: number, tuning: TuningContext = DEFAULT_TUNING): number {
  return 69 + 12 * Math.log2(freq / tuning.referenceA4);
}

export interface NearestNote {
  midi: number;
  pitchClass: PitchClass;
  octave: number;
  /** Sharp-spelled name with octave, e.g. "A4". */
  name: string;
  /** Signed deviation from equal temperament, in cents (−50…+50). */
  cents: number;
}

/** The nearest equal-tempered note to a frequency, with cents deviation. */
export function nearestNote(freq: number, tuning: TuningContext = DEFAULT_TUNING): NearestNote {
  const midiFloat = frequencyToMidi(freq, tuning);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { midi, pitchClass, octave, name: `${pitchClassName(pitchClass)}${octave}`, cents };
}

/** The harmonic series above a fundamental: f, 2f, 3f, … (count partials). */
export function harmonicSeries(fundamental: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => fundamental * (i + 1));
}

/** The sub-harmonic (undertone) series below a fundamental: f, f/2, f/3, … */
export function subharmonicSeries(fundamental: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => fundamental / (i + 1));
}
