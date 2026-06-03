import { useMemo } from 'react';
import { useStore } from 'zustand';
import { selectionStore } from '@idolmancer/data-model';
import { bpmToHz, quarterNoteMs, subdivisionTable } from '@idolmancer/theory-core';

const fmt = (ms: number) => (ms >= 100 ? ms.toFixed(1) : ms.toFixed(2));

export default function BpmMs() {
  // Tempo is shared: chordgen publishes its BPM here, and changes made here flow back.
  const bpm = useStore(selectionStore, (s) => s.selection.tempoBpm) ?? 120;
  const setBpm = (n: number) => selectionStore.getState().setTempo(Math.max(1, n || 1));

  const table = useMemo(() => subdivisionTable(bpm), [bpm]);
  const quarter = useMemo(() => quarterNoteMs(bpm), [bpm]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">BPM → Milliseconds</h1>
      <p className="mt-1 text-muted">
        Convert a tempo into note durations in milliseconds, with dotted and triplet subdivisions.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-6 rounded border border-border bg-surface p-4">
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted">Tempo (BPM)</label>
          <input
            type="number"
            min={20}
            max={400}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-28 rounded border border-border bg-bg px-3 py-2 font-mono text-lg text-accent outline-none focus:border-accent"
          />
        </div>
        <input
          type="range"
          min={40}
          max={240}
          value={Math.min(240, Math.max(40, bpm))}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="flex-1 accent-accent"
        />
        <div className="text-right">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted">Quarter note</div>
          <div className="font-mono text-lg text-fg">
            {fmt(quarter)} ms · {bpmToHz(bpm).toFixed(2)} Hz
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left font-mono text-[10px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2">Note value</th>
              <th className="px-4 py-2">Beats</th>
              <th className="px-4 py-2">Straight (ms)</th>
              <th className="px-4 py-2">Dotted (ms)</th>
              <th className="px-4 py-2">Triplet (ms)</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.name} className="border-t border-border odd:bg-surface/40">
                <td className="px-4 py-2 text-fg">{row.name}</td>
                <td className="px-4 py-2 font-mono text-muted">{row.beats}</td>
                <td className="px-4 py-2 font-mono text-accent">{fmt(row.straightMs)}</td>
                <td className="px-4 py-2 font-mono text-fg">{fmt(row.dottedMs)}</td>
                <td className="px-4 py-2 font-mono text-fg">{fmt(row.tripletMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
