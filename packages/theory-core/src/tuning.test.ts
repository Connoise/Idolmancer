import { describe, expect, it } from 'vitest';
import { midiToFrequency, noteToMidi } from './index';

describe('tuning', () => {
  it('puts A4 at the reference 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440);
  });

  it('doubles frequency one octave up', () => {
    expect(midiToFrequency(noteToMidi(9, 5))).toBeCloseTo(880);
  });

  it('respects a custom reference pitch', () => {
    expect(midiToFrequency(69, { referenceA4: 432 })).toBeCloseTo(432);
  });
});
