import { useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { selectionStore } from '@idolmancer/data-model';
import {
  harmonicSeries,
  nearestNote,
  noteToFrequency,
  PITCH_CLASS_NAMES,
  subharmonicSeries,
} from '@idolmancer/theory-core';

const REFERENCE_OPTIONS = [440, 432, 415] as const;
const PARTIAL_COUNT = 12;

function SeriesTable({
  title,
  frequencies,
  fundamental,
  referenceA4,
}: {
  title: string;
  frequencies: number[];
  fundamental: number;
  referenceA4: number;
}) {
  return (
    <div>
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-accent">{title}</h3>
      <div className="overflow-hidden rounded border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left font-mono text-[10px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Hz</th>
              <th className="px-3 py-2">Nearest note</th>
              <th className="px-3 py-2">Cents</th>
              <th className="px-3 py-2">Ratio</th>
            </tr>
          </thead>
          <tbody>
            {frequencies.map((f, i) => {
              const n = nearestNote(f, { referenceA4 });
              const ratio = f / fundamental;
              return (
                <tr key={i} className="border-t border-border odd:bg-surface/40">
                  <td className="px-3 py-1.5 font-mono text-muted">{i + 1}</td>
                  <td className="px-3 py-1.5 font-mono text-fg">{f.toFixed(2)}</td>
                  <td className="px-3 py-1.5 font-mono text-accent">{n.name}</td>
                  <td className={`px-3 py-1.5 font-mono ${Math.abs(n.cents) <= 2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {n.cents > 0 ? `+${n.cents}` : n.cents}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-muted">
                    {ratio >= 1 ? `${ratio.toFixed(0)}:1` : `1:${(1 / ratio).toFixed(0)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Harmonics() {
  const [pitchClass, setPitchClass] = useState(9); // A
  const [octave, setOctave] = useState(3);
  const [referenceA4, setReferenceA4] = useState<number>(440);

  const sharedKeyMode = useStore(selectionStore, (s) => s.selection.keyMode);

  const fundamental = useMemo(
    () => noteToFrequency({ pitchClass, octave }, { referenceA4 }),
    [pitchClass, octave, referenceA4],
  );
  const harmonics = useMemo(() => harmonicSeries(fundamental, PARTIAL_COUNT), [fundamental]);
  const subharmonics = useMemo(() => subharmonicSeries(fundamental, PARTIAL_COUNT), [fundamental]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Harmonics</h1>
      <p className="mt-1 text-muted">
        Translate a note into hertz and explore its harmonic (overtone) and sub-harmonic (undertone) series.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4 rounded border border-border bg-surface p-4">
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted">Note</label>
          <select
            className="rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
            value={pitchClass}
            onChange={(e) => setPitchClass(Number(e.target.value))}
          >
            {PITCH_CLASS_NAMES.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted">Octave</label>
          <input
            type="number"
            min={0}
            max={8}
            value={octave}
            onChange={(e) => setOctave(Number(e.target.value))}
            className="w-20 rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted">
            Reference A4 (equal temperament)
          </label>
          <div className="flex gap-1">
            {REFERENCE_OPTIONS.map((hz) => (
              <button
                key={hz}
                onClick={() => setReferenceA4(hz)}
                className={`rounded border px-3 py-2 font-mono text-sm ${
                  referenceA4 === hz ? 'border-accent text-accent' : 'border-border text-muted hover:text-fg'
                }`}
              >
                {hz}
              </button>
            ))}
          </div>
        </div>
        {sharedKeyMode && sharedKeyMode.tonic !== pitchClass && (
          <button
            onClick={() => setPitchClass(sharedKeyMode.tonic)}
            className="rounded border border-accent/50 bg-accent/10 px-3 py-2 text-sm text-accent hover:bg-accent/20"
          >
            Use shared tonic: {PITCH_CLASS_NAMES[sharedKeyMode.tonic]}
          </button>
        )}
      </div>

      <div className="mt-4 rounded border border-border bg-surface p-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Fundamental</span>
        <div className="mt-1 font-mono text-2xl text-accent">
          {PITCH_CLASS_NAMES[pitchClass]}
          {octave} · {fundamental.toFixed(2)} Hz
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SeriesTable title="Harmonic series (overtones)" frequencies={harmonics} fundamental={fundamental} referenceA4={referenceA4} />
        <SeriesTable
          title="Sub-harmonic series (undertones)"
          frequencies={subharmonics}
          fundamental={fundamental}
          referenceA4={referenceA4}
        />
      </div>
    </div>
  );
}
