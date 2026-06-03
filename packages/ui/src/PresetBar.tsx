import { useState } from 'react';
import { useStore } from 'zustand';
import { selectionStore } from '@idolmancer/data-model';
import { deletePreset, listPresets, savePreset, type Preset } from '@idolmancer/storage';

/**
 * Cross-tool preset bar: save the current shared selection (key/chord/progression/
 * tempo) under a name, and reload or delete saved presets. Always available in the
 * shell header so any tool's state can be captured and restored.
 */
export function PresetBar() {
  const selection = useStore(selectionStore, (s) => s.selection);
  const [presets, setPresets] = useState<Preset[]>(() => listPresets());

  const save = () => {
    const name = window.prompt('Save current selection as preset:')?.trim();
    if (!name) return;
    setPresets(savePreset(name, selection));
  };

  const load = (preset: Preset) => {
    selectionStore.setState((state) => ({ selection: { ...state.selection, ...preset.selection } }));
  };

  const remove = (name: string) => setPresets(deletePreset(name));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={save}
        className="rounded border border-border px-2.5 py-1 text-xs text-fg hover:border-accent hover:text-accent"
      >
        Save preset
      </button>
      {presets.length === 0 ? (
        <span className="font-mono text-[11px] text-muted">no presets</span>
      ) : (
        presets.map((p) => (
          <span key={p.name} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs">
            <button onClick={() => load(p)} className="text-fg hover:text-accent" title="Load preset">
              {p.name}
            </button>
            <button
              onClick={() => remove(p.name)}
              className="text-muted hover:text-red-400"
              title="Delete preset"
              aria-label={`Delete ${p.name}`}
            >
              ×
            </button>
          </span>
        ))
      )}
    </div>
  );
}
