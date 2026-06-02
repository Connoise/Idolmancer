import { describe, expect, it } from 'vitest';
import { chordPitchClasses } from './index';

describe('chords', () => {
  it('builds a C major triad', () => {
    expect(chordPitchClasses(0, 'Major')).toEqual([0, 4, 7]);
  });

  it('builds an A minor triad with octave wrap', () => {
    expect(chordPitchClasses(9, 'Minor')).toEqual([9, 0, 4]);
  });

  it('builds a G dominant 7th', () => {
    expect(chordPitchClasses(7, 'Dominant7')).toEqual([7, 11, 2, 5]);
  });
});
