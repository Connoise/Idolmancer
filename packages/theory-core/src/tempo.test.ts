import { describe, expect, it } from 'vitest';
import { beatsToMs, bpmToHz, quarterNoteMs, subdivisionTable } from './index';

describe('tempo', () => {
  it('converts BPM to a quarter-note duration', () => {
    expect(quarterNoteMs(120)).toBe(500);
    expect(quarterNoteMs(60)).toBe(1000);
  });

  it('scales by beat count', () => {
    expect(beatsToMs(120, 2)).toBe(1000); // half note
    expect(beatsToMs(120, 0.5)).toBe(250); // eighth note
  });

  it('builds a subdivision table with dotted and triplet timings', () => {
    const table = subdivisionTable(120);
    const quarter = table.find((r) => r.name === 'Quarter');
    expect(quarter).toMatchObject({ straightMs: 500, dottedMs: 750 });
    expect(quarter?.tripletMs).toBeCloseTo(333.33, 1);
  });

  it('expresses the pulse as a frequency', () => {
    expect(bpmToHz(120)).toBe(2);
  });
});
