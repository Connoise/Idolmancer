import type { ChordQuality, PitchClass } from '@idolmancer/data-model';
import { normalizePitchClass } from './pitch';

/** Semitone intervals from the root for each supported chord quality. */
export const CHORD_INTERVALS: Record<ChordQuality, readonly number[]> = {
  Major: [0, 4, 7],
  Minor: [0, 3, 7],
  Diminished: [0, 3, 6],
  Augmented: [0, 4, 8],
  Major7: [0, 4, 7, 11],
  Minor7: [0, 3, 7, 10],
  Dominant7: [0, 4, 7, 10],
};

/** The pitch classes of a chord, starting from the root. */
export function chordPitchClasses(root: PitchClass, quality: ChordQuality): PitchClass[] {
  return CHORD_INTERVALS[quality].map((interval) => normalizePitchClass(root + interval));
}
