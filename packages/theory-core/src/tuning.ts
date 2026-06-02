import type { TuningContext } from '@idolmancer/data-model';

/** Equal temperament with A4 = 440 Hz. */
export const DEFAULT_TUNING: TuningContext = { referenceA4: 440 };

/**
 * Convert a MIDI note number to a frequency in Hz under 12-tone equal
 * temperament, relative to the tuning's reference A4 (MIDI 69).
 */
export function midiToFrequency(midi: number, tuning: TuningContext = DEFAULT_TUNING): number {
  return tuning.referenceA4 * 2 ** ((midi - 69) / 12);
}
