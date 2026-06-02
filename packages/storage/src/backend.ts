// A tiny key/value abstraction over app storage. Today it is backed by the
// browser's localStorage (available inside the Tauri webview); a Tauri
// filesystem backend can be swapped in later without touching callers.

export interface StorageBackend {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** In-memory backend — used as a fallback when no DOM storage exists (tests, SSR). */
export function memoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return {
    get: (k) => (map.has(k) ? map.get(k)! : null),
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  };
}

/** The default backend: localStorage when present, otherwise in-memory. */
export function defaultBackend(): StorageBackend {
  try {
    if (typeof localStorage !== 'undefined') {
      return {
        get: (k) => localStorage.getItem(k),
        set: (k, v) => localStorage.setItem(k, v),
        remove: (k) => localStorage.removeItem(k),
      };
    }
  } catch {
    // localStorage can throw in restricted contexts; fall through to memory.
  }
  return memoryBackend();
}
