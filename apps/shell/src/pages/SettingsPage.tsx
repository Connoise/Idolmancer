import { useStore } from 'zustand';
import { settingsStore } from '@idolmancer/data-model';

const REFERENCE_OPTIONS = [432, 440, 442] as const;

export function SettingsPage() {
  const referenceA4 = useStore(settingsStore, (s) => s.settings.referenceA4);
  const theme = useStore(settingsStore, (s) => s.settings.theme);
  const setReferenceA4 = settingsStore.getState().setReferenceA4;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-muted">App-wide preferences, persisted across sessions.</p>

      <section className="mt-6 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-accent">Tuning</h2>
        <p className="mt-2 text-sm text-muted">
          Equal-temperament reference pitch (A4). Tools that translate notes to frequency use this value.
        </p>
        <div className="mt-3 flex items-center gap-2">
          {REFERENCE_OPTIONS.map((hz) => (
            <button
              key={hz}
              onClick={() => setReferenceA4(hz)}
              className={`rounded border px-3 py-2 font-mono text-sm ${
                referenceA4 === hz ? 'border-accent text-accent' : 'border-border text-muted hover:text-fg'
              }`}
            >
              {hz} Hz
            </button>
          ))}
          <input
            type="number"
            min={400}
            max={480}
            value={referenceA4}
            onChange={(e) => setReferenceA4(Number(e.target.value) || 440)}
            className="w-24 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
            aria-label="Custom reference pitch in Hz"
          />
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-accent">Appearance</h2>
        <p className="mt-2 text-sm text-muted">
          Theme: <span className="font-mono text-fg">{theme}</span>. Idolmancer ships a single dark theme; the setting
          exists so additional themes can be added later without touching tools.
        </p>
      </section>
    </div>
  );
}
