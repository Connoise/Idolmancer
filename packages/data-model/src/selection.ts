import { createStore } from 'zustand/vanilla';
import type { AudioSample, Chord, KeyMode, Progression } from './types';

/**
 * The user's current working context, shared across every tool. Tools read it to
 * seed their inputs and write it to publish results — so a chordgen progression
 * can flow into the transition engine, a chord into the harmonics tool, etc.,
 * without any point-to-point coupling between tools.
 */
export interface Selection {
  keyMode?: KeyMode;
  chord?: Chord;
  progression?: Progression;
  sample?: AudioSample;
}

export interface SelectionState {
  selection: Selection;
  setKeyMode: (keyMode: KeyMode) => void;
  setChord: (chord: Chord) => void;
  setProgression: (progression: Progression) => void;
  setSample: (sample: AudioSample) => void;
  reset: () => void;
}

/**
 * A framework-agnostic vanilla store. The shell binds it to React; the headless
 * core stays free of any UI framework so it is equally usable from tests.
 */
export const selectionStore = createStore<SelectionState>((set) => ({
  selection: {},
  setKeyMode: (keyMode) => set((state) => ({ selection: { ...state.selection, keyMode } })),
  setChord: (chord) => set((state) => ({ selection: { ...state.selection, chord } })),
  setProgression: (progression) =>
    set((state) => ({ selection: { ...state.selection, progression } })),
  setSample: (sample) => set((state) => ({ selection: { ...state.selection, sample } })),
  reset: () => set({ selection: {} }),
}));
