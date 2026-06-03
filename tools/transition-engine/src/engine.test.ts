import { describe, expect, it } from 'vitest';
import {
  analyze,
  assignInversions,
  diatonicTriad,
  generateCandidates,
  inferSource,
  parseMelody,
  pcStep,
  scaleOf,
  vlCost,
} from './engine';

describe('pitch-class helpers', () => {
  it('measures the shortest semitone distance on the circle', () => {
    expect(pcStep(0, 0)).toBe(0);
    expect(pcStep(0, 1)).toBe(1);
    expect(pcStep(0, 11)).toBe(1); // wraps the short way
    expect(pcStep(0, 6)).toBe(6);
  });

  it('builds diatonic triads of C major', () => {
    const cMajor = scaleOf(0, 'Ionian');
    expect(diatonicTriad(cMajor, 0)).toMatchObject({ pcs: [0, 4, 7], quality: 'maj' }); // I
    expect(diatonicTriad(cMajor, 1)).toMatchObject({ pcs: [2, 5, 9], quality: 'min' }); // ii
    expect(diatonicTriad(cMajor, 6)).toMatchObject({ pcs: [11, 2, 5], quality: 'dim' }); // vii°
  });
});

describe('voice-leading cost', () => {
  it('is zero for identical chords', () => {
    expect(vlCost([0, 4, 7], [0, 4, 7])).toBe(0);
  });

  it('finds the cheapest voice assignment regardless of order', () => {
    // C major -> G major: common tone G (0 cost), E->D (2 semitones), C->B (1).
    expect(vlCost([0, 4, 7], [7, 11, 2])).toBe(3);
  });
});

describe('candidate generation', () => {
  it('always offers the functional dominant of the target', () => {
    const { candidates } = generateCandidates(0, 'Ionian', 2, 'Dorian');
    const dom = candidates.find((c) => c.tag === 'functional');
    expect(dom).toBeDefined();
    // V7 of D = A7 = [9, 1, 4, 7]
    expect(dom?.pcs).toEqual([9, 1, 4, 7]);
    expect(dom?.roman).toBe('V⁷');
  });

  it('flags the absent leading tone for a modal target', () => {
    const dorian = generateCandidates(0, 'Ionian', 2, 'Dorian');
    expect(dorian.targetHasLT).toBe(false); // Dorian has a ♭7 subtonic
    const ionian = generateCandidates(7, 'Ionian', 0, 'Ionian');
    expect(ionian.targetHasLT).toBe(true);
  });
});

describe('inversion assignment', () => {
  it('pins the source, cadence, and tonic to root position', () => {
    const { candidates } = generateCandidates(0, 'Ionian', 0, 'Ionian');
    const c = candidates[0];
    const invs = assignInversions(c.chain);
    c.chain.forEach((step, i) => {
      if (step.source || step.tonic || step.cadence) {
        expect(invs[i].ti).toBe(0); // root position
      }
    });
  });
});

describe('inference and parsing', () => {
  it('parses sharps, flats, and unicode accidentals to pitch classes', () => {
    expect(parseMelody('C E G')).toEqual([0, 4, 7]);
    expect(parseMelody('Bb, Db')).toEqual([10, 1]);
    expect(parseMelody('F♯ E♭')).toEqual([6, 3]);
  });

  it('infers a plausible tonic that ends the fragment', () => {
    const ranking = inferSource(parseMelody('C D E F G A B C'));
    expect(ranking[0].tonic).toBe(0); // C
    expect(ranking[0].mode).toBe('Ionian');
  });
});

describe('analyze (top level)', () => {
  it('returns connectors sorted by weighted score', () => {
    const result = analyze({
      sourceTonic: 0,
      sourceMode: 'Ionian',
      targetTonic: 2,
      targetMode: 'Dorian',
      melody: 'E G',
      weights: { smoothness: 50, directness: 50, modality: 70, melody: 60 },
    });
    expect(result.connectors.length).toBeGreaterThan(0);
    for (let i = 1; i < result.connectors.length; i++) {
      expect(result.connectors[i - 1].total).toBeGreaterThanOrEqual(result.connectors[i].total);
    }
  });

  it('overrides the source when inferring from the melody', () => {
    const result = analyze({
      sourceTonic: 0,
      sourceMode: 'Ionian',
      targetTonic: 5,
      targetMode: 'Ionian',
      melody: 'A B C# D E',
      weights: { smoothness: 50, directness: 50, modality: 50, melody: 50 },
      inferFromMelody: true,
      inferIndex: 0,
    });
    expect(result.source.inferred).toBe(true);
    expect(result.inference?.ranking.length).toBeGreaterThan(0);
  });
});
