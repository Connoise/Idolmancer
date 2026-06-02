import { describe, expect, it } from 'vitest';
import { scalePitchClasses } from './index';

describe('scales', () => {
  it('builds C major', () => {
    expect(scalePitchClasses(0, 'Major')).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('builds A natural minor and wraps past B', () => {
    expect(scalePitchClasses(9, 'Natural Minor')).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });

  it('builds D Dorian', () => {
    expect(scalePitchClasses(2, 'Dorian')).toEqual([2, 4, 5, 7, 9, 11, 0]);
  });
});
