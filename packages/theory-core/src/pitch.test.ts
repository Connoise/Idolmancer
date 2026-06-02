import { describe, expect, it } from 'vitest';
import { noteToMidi, pitchClassFromName, pitchClassName } from './index';

describe('pitch', () => {
  it('names pitch classes and wraps the octave', () => {
    expect(pitchClassName(0)).toBe('C');
    expect(pitchClassName(11)).toBe('B');
    expect(pitchClassName(12)).toBe('C');
    expect(pitchClassName(-1)).toBe('B');
  });

  it('parses sharp and flat spellings to the same pitch class', () => {
    expect(pitchClassFromName('C#')).toBe(1);
    expect(pitchClassFromName('Db')).toBe(1);
    expect(pitchClassFromName('Bb')).toBe(10);
  });

  it('throws on an unknown name', () => {
    expect(() => pitchClassFromName('H')).toThrow();
  });

  it('places A4 at MIDI 69 and C4 at MIDI 60', () => {
    expect(noteToMidi(9, 4)).toBe(69);
    expect(noteToMidi(0, 4)).toBe(60);
  });
});
