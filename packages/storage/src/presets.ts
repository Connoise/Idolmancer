import { defaultBackend, type StorageBackend } from './backend';
import { pickPersisted, type PersistedSelection } from './persist';
import type { Selection } from '@idolmancer/data-model';

const PRESETS_KEY = 'idolmancer.presets';

/** A named snapshot of the shared selection (sample excluded). */
export interface Preset {
  name: string;
  selection: PersistedSelection;
}

export function listPresets(backend: StorageBackend = defaultBackend()): Preset[] {
  const raw = backend.get(PRESETS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Preset[]) : [];
  } catch {
    return [];
  }
}

/** Save (or overwrite, by name) a preset from the current selection. */
export function savePreset(
  name: string,
  selection: Selection,
  backend: StorageBackend = defaultBackend(),
): Preset[] {
  const preset: Preset = { name, selection: pickPersisted(selection) };
  const presets = listPresets(backend).filter((p) => p.name !== name);
  presets.push(preset);
  backend.set(PRESETS_KEY, JSON.stringify(presets));
  return presets;
}

export function deletePreset(name: string, backend: StorageBackend = defaultBackend()): Preset[] {
  const presets = listPresets(backend).filter((p) => p.name !== name);
  backend.set(PRESETS_KEY, JSON.stringify(presets));
  return presets;
}
