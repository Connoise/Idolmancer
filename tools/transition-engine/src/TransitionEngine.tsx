import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { selectionStore } from '@idolmancer/data-model';
import { SCALE_TO_CHURCH_MODE } from '@idolmancer/theory-core';
import {
  analyze,
  MODE_ORDER,
  nameChord,
  PC_FLAT,
  PC_SHARP,
  speller,
  type ModeName,
  type ScoredConnector,
} from './engine';

const TONIC_OPTIONS = PC_SHARP.map((name, i) => ({
  value: i,
  label: PC_FLAT[i] !== name ? `${name} / ${PC_FLAT[i]}` : name,
}));

const WEIGHT_FIELDS = [
  { key: 'smoothness', label: 'Smoothness', desc: 'Common tones + minimal voice-leading. High = sliding, low-friction connections.' },
  { key: 'directness', label: 'Directness', desc: 'Functional cadential pull toward the target. High = strong, conclusive arrivals (V⁷→I).' },
  { key: 'modality', label: 'Modality preservation', desc: "Protects the target mode's identity. High = down-ranks foreign leading tones." },
  { key: 'melody', label: 'Melody fit', desc: 'How comfortably the connector hosts the supplied melody notes.' },
] as const;

type WeightKey = (typeof WEIGHT_FIELDS)[number]['key'];

const pct = (v: number) => Math.round(v * 100);

function ModeSelect({
  value,
  disabled,
  onChange,
}: {
  value: ModeName;
  disabled?: boolean;
  onChange: (m: ModeName) => void;
}) {
  return (
    <select
      className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent disabled:opacity-40"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as ModeName)}
    >
      {MODE_ORDER.map((m) => (
        <option key={m}>{m}</option>
      ))}
    </select>
  );
}

function TonicSelect({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <select
      className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent disabled:opacity-40"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {TONIC_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

const METRIC_BARS: { key: keyof Pick<ScoredConnector, 'smoothness' | 'directness' | 'modality'>; label: string; color: string }[] = [
  { key: 'smoothness', label: 'Smooth', color: 'bg-emerald-400' },
  { key: 'directness', label: 'Direct', color: 'bg-amber-400' },
  { key: 'modality', label: 'Modal', color: 'bg-violet-400' },
];

function ConnectorCard({ c, rank, targetTonic }: { c: ScoredConnector; rank: number; targetTonic: number }) {
  const sp = speller(targetTonic);
  const melAt = new Map<number, number[]>();
  c.melPairs.forEach((p) => {
    const list = melAt.get(p.stepIdx) ?? [];
    list.push(p.pc);
    melAt.set(p.stepIdx, list);
  });

  return (
    <div
      className={`relative overflow-hidden rounded border bg-surface p-5 ${
        rank === 0 ? 'border-amber-500/60' : 'border-border'
      }`}
    >
      <div className="absolute right-4 top-3 font-serif text-3xl italic text-border">
        {String(rank + 1).padStart(2, '0')}
      </div>
      <div className="font-semibold">
        {c.name}
        <span className="ml-2 rounded-full border border-border px-2 py-0.5 align-middle font-mono text-[9px] uppercase tracking-wider text-muted">
          {c.tag}
        </span>
      </div>

      <div className="my-4 flex flex-wrap items-end gap-2">
        {c.chain.map((step, si) => {
          const role = step.source ? 'src' : step.connector ? 'conn' : step.tonic ? 'tonic' : 'mid';
          const mel = melAt.get(si);
          const iv = c.inversions[si];
          const chipColor =
            role === 'conn'
              ? 'border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(224,145,58,0.18)]'
              : role === 'tonic'
                ? 'border-emerald-500 text-emerald-400'
                : role === 'src'
                  ? 'border-dashed border-border text-muted'
                  : 'border-border text-accent';
          return (
            <div key={si} className="flex items-end gap-2">
              <div className="flex flex-col items-center gap-1">
                <span className="h-4 font-mono text-[11px] text-red-400">
                  {mel ? <b>{mel.map((p) => sp[p]).join('/')}</b> : ''}
                </span>
                <div className={`relative rounded border bg-bg px-3 py-1.5 font-mono text-base ${chipColor}`}>
                  {role === 'conn' && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[8px] uppercase tracking-wider text-amber-500/80">
                      connector
                    </span>
                  )}
                  {nameChord(step.pcs, targetTonic)}
                </div>
                <div className="font-mono text-[11px] text-muted">{step.roman}</div>
                <div className="font-mono text-[9px] tracking-wide text-amber-500/80">
                  {iv.figure} · bass {sp[iv.pc]}
                </div>
              </div>
              {si < c.chain.length - 1 && <span className="pb-9 font-serif text-sm italic text-amber-500/70">→</span>}
            </div>
          );
        })}
      </div>

      {c.predomUsed && (
        <div className="font-mono text-[11px] text-amber-500/80">
          predominant: {c.predomUsed.toUpperCase()} chosen (smoother bass than {c.predomUsed === 'ii' ? 'IV' : 'ii'})
        </div>
      )}

      <p className="my-3 max-w-2xl text-sm leading-relaxed text-muted" dangerouslySetInnerHTML={{ __html: c.why }} />
      <p
        className="max-w-2xl border-l-2 border-violet-400/40 pl-3 text-xs italic leading-relaxed text-violet-300"
        dangerouslySetInnerHTML={{ __html: `spelled layer · ${c.spell}` }}
      />

      <div className="mt-4 grid max-w-xl grid-cols-4 gap-3">
        {METRIC_BARS.map((b) => (
          <div key={b.key}>
            <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wide text-muted">
              <span>{b.label}</span>
              <span className="text-fg">{pct(c[b.key])}</span>
            </div>
            <div className="h-1 overflow-hidden rounded bg-border">
              <div className={`h-full rounded ${b.color}`} style={{ width: `${pct(c[b.key])}%` }} />
            </div>
          </div>
        ))}
        <div>
          <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wide text-muted">
            <span>Melody</span>
            <span className="text-fg">{c.melNeutral ? '—' : pct(c.melFit)}</span>
          </div>
          <div className="h-1 overflow-hidden rounded bg-border">
            <div className="h-full rounded bg-red-400" style={{ width: `${c.melNeutral ? 0 : pct(c.melFit)}%` }} />
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-5 text-right font-mono">
        <div className="text-2xl font-bold text-amber-400">{(c.total * 100).toFixed(0)}</div>
        <div className="text-[8px] uppercase tracking-widest text-muted">weighted</div>
      </div>
    </div>
  );
}

export default function TransitionEngine() {
  const [sourceTonic, setSourceTonic] = useState(0);
  const [sourceMode, setSourceMode] = useState<ModeName>('Ionian');
  const [targetTonic, setTargetTonic] = useState(2);
  const [targetMode, setTargetMode] = useState<ModeName>('Dorian');
  const [melody, setMelody] = useState('E G');
  const [inferFromMelody, setInferFromMelody] = useState(false);
  const [inferIndex, setInferIndex] = useState(0);
  const [weights, setWeights] = useState<Record<WeightKey, number>>({
    smoothness: 50,
    directness: 50,
    modality: 70,
    melody: 60,
  });

  // Reset the inferred-source selection whenever the melody text changes.
  useEffect(() => {
    setInferIndex(0);
  }, [melody]);

  const result = useMemo(
    () =>
      analyze({
        sourceTonic,
        sourceMode,
        targetTonic,
        targetMode,
        melody,
        weights,
        inferFromMelody,
        inferIndex,
      }),
    [sourceTonic, sourceMode, targetTonic, targetMode, melody, weights, inferFromMelody, inferIndex],
  );

  const sp = speller(targetTonic);

  // Cross-tool association: pick up the key/scale chordgen published to the shared
  // selection and offer to load it as the source state.
  const sharedKeyMode = useStore(selectionStore, (s) => s.selection.keyMode);
  const sharedMode = sharedKeyMode ? SCALE_TO_CHURCH_MODE[sharedKeyMode.scale] : null;
  const sharedMatchesSource =
    sharedKeyMode != null && sharedKeyMode.tonic === sourceTonic && sharedMode === sourceMode;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-serif text-3xl font-light">
        Harmonic <em className="italic text-amber-400">Transition</em> Engine
      </h1>
      <p className="mt-2 max-w-2xl text-sm italic text-muted">
        Set a source and target state, drop in a melody fragment, and tune the four weights. The engine enumerates
        connectors in relative-interval space, scores them on structural metrics, and re-sorts live.
      </p>

      {sharedKeyMode && sharedMode && !sharedMatchesSource && (
        <button
          onClick={() => {
            setSourceTonic(sharedKeyMode.tonic);
            setSourceMode(sharedMode);
            setInferFromMelody(false);
          }}
          className="mt-4 rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm text-accent hover:bg-accent/20"
        >
          Load from chordgen: use {PC_SHARP[sharedKeyMode.tonic]} {sharedMode} as source
        </button>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* States & melody */}
        <div className="rounded border border-border bg-surface p-5">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-amber-400">states &amp; melody</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted">Source tonic</label>
              <TonicSelect value={sourceTonic} disabled={inferFromMelody} onChange={setSourceTonic} />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted">Source mode</label>
              <ModeSelect value={sourceMode} disabled={inferFromMelody} onChange={setSourceMode} />
            </div>
          </div>
          <div className="py-3 text-center font-serif text-lg italic text-amber-400">↧ modulate ↧</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted">Target tonic</label>
              <TonicSelect value={targetTonic} onChange={setTargetTonic} />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted">Target mode</label>
              <ModeSelect value={targetMode} onChange={setTargetMode} />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted">
              Melody fragment at the pivot (optional)
            </label>
            <input
              type="text"
              className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
              value={melody}
              placeholder="e.g.  E  G  A   (space-separated)"
              onChange={(e) => setMelody(e.target.value)}
            />
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={inferFromMelody}
              onChange={(e) => setInferFromMelody(e.target.checked)}
            />
            <span>
              <span className="font-semibold text-sm">Infer source from melody</span>
              <span className="mt-0.5 block text-xs text-muted">
                Ignore the source dropdowns and deduce the most likely starting key/mode from the melody notes alone.
              </span>
            </span>
          </label>

          {inferFromMelody && result.inference && (
            <div className="mt-3">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-amber-400">
                inferred source — pick one
              </div>
              {result.inference.ranking.length === 0 ? (
                <div className="text-xs text-muted">enter melody notes above to infer a source</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {result.inference.ranking.map((r, i) => (
                    <button
                      key={`${r.tonic}-${r.mode}`}
                      onClick={() => setInferIndex(i)}
                      className={`flex items-center gap-2 rounded border bg-bg px-3 py-1.5 font-mono text-xs ${
                        i === result.inference!.selectedIndex
                          ? 'border-amber-500 text-amber-400'
                          : 'border-border text-muted hover:border-amber-500/50 hover:text-fg'
                      }`}
                    >
                      {PC_SHARP[r.tonic]} {r.mode}
                      <span className="text-[10px] text-amber-500/80">{Math.round(r.score * 100)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Relationship panel */}
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="border-l-2 border-border pl-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-muted">Collection overlap</div>
              <div
                className={`mt-0.5 font-mono text-sm ${
                  result.overlap >= 6 ? 'text-emerald-400' : result.overlap <= 3 ? 'text-amber-400' : 'text-fg'
                }`}
              >
                {result.overlap} / 7 notes
              </div>
            </div>
            <div className="border-l-2 border-border pl-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-muted">Target leading tone</div>
              <div className={`mt-0.5 font-mono text-sm ${result.targetHasLT ? 'text-emerald-400' : 'text-amber-400'}`}>
                {result.targetHasLT ? 'present' : 'absent (♭7)'}
              </div>
            </div>
            <div className="col-span-2 border-l-2 border-border pl-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-muted">Shared pitch classes</div>
              <div className="mt-0.5 font-mono text-sm text-fg">
                {result.sharedPitchClasses.map((p) => sp[p]).join('  ') || '—'}
              </div>
            </div>
            <div className="col-span-2 border-l-2 border-border pl-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-muted">Melody common tones</div>
              <div className={`mt-0.5 font-mono text-sm ${result.melodyCommonTones.length ? 'text-emerald-400' : 'text-fg'}`}>
                {result.melodyCommonTones.length
                  ? `${result.melodyCommonTones.map((p) => sp[p]).join('  ')}  → can pivot beneath`
                  : 'none supplied / none shared'}
              </div>
            </div>
          </div>
        </div>

        {/* Weights */}
        <div className="rounded border border-border bg-surface p-5">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-amber-400">dynamic weights</div>
          {WEIGHT_FIELDS.map((f) => (
            <div key={f.key} className="mb-5">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm font-semibold">{f.label}</span>
                <span className="font-mono text-xs text-amber-400">{weights[f.key]}</span>
              </div>
              <p className="mb-2 text-xs text-muted">{f.desc}</p>
              <input
                type="range"
                min={0}
                max={100}
                value={weights[f.key]}
                onChange={(e) => setWeights((w) => ({ ...w, [f.key]: Number(e.target.value) }))}
                className="w-full accent-amber-400"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-baseline justify-between border-b border-border pb-3">
        <h2 className="font-serif text-2xl font-light">Ranked connectors</h2>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {PC_SHARP[result.source.tonic]} {result.source.mode}
          {result.source.inferred ? ' (inferred)' : ''} → {PC_SHARP[result.target.tonic]} {result.target.mode} ·{' '}
          {result.connectors.length} connectors
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {result.connectors.map((c, i) => (
          <ConnectorCard key={`${c.name}-${i}`} c={c} rank={i} targetTonic={targetTonic} />
        ))}
      </div>
    </div>
  );
}
