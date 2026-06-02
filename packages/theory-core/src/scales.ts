import type { PitchClass, ScaleName } from '@idolmancer/data-model';
import { normalizePitchClass } from './pitch';

/** Semitone offsets from the tonic for each supported scale/mode. */
export const SCALE_PATTERNS: Record<ScaleName, readonly number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  'Natural Minor': [0, 2, 3, 5, 7, 8, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Locrian: [0, 1, 3, 5, 6, 8, 10],
};

/** The pitch classes of a scale, starting from the tonic. */
export function scalePitchClasses(tonic: PitchClass, scale: ScaleName): PitchClass[] {
  return SCALE_PATTERNS[scale].map((offset) => normalizePitchClass(tonic + offset));
}
