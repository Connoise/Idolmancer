import { describe, expect, it } from 'vitest';
import { frequencyToMidi, harmonicSeries, nearestNote, noteToFrequency, subharmonicSeries } from './index';

describe('frequency', () => {
  it('computes A4 = 440 Hz and C4 ≈ 261.63 Hz', () => {
    expect(noteToFrequency({ pitchClass: 9, octave: 4 })).toBeCloseTo(440);
    expect(noteToFrequency({ pitchClass: 0, octave: 4 })).toBeCloseTo(261.626, 2);
  });

  it('round-trips frequency ↔ midi', () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69);
    expect(frequencyToMidi(880)).toBeCloseTo(81);
  });

  it('finds the nearest note with cents deviation', () => {
    expect(nearestNote(440)).toMatchObject({ name: 'A4', cents: 0 });
    const slightlySharp = nearestNote(443);
    expect(slightlySharp.name).toBe('A4');
    expect(slightlySharp.cents).toBeGreaterThan(0);
  });

  it('builds harmonic and sub-harmonic series', () => {
    expect(harmonicSeries(100, 4)).toEqual([100, 200, 300, 400]);
    expect(subharmonicSeries(600, 3)).toEqual([600, 300, 200]);
  });
});
