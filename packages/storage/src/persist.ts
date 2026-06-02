import { selectionStore, type Selection } from '@idolmancer/data-model';
import { defaultBackend, type StorageBackend } from './backend';

const SELECTION_KEY = 'idolmancer.selection';

// The decoded audio sample is large and non-JSON-friendly, so it is never
// persisted — only the lightweight musical context survives a reload.
type PersistedSelection = Omit<Selection, 'sample'>;

function pickPersisted(selection: Selection): PersistedSelection {
  const { keyMode, chord, progression } = selection;
  return { keyMode, chord, progression };
}

/**
 * Hydrate the shared selection from app storage, then keep it persisted on every
 * change. Returns an unsubscribe function. Call once at app startup.
 */
export function persistSelection(backend: StorageBackend = defaultBackend()): () => void {
  const raw = backend.get(SELECTION_KEY);
  if (raw) {
    try {
      const restored = JSON.parse(raw) as PersistedSelection;
      selectionStore.setState((state) => ({ selection: { ...state.selection, ...restored } }));
    } catch {
      backend.remove(SELECTION_KEY); // discard corrupt data
    }
  }

  return selectionStore.subscribe((state) => {
    backend.set(SELECTION_KEY, JSON.stringify(pickPersisted(state.selection)));
  });
}
