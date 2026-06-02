import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Play, Square, Volume2, Save, Download, RefreshCw, FileAudio } from 'lucide-react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { selectionStore, type ScaleName } from '@idolmancer/data-model';

const KEYS = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'] as const;
const SCALES = ['Major', 'Natural Minor', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian'] as const;
const GENRES = ['Jazz', 'Rock', 'Classical', 'Folk', 'Blues', 'Pop', 'Alternative Rock', 'Punk Rock', 'Metal', 'Indie Pop', 'Electronic Pop', 'Grunge', 'Progressive Rock', 'Hard Rock', 'Soft Rock', 'Funk', 'R&B', 'J-Pop', 'J-Rock'] as const;
const MOODS = ['Happy', 'Sad', 'Dramatic', 'Peaceful', 'Energetic', 'Mysterious', 'Romantic', 'Dark'] as const;
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_TO_SHARP: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

type Scale = (typeof SCALES)[number];

const SCALE_PATTERNS: Record<Scale, number[]> = {
  Major:           [0, 2, 4, 5, 7, 9, 11],
  'Natural Minor': [0, 2, 3, 5, 7, 8, 10],
  Dorian:          [0, 2, 3, 5, 7, 9, 10],
  Phrygian:        [0, 1, 3, 5, 7, 8, 10],
  Lydian:          [0, 2, 4, 6, 7, 9, 11],
  Mixolydian:      [0, 2, 4, 5, 7, 9, 10],
  Locrian:         [0, 1, 3, 5, 6, 8, 10],
};

const SCALE_TRIADS: Record<Scale, string[]> = {
  Major:           ['Major', 'Minor', 'Minor', 'Major', 'Major', 'Minor', 'Diminished'],
  'Natural Minor': ['Minor', 'Diminished', 'Major', 'Minor', 'Minor', 'Major', 'Major'],
  Dorian:          ['Minor', 'Minor', 'Major', 'Major', 'Minor', 'Diminished', 'Major'],
  Phrygian:        ['Minor', 'Major', 'Major', 'Minor', 'Diminished', 'Major', 'Minor'],
  Lydian:          ['Major', 'Major', 'Minor', 'Diminished', 'Major', 'Minor', 'Minor'],
  Mixolydian:      ['Major', 'Minor', 'Diminished', 'Major', 'Minor', 'Minor', 'Major'],
  Locrian:         ['Diminished', 'Major', 'Minor', 'Minor', 'Major', 'Major', 'Minor'],
};

const ROMAN_NUMERALS: Record<Scale, string[]> = {
  Major:           ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  'Natural Minor': ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
  Dorian:          ['i', 'ii', 'III', 'IV', 'v', 'vi°', 'VII'],
  Phrygian:        ['i', 'II', 'III', 'iv', 'v°', 'VI', 'vii'],
  Lydian:          ['I', 'II', 'iii', 'iv°', 'V', 'vi', 'vii'],
  Mixolydian:      ['I', 'ii', 'iii°', 'IV', 'v', 'vi', 'VII'],
  Locrian:         ['i°', 'II', 'iii', 'iv', 'V', 'VI', 'vii'],
};

type ChordTypeDef = { symbol: string; intervals: number[] };

const CHORD_TYPES: Record<string, ChordTypeDef> = {
  Major:                { symbol: '',       intervals: [0, 4, 7] },
  Minor:                { symbol: 'm',      intervals: [0, 3, 7] },
  Diminished:           { symbol: 'dim',    intervals: [0, 3, 6] },
  Augmented:            { symbol: 'aug',    intervals: [0, 4, 8] },
  'Major 6':            { symbol: '6',      intervals: [0, 4, 7, 9] },
  'Minor 6':            { symbol: 'm6',     intervals: [0, 3, 7, 9] },
  'Major 7':            { symbol: 'maj7',   intervals: [0, 4, 7, 11] },
  'Minor 7':            { symbol: 'm7',     intervals: [0, 3, 7, 10] },
  'Dominant 7':         { symbol: '7',      intervals: [0, 4, 7, 10] },
  'Minor Major 7':      { symbol: 'mMaj7',  intervals: [0, 3, 7, 11] },
  'Half Diminished 7':  { symbol: 'm7b5',   intervals: [0, 3, 6, 10] },
  'Fully Diminished 7': { symbol: 'dim7',   intervals: [0, 3, 6, 9] },
  'Major 9':            { symbol: 'maj9',   intervals: [0, 4, 7, 11, 14] },
  'Minor 9':            { symbol: 'm9',     intervals: [0, 3, 7, 10, 14] },
  'Dominant 9':         { symbol: '9',      intervals: [0, 4, 7, 10, 14] },
  'Major 11':           { symbol: 'maj11',  intervals: [0, 4, 7, 11, 14, 17] },
  'Minor 11':           { symbol: 'm11',    intervals: [0, 3, 7, 10, 14, 17] },
  'Dominant 11':        { symbol: '11',     intervals: [0, 4, 7, 10, 14, 17] },
  'Major 13':           { symbol: 'maj13',  intervals: [0, 4, 7, 11, 14, 17, 21] },
  'Minor 13':           { symbol: 'm13',    intervals: [0, 3, 7, 10, 14, 17, 21] },
  'Dominant 13':        { symbol: '13',     intervals: [0, 4, 7, 10, 14, 17, 21] },
  'Major add9':         { symbol: 'add9',   intervals: [0, 4, 7, 14] },
  'Minor add9':         { symbol: 'madd9',  intervals: [0, 3, 7, 14] },
  'Major sus2':         { symbol: 'sus2',   intervals: [0, 2, 7] },
  'Major sus4':         { symbol: 'sus4',   intervals: [0, 5, 7] },
  'Minor sus4':         { symbol: 'msus4',  intervals: [0, 5, 7] },
  'Dominant 7sus4':     { symbol: '7sus4',  intervals: [0, 5, 7, 10] },
};

interface GenrePrefs {
  preferredChords: number[];
  avoidChords: number[];
  seventhChance: number;
  extensions: string[];
  patterns: number[][];
}

const GENRE_PREFS: Record<string, GenrePrefs> = {
  Jazz: {
    preferredChords: [1, 4, 0, 6, 2, 5], avoidChords: [], seventhChance: 0.9,
    extensions: ['Major 7', 'Minor 7', 'Dominant 7', 'Major 6', 'Minor 6', 'Major 9', 'Minor 9', 'Dominant 9', 'Major 11', 'Minor 11', 'Dominant 11', 'Major 13', 'Minor 13', 'Dominant 13', 'Half Diminished 7', 'Fully Diminished 7', 'Minor Major 7', 'Dominant 7sus4'],
    patterns: [[1, 4, 0], [5, 1, 4, 0], [0, 6, 1, 4], [1, 4, 0, 6]],
  },
  Rock: {
    preferredChords: [0, 3, 5, 4], avoidChords: [6], seventhChance: 0.2,
    extensions: ['Dominant 7'],
    patterns: [[0, 3, 5, 3], [5, 3, 0, 4], [0, 4, 3, 4]],
  },
  'Alternative Rock': {
    preferredChords: [0, 5, 3, 1], avoidChords: [], seventhChance: 0.3,
    extensions: ['Dominant 7', 'Major add9', 'Major 6'],
    patterns: [[5, 3, 0, 4], [0, 1, 5, 3], [5, 0, 3, 4]],
  },
  'Punk Rock': {
    preferredChords: [0, 3, 4], avoidChords: [6, 2], seventhChance: 0.1,
    extensions: [],
    patterns: [[0, 3, 4, 4], [0, 4, 3, 4], [3, 4, 0, 0]],
  },
  Metal: {
    preferredChords: [0, 5, 3, 1], avoidChords: [], seventhChance: 0.2,
    extensions: ['Dominant 7', 'Major sus4'],
    patterns: [[5, 3, 0, 4], [0, 1, 5, 3], [1, 0, 3, 4]],
  },
  Pop: {
    preferredChords: [0, 5, 3, 4], avoidChords: [6], seventhChance: 0.3,
    extensions: ['Dominant 7', 'Major add9', 'Major 6'],
    patterns: [[0, 5, 3, 4], [5, 3, 0, 4], [0, 3, 5, 4]],
  },
  'Indie Pop': {
    preferredChords: [0, 2, 5, 3], avoidChords: [], seventhChance: 0.4,
    extensions: ['Dominant 7', 'Major add9', 'Major sus2', 'Major 6'],
    patterns: [[0, 2, 5, 3], [5, 3, 0, 2], [0, 5, 2, 3]],
  },
  'Electronic Pop': {
    preferredChords: [0, 5, 3, 1], avoidChords: [], seventhChance: 0.5,
    extensions: ['Dominant 7', 'Dominant 9', 'Major sus4', 'Major 6'],
    patterns: [[0, 1, 5, 3], [5, 3, 1, 4], [0, 5, 1, 3]],
  },
  Grunge: {
    preferredChords: [0, 5, 3, 1], avoidChords: [], seventhChance: 0.1,
    extensions: ['Dominant 7'],
    patterns: [[5, 3, 0, 4], [0, 1, 5, 3], [5, 0, 3, 1]],
  },
  'Progressive Rock': {
    preferredChords: [0, 1, 2, 3, 4, 5, 6], avoidChords: [], seventhChance: 0.6,
    extensions: ['Dominant 7', 'Major 7', 'Dominant 9', 'Dominant 11', 'Major sus4', 'Major 6'],
    patterns: [[0, 2, 5, 1, 4], [0, 6, 3, 1, 4, 0], [5, 1, 3, 6, 0]],
  },
  'Hard Rock': {
    preferredChords: [0, 3, 4, 5], avoidChords: [6], seventhChance: 0.2,
    extensions: ['Dominant 7'],
    patterns: [[0, 3, 4, 0], [0, 4, 3, 4], [5, 3, 0, 4]],
  },
  'Soft Rock': {
    preferredChords: [0, 5, 3, 2], avoidChords: [], seventhChance: 0.4,
    extensions: ['Dominant 7', 'Major 7', 'Major add9', 'Major 6'],
    patterns: [[0, 2, 5, 3], [0, 5, 3, 4], [5, 3, 2, 0]],
  },
  // J-Pop leans heavily on the "Royal Road" progression (IV-V-iii-vi) and other
  // cadences that feature the iii chord and ii-V motion borrowed from jazz.
  'J-Pop': {
    preferredChords: [0, 1, 2, 3, 4, 5], avoidChords: [6], seventhChance: 0.55,
    extensions: ['Major 7', 'Minor 7', 'Dominant 7', 'Major add9', 'Major sus2', 'Major sus4', 'Major 6', 'Minor 9'],
    patterns: [
      [3, 4, 2, 5],
      [3, 4, 2, 5, 1, 4, 0],
      [5, 3, 4, 0],
      [3, 4, 0, 5],
      [0, 4, 5, 3],
      [1, 4, 0, 5],
      [3, 2, 1, 0],
      [0, 2, 5, 3, 4],
    ],
  },
  // J-Rock blends anthemic major-key hooks with darker minor-key turns; sus4
  // colorings and dramatic vi-V-IV-I descents are signatures.
  'J-Rock': {
    preferredChords: [0, 3, 4, 5, 1], avoidChords: [], seventhChance: 0.35,
    extensions: ['Dominant 7', 'Major sus4', 'Major add9', 'Major sus2', 'Minor 7'],
    patterns: [
      [0, 4, 5, 3],
      [5, 3, 0, 4],
      [5, 4, 3, 0],
      [3, 4, 5, 0],
      [5, 3, 1, 4],
      [0, 5, 3, 4],
      [3, 4, 2, 5],
      [5, 4, 0, 3],
    ],
  },
};

const VOICE_LEADING: Record<number, number[]> = {
  0: [3, 5, 1, 2, 4],
  1: [4, 0, 3],
  2: [5, 3, 0],
  3: [0, 4, 1, 5],
  4: [0, 5, 1],
  5: [3, 1, 0, 4],
  6: [0, 4],
};

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

const ROOT_OCTAVE = 4;
const A4_MIDI = 69;

const keyRootIndex = (key: string): number => {
  const root = key.split('/')[0];
  const sharp = FLAT_TO_SHARP[root] || root;
  return CHROMATIC.indexOf(sharp as (typeof CHROMATIC)[number]);
};

const getModalScaleNotes = (key: string, mode: string): string[] => {
  const start = keyRootIndex(key);
  const pattern = SCALE_PATTERNS[mode as Scale] || SCALE_PATTERNS.Major;
  return pattern.map((interval) => CHROMATIC[(start + interval) % 12]);
};

const getChordType = (degree: number, scale: string): string => {
  const triads = SCALE_TRIADS[scale as Scale] || SCALE_TRIADS.Major;
  return triads[degree % 7];
};

const getRomanNumeral = (degree: number, scale: string): string => {
  const numerals = ROMAN_NUMERALS[scale as Scale] || ROMAN_NUMERALS.Major;
  return numerals[degree % 7];
};

interface Chord {
  id: string;
  root: string;
  type: string;
  degree: number;
  romanNumeral: string;
  inversion: number;
}

// Apply chord inversion by raising the lowest N intervals by an octave so
// the voicing rotates while preserving the harmonic content.
const applyInversion = (intervals: number[], inversion: number): number[] => {
  const n = intervals.length;
  if (n === 0) return intervals;
  const inv = ((inversion % n) + n) % n;
  return intervals
    .map((semi, idx) => (idx < inv ? semi + 12 : semi))
    .slice()
    .sort((a, b) => a - b);
};

const getChordIntervals = (chord: Chord): number[] => {
  const def = CHORD_TYPES[chord.type] || CHORD_TYPES.Major;
  return applyInversion(def.intervals, chord.inversion);
};

const chordToMidiNotes = (chord: Chord): number[] => {
  const rootSemi = NOTE_TO_SEMITONE[chord.root];
  if (rootSemi === undefined) return [];
  const rootMidi = 12 * (ROOT_OCTAVE + 1) + rootSemi;
  return getChordIntervals(chord).map((s) => rootMidi + s);
};

const getChordFrequencies = (chord: Chord): number[] =>
  chordToMidiNotes(chord).map((midi) => 440 * Math.pow(2, (midi - A4_MIDI) / 12));

let chordIdCounter = 0;
const newChordId = (): string => `c${++chordIdCounter}`;

const applyMoodAndExtension = (
  baseType: string,
  mood: string,
  prefs: GenrePrefs,
  sigmaMultiplier: number,
): string => {
  let type = baseType;
  if ((mood === 'Dark' || mood === 'Sad') && type === 'Major' && Math.random() < 0.7) {
    type = 'Minor';
  }
  if (prefs.extensions.length && Math.random() < prefs.seventhChance * sigmaMultiplier) {
    const ext = prefs.extensions[Math.floor(Math.random() * prefs.extensions.length)];
    if (
      (type === 'Major' && ext.includes('Major')) ||
      (type === 'Minor' && ext.includes('Minor')) ||
      ext.includes('Dominant') ||
      (!ext.includes('Major') && !ext.includes('Minor'))
    ) {
      type = ext;
    }
  }
  return type;
};

const buildChord = (
  degree: number,
  scale: string,
  key: string,
  mood: string,
  prefs: GenrePrefs,
  sigmaMultiplier: number,
): Chord => {
  const note = getModalScaleNotes(key, scale)[degree];
  const type = applyMoodAndExtension(getChordType(degree, scale), mood, prefs, sigmaMultiplier);
  return {
    id: newChordId(),
    root: note,
    type,
    degree: degree + 1,
    romanNumeral: getRomanNumeral(degree, scale),
    inversion: 0,
  };
};

const pickWeighted = (weights: number[]): number => {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return Math.floor(Math.random() * weights.length);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
};

type Generator = (length: number, scale: string, key: string, mood: string, prefs: GenrePrefs, sigma: boolean) => Chord[];

const generatePatternBased: Generator = (length, scale, key, mood, prefs, sigma) => {
  const sigmaMult = sigma ? 3 : 1;
  return Array.from({ length }, (_, i) => {
    let degree: number;
    if (sigma && Math.random() < 0.4) {
      degree = Math.floor(Math.random() * 7);
    } else if (prefs.patterns.length) {
      const pattern = prefs.patterns[Math.floor(Math.random() * prefs.patterns.length)];
      degree = pattern[i % pattern.length];
    } else {
      degree = prefs.preferredChords[Math.floor(Math.random() * prefs.preferredChords.length)];
    }
    return buildChord(degree, scale, key, mood, prefs, sigmaMult);
  });
};

const generateWeighted: Generator = (length, scale, key, mood, prefs, sigma) => {
  const sigmaMult = sigma ? 3 : 1;
  const base = [2, 1, 1, 3, 2, 2, 0.5];
  return Array.from({ length }, () => {
    let degree: number;
    if (sigma && Math.random() < 0.5) {
      degree = Math.floor(Math.random() * 7);
    } else {
      const weights = base.map((w, idx) => {
        const jitter = sigma ? (Math.random() - 0.5) * 2 : 0;
        return prefs.avoidChords.includes(idx) ? 0 : Math.max(0, w + jitter);
      });
      degree = pickWeighted(weights);
    }
    return buildChord(degree, scale, key, mood, prefs, sigmaMult);
  });
};

const generateGenreRandom: Generator = (length, scale, key, mood, prefs, sigma) => {
  const sigmaMult = sigma ? 3 : 1;
  const available = prefs.preferredChords.filter((c) => !prefs.avoidChords.includes(c));
  return Array.from({ length }, () => {
    const degree = sigma || available.length === 0
      ? Math.floor(Math.random() * 7)
      : available[Math.floor(Math.random() * available.length)];
    return buildChord(degree, scale, key, mood, prefs, sigmaMult);
  });
};

const generateVoiceLed: Generator = (length, scale, key, mood, prefs, sigma) => {
  const sigmaMult = sigma ? 3 : 1;
  let degree = sigma ? Math.floor(Math.random() * 7) : 0;
  const out: Chord[] = [];
  for (let i = 0; i < length; i++) {
    out.push(buildChord(degree, scale, key, mood, prefs, sigmaMult));
    if (i < length - 1) {
      if (sigma && Math.random() < 0.3) {
        degree = Math.floor(Math.random() * 7);
      } else {
        const next = (VOICE_LEADING[degree] || [0]).filter((d) => !prefs.avoidChords.includes(d));
        const candidates = next.length ? next : VOICE_LEADING[degree] || [0];
        degree = candidates[Math.floor(Math.random() * candidates.length)];
      }
    }
  }
  return out;
};

const GENERATORS: Generator[] = [generatePatternBased, generateWeighted, generateGenreRandom, generateVoiceLed];

interface SavedProgression {
  id: string;
  name: string;
  key: string;
  scale: string;
  genre: string;
  mood: string;
  bpm: number;
  progressionLength: number;
  isArpeggiated: boolean;
  isRepeating: boolean;
  isSigmaMode: boolean;
  chords: Chord[];
}

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const buildMidi = (chords: Chord[], bpm: number): ArrayBuffer => {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  const track = midi.addTrack();
  const secondsPerWhole = (60 / bpm) * 4;
  let time = 0;
  for (const chord of chords) {
    for (const midiNote of chordToMidiNotes(chord)) {
      track.addNote({ midi: midiNote, time, duration: secondsPerWhole, velocity: 0.8 });
    }
    time += secondsPerWhole;
  }
  // Copy into a dedicated ArrayBuffer so Blob accepts it without SharedArrayBuffer fuss.
  const src = midi.toArray();
  const buf = new ArrayBuffer(src.byteLength);
  new Uint8Array(buf).set(src);
  return buf;
};

const MusicTheoryApp = () => {
  const [selectedKey, setSelectedKey] = useState<string>('C');
  const [selectedScale, setSelectedScale] = useState<string>('Major');
  const [genre, setGenre] = useState<string>('');
  const [mood, setMood] = useState<string>('');
  const [bpm, setBpm] = useState<number>(120);
  const [volume, setVolume] = useState<number>(0.7);
  const [progressionLength, setProgressionLength] = useState<number>(4);
  const [isArpeggiated, setIsArpeggiated] = useState<boolean>(false);
  const [isRepeating, setIsRepeating] = useState<boolean>(false);
  const [selectedCircleKey, setSelectedCircleKey] = useState<string | null>(null);
  const [isSigmaMode, setIsSigmaMode] = useState<boolean>(false);

  const [currentProgressions, setCurrentProgressions] = useState<Chord[][]>([]);
  const [selectedProgressionIndex, setSelectedProgressionIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentChordIndex, setCurrentChordIndex] = useState<number>(-1);
  const [savedProgressions, setSavedProgressions] = useState<SavedProgression[]>([]);

  const synthRef = useRef<Tone.PolySynth | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);

  useEffect(() => {
    synthRef.current = new Tone.PolySynth().toDestination();
    return () => {
      loopRef.current?.dispose();
      synthRef.current?.dispose();
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, []);

  useEffect(() => {
    if (!synthRef.current) return;
    // Tone.gainToDb(0) is -Infinity; clamp so the slider mutes cleanly without NaNs.
    synthRef.current.volume.value = volume <= 0 ? -Infinity : Tone.gainToDb(volume);
  }, [volume]);

  // Publish the current key/scale to the shared selection so other tools (e.g. the
  // transition engine) can pick it up as a starting point.
  useEffect(() => {
    const tonic = (KEYS as readonly string[]).indexOf(selectedKey);
    if (tonic >= 0) {
      selectionStore.getState().setKeyMode({ tonic, scale: selectedScale as ScaleName });
    }
  }, [selectedKey, selectedScale]);

  const scaleNotes = useMemo(
    () => getModalScaleNotes(selectedKey, selectedScale),
    [selectedKey, selectedScale],
  );

  const currentProgression = currentProgressions[selectedProgressionIndex] || [];

  const updateChord = useCallback((chordId: string, patch: Partial<Chord>): void => {
    setCurrentProgressions((all) =>
      all.map((prog, idx) =>
        idx !== selectedProgressionIndex
          ? prog
          : prog.map((c) => (c.id === chordId ? { ...c, ...patch } : c)),
      ),
    );
  }, [selectedProgressionIndex]);

  const cycleInversion = useCallback((chord: Chord): void => {
    const max = CHORD_TYPES[chord.type]?.intervals.length ?? 3;
    updateChord(chord.id, { inversion: (chord.inversion + 1) % max });
  }, [updateChord]);

  const playChord = useCallback(async (chord: Chord) => {
    if (!synthRef.current) return;
    await Tone.start();
    const frequencies = getChordFrequencies(chord);
    if (isArpeggiated) {
      const now = Tone.now();
      frequencies.forEach((freq, i) => {
        synthRef.current!.triggerAttackRelease(freq, '0.5n', now + i * 0.1);
      });
    } else {
      synthRef.current.triggerAttackRelease(frequencies, '2n');
    }
  }, [isArpeggiated]);

  const stopProgression = useCallback(() => {
    loopRef.current?.dispose();
    loopRef.current = null;
    Tone.Transport.stop();
    Tone.Transport.cancel();
    setIsPlaying(false);
    setCurrentChordIndex(-1);
  }, []);

  const playProgression = useCallback(async () => {
    if (!synthRef.current || currentProgression.length === 0) return;
    await Tone.start();
    setIsPlaying(true);
    loopRef.current?.dispose();
    Tone.Transport.bpm.value = bpm;

    let i = 0;
    loopRef.current = new Tone.Loop((time) => {
      if (i >= currentProgression.length) {
        if (isRepeating) {
          i = 0;
        } else {
          Tone.Draw.schedule(stopProgression, time);
          return;
        }
      }
      const chord = currentProgression[i];
      const idx = i;
      Tone.Draw.schedule(() => setCurrentChordIndex(idx), time);
      const frequencies = getChordFrequencies(chord);
      if (isArpeggiated) {
        frequencies.forEach((freq, n) => {
          synthRef.current!.triggerAttackRelease(freq, '0.25n', time + n * 0.1);
        });
      } else {
        synthRef.current!.triggerAttackRelease(frequencies, '1n', time);
      }
      i++;
    }, '1n').start(0);

    Tone.Transport.start();
  }, [currentProgression, bpm, isArpeggiated, isRepeating, stopProgression]);

  const generate = useCallback(() => {
    const prefs = GENRE_PREFS[genre] || GENRE_PREFS.Pop;
    const next = GENERATORS.map((fn) =>
      fn(progressionLength, selectedScale, selectedKey, mood, prefs, isSigmaMode),
    );
    setCurrentProgressions(next);
    setCurrentChordIndex(-1);
  }, [genre, mood, progressionLength, selectedScale, selectedKey, isSigmaMode]);

  const saveCurrent = (): void => {
    if (currentProgression.length === 0) return;
    const name = prompt('Name this progression:') || `Progression ${savedProgressions.length + 1}`;
    setSavedProgressions((prev) => [...prev, {
      id: `s${Date.now()}`,
      name,
      key: selectedKey,
      scale: selectedScale,
      genre,
      mood,
      bpm,
      progressionLength,
      isArpeggiated,
      isRepeating,
      isSigmaMode,
      chords: currentProgression,
    }]);
  };

  const loadProgression = (saved: SavedProgression): void => {
    setSelectedKey(saved.key);
    setSelectedScale(saved.scale);
    setGenre(saved.genre);
    setMood(saved.mood);
    setBpm(saved.bpm);
    setProgressionLength(saved.progressionLength || 4);
    setIsArpeggiated(!!saved.isArpeggiated);
    setIsRepeating(!!saved.isRepeating);
    setIsSigmaMode(!!saved.isSigmaMode);
    setCurrentProgressions([saved.chords]);
    setSelectedProgressionIndex(0);
  };

  const exportText = (): void => {
    if (currentProgression.length === 0) return;
    const lines = [
      `Key: ${selectedKey} ${selectedScale}`,
      `Scale notes: ${scaleNotes.join(' ')}`,
      genre && `Genre: ${genre}`,
      mood && `Mood: ${mood}`,
      `BPM: ${bpm}`,
      '',
      'Progression:',
      currentProgression
        .map((c) => {
          const sym = CHORD_TYPES[c.type]?.symbol ?? c.type;
          const inv = c.inversion > 0 ? ` (inv ${c.inversion})` : '';
          return `  ${c.romanNumeral.padEnd(5)} ${c.root}${sym}${inv}`;
        })
        .join('\n'),
    ].filter(Boolean).join('\n');
    downloadBlob(new Blob([lines], { type: 'text/plain' }), `progression-${selectedKey}-${selectedScale}.txt`);
  };

  const exportMidi = (): void => {
    if (currentProgression.length === 0) return;
    const buf = buildMidi(currentProgression, bpm);
    downloadBlob(
      new Blob([buf], { type: 'audio/midi' }),
      `progression-${selectedKey}-${selectedScale}.mid`,
    );
  };

  const sharedNotes = useMemo(() => {
    if (!selectedCircleKey) return [];
    const a = new Set(scaleNotes.map((n) => FLAT_TO_SHARP[n] || n));
    const b = getModalScaleNotes(selectedCircleKey, 'Major').map((n) => FLAT_TO_SHARP[n] || n);
    return [...new Set(b.filter((n) => a.has(n)))];
  }, [scaleNotes, selectedCircleKey]);

  const fifthsOrder = ['C', 'G', 'D', 'A', 'E', 'B', 'F#/Gb', 'C#/Db', 'G#/Ab', 'D#/Eb', 'A#/Bb', 'F'];
  const selectedIdx = fifthsOrder.findIndex((k) => k === selectedKey);
  const rotation = selectedIdx === -1 ? 0 : selectedIdx * -30;

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Music Theory Chord Progression Generator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Key & Scale</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Key</label>
                <select
                  value={selectedKey}
                  onChange={(e) => { setSelectedKey(e.target.value); setSelectedCircleKey(null); }}
                  className="w-full p-2 border rounded-md"
                >
                  {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Scale</label>
                <select
                  value={selectedScale}
                  onChange={(e) => { setSelectedScale(e.target.value); setSelectedCircleKey(null); }}
                  className="w-full p-2 border rounded-md"
                >
                  {SCALES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Style Guide</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Genre</label>
                <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full p-2 border rounded-md">
                  <option value="">Any</option>
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mood</label>
                <select value={mood} onChange={(e) => setMood(e.target.value)} className="w-full p-2 border rounded-md">
                  <option value="">Any</option>
                  {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Progression Length: {progressionLength}</label>
                <input
                  type="range" min="3" max="12" value={progressionLength}
                  onChange={(e) => setProgressionLength(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>3</span><span>6</span><span>9</span><span>12</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Go Sigma Mode</span>
                <input
                  id="sigma-toggle" type="checkbox" checked={isSigmaMode}
                  onChange={(e) => setIsSigmaMode(e.target.checked)} className="sr-only"
                />
                <label
                  htmlFor="sigma-toggle"
                  className={`flex items-center cursor-pointer w-12 h-6 rounded-full p-1 transition-colors ${isSigmaMode ? 'bg-purple-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isSigmaMode ? 'translate-x-6' : 'translate-x-0'}`} />
                </label>
              </div>
              <div className="text-xs text-gray-500">
                {isSigmaMode ? 'Maximum chaos mode enabled' : 'Increases randomness in generation'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Chord Progressions</h2>
              <div className="flex space-x-2">
                <button onClick={generate} className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded-md text-sm">
                  <RefreshCw size={14} /><span>Generate</span>
                </button>
                <button
                  onClick={saveCurrent}
                  disabled={currentProgression.length === 0}
                  className="flex items-center space-x-1 bg-purple-500 text-white px-3 py-1 rounded-md text-sm disabled:bg-gray-300"
                >
                  <Save size={14} /><span>Save</span>
                </button>
              </div>
            </div>

            {currentProgressions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex space-x-2 mb-4">
                  {currentProgressions.map((p, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedProgressionIndex(index)}
                      className={`px-3 py-1 rounded text-sm ${selectedProgressionIndex === index ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      Progression {index + 1} ({p.length})
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {currentProgression.map((chord, index) => {
                    const maxInv = CHORD_TYPES[chord.type]?.intervals.length ?? 3;
                    return (
                      <div
                        key={chord.id}
                        onClick={() => playChord(chord)}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${currentChordIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="text-center">
                          <div className="text-base font-bold">
                            {chord.root}{CHORD_TYPES[chord.type]?.symbol ?? chord.type}
                          </div>
                          <div className="text-xs text-gray-600">{chord.romanNumeral}</div>
                          <div className="text-xs text-gray-500">{chord.type}</div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); cycleInversion(chord); }}
                            className={`mt-2 text-[10px] px-2 py-0.5 rounded-full border ${chord.inversion === 0 ? 'border-gray-300 text-gray-500 hover:bg-gray-100' : 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                            title={`Click to cycle inversion (0–${maxInv - 1})`}
                          >
                            {chord.inversion === 0 ? 'root pos' : `inv ${chord.inversion}`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Click "Generate" to create chord progressions
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Audio Controls</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">BPM: {bpm}</label>
                <input type="range" min="60" max="180" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Volume</label>
                <div className="flex items-center space-x-2">
                  <Volume2 size={16} />
                  <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="flex-1" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Arpeggiated Chords</span>
                <input id="arpeggio-toggle" type="checkbox" checked={isArpeggiated} onChange={(e) => setIsArpeggiated(e.target.checked)} className="sr-only" />
                <label
                  htmlFor="arpeggio-toggle"
                  className={`flex items-center cursor-pointer w-12 h-6 rounded-full p-1 transition-colors ${isArpeggiated ? 'bg-blue-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isArpeggiated ? 'translate-x-6' : 'translate-x-0'}`} />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Repeat Progression</span>
                <input id="repeat-toggle" type="checkbox" checked={isRepeating} onChange={(e) => setIsRepeating(e.target.checked)} className="sr-only" />
                <label
                  htmlFor="repeat-toggle"
                  className={`flex items-center cursor-pointer w-12 h-6 rounded-full p-1 transition-colors ${isRepeating ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isRepeating ? 'translate-x-6' : 'translate-x-0'}`} />
                </label>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={isPlaying ? stopProgression : playProgression}
                  disabled={currentProgression.length === 0}
                  className="flex-1 flex items-center justify-center space-x-2 bg-blue-500 text-white p-2 rounded-md disabled:bg-gray-300"
                >
                  {isPlaying ? <Square size={16} /> : <Play size={16} />}
                  <span>{isPlaying ? 'Stop' : 'Play'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-center">Circle of Fifths</h2>
            <div className="relative w-48 h-48 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-blue-300">
                {fifthsOrder.map((key, index) => {
                  const angle = (index * 30) - 90 + rotation;
                  const radian = (angle * Math.PI) / 180;
                  const x = 80 * Math.cos(radian);
                  const y = 80 * Math.sin(radian);
                  const isCurrent = key === selectedKey;
                  const isCompare = key === selectedCircleKey;
                  return (
                    <div
                      key={key}
                      className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 cursor-pointer ${
                        isCurrent ? 'bg-blue-500 text-white scale-110' :
                        isCompare ? 'bg-green-500 text-white scale-105' :
                        'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'
                      }`}
                      style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                      onClick={() => setSelectedCircleKey(key === selectedCircleKey ? null : key)}
                      title={`Click to compare with ${key}`}
                    >
                      {key.split('/')[0]}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 text-center">
              <div className="text-sm text-gray-600 mb-2">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1" />
                Current Key: {selectedKey}
                {selectedCircleKey && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1" />
                    Comparing: {selectedCircleKey}
                  </>
                )}
              </div>

              {selectedCircleKey ? (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Shared Notes between {selectedKey} {selectedScale} and {selectedCircleKey} Major:
                  </h3>
                  <div className="text-lg font-bold text-green-600">
                    {sharedNotes.join(' - ') || 'No shared notes'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{sharedNotes.length} of 7 notes in common</div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-2">Click any key on the circle to compare notes</div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Modal Scales for {selectedKey}</h2>
            <div className="space-y-2 text-sm">
              {SCALES.map((scale) => (
                <div key={scale} className="flex justify-between py-1 border-b border-gray-100">
                  <span className="font-medium min-w-[80px]">{scale}:</span>
                  <span className="text-gray-600">{getModalScaleNotes(selectedKey, scale).join(' - ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Saved Progressions</h2>
            {savedProgressions.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {savedProgressions.map((saved) => (
                  <div key={saved.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-sm">{saved.name}</h3>
                      <button
                        onClick={() => setSavedProgressions((prev) => prev.filter((s) => s.id !== saved.id))}
                        className="text-red-500 text-xs hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      {saved.key} {saved.scale} • {saved.genre || 'Any'} • {saved.mood || 'Any'} • {saved.chords.length} chords
                      {saved.isArpeggiated && ' • Arpeggio'}
                      {saved.isRepeating && ' • Repeat'}
                      {saved.isSigmaMode && ' • Sigma'}
                    </div>
                    <div className="text-xs text-gray-700 mb-2">
                      {saved.chords.map((c) => `${c.root}${CHORD_TYPES[c.type]?.symbol ?? c.type}`).join(' - ')}
                    </div>
                    <button onClick={() => loadProgression(saved)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                      Load
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4 text-sm">No saved progressions yet</div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Export</h2>
            <div className="space-y-2">
              <button
                onClick={exportMidi}
                disabled={currentProgression.length === 0}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 text-white p-3 rounded-md disabled:bg-gray-300"
              >
                <FileAudio size={16} />
                <span>Export MIDI (.mid)</span>
              </button>
              <button
                onClick={exportText}
                disabled={currentProgression.length === 0}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-500 text-white p-3 rounded-md disabled:bg-gray-300"
              >
                <Download size={16} />
                <span>Export text (.txt)</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              MIDI uses the current BPM and inversions; drop into any DAW.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Quick Reference</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Current Key:</strong> {selectedKey}</div>
              <div><strong>Scale:</strong> {selectedScale}</div>
              <div><strong>Scale Notes:</strong> {scaleNotes.join(', ')}</div>
              {genre && <div><strong>Genre:</strong> {genre}</div>}
              {mood && <div><strong>Mood:</strong> {mood}</div>}
            </div>

            <div className="mt-4 pt-4 border-t">
              <h3 className="font-medium mb-2">Scale Degrees:</h3>
              <div className="text-xs space-y-1">
                {scaleNotes.map((note, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{getRomanNumeral(index, selectedScale)}</span>
                    <span>{note} {getChordType(index, selectedScale)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicTheoryApp;
