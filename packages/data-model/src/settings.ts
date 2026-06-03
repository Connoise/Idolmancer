import { createStore } from 'zustand/vanilla';
import type { Settings, ThemeName } from './types';

export interface SettingsState {
  settings: Settings;
  setReferenceA4: (hz: number) => void;
  setTheme: (theme: ThemeName) => void;
}

export const DEFAULT_SETTINGS: Settings = { referenceA4: 440, theme: 'dark' };

/** App-wide settings store. Persisted by the storage package. */
export const settingsStore = createStore<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  setReferenceA4: (referenceA4) => set((state) => ({ settings: { ...state.settings, referenceA4 } })),
  setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme } })),
}));
