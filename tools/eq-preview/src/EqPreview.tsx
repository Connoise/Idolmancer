import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { selectionStore } from '@idolmancer/data-model';
import {
  applyBiquad,
  designBiquad,
  magnitudeResponseDb,
  magnitudeSpectrum,
  mixToMono,
  type BiquadType,
} from '@idolmancer/audio-engine';
import { colors } from '@idolmancer/tokens';
import { WavImport } from '@idolmancer/ui';

const WIDTH = 920;
const HEIGHT = 260;
const FREQ_MIN = 20;
const RESP_DB = 24; // response curve spans ±24 dB
const SPEC_FFT = 4096;
const TYPES: BiquadType[] = ['lowpass', 'highpass', 'peaking', 'lowshelf', 'highshelf'];

// Assume a standard sample rate when no file is loaded so the curve still draws.
const FALLBACK_SR = 44100;

export default function EqPreview() {
  const sample = useStore(selectionStore, (s) => s.selection.sample);
  const [type, setType] = useState<BiquadType>('peaking');
  const [freq, setFreq] = useState(1000);
  const [q, setQ] = useState(1);
  const [gainDb, setGainDb] = useState(6);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sampleRate = sample?.sampleRate ?? FALLBACK_SR;
  const coeffs = useMemo(
    () => designBiquad({ type, freq, Q: q, gainDb }, sampleRate),
    [type, freq, q, gainDb, sampleRate],
  );

  // Original vs filtered spectra, computed offline when a sample is present.
  const spectra = useMemo(() => {
    if (!sample) return null;
    const mono = mixToMono(sample);
    const start = Math.max(0, Math.floor(mono.length / 2 - SPEC_FFT / 2));
    const slice = mono.subarray(start, start + SPEC_FFT);
    const filtered = applyBiquad(slice, coeffs);
    return {
      original: magnitudeSpectrum(slice, SPEC_FFT, sampleRate),
      filtered: magnitudeSpectrum(filtered, SPEC_FFT, sampleRate),
    };
  }, [sample, coeffs, sampleRate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const nyquist = sampleRate / 2;
    const xOf = (f: number) =>
      (Math.log10(Math.max(f, FREQ_MIN) / FREQ_MIN) / Math.log10(nyquist / FREQ_MIN)) * WIDTH;
    const respY = (db: number) => (1 - (Math.max(-RESP_DB, Math.min(RESP_DB, db)) + RESP_DB) / (2 * RESP_DB)) * HEIGHT;

    ctx.fillStyle = colors.surface;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // 0 dB line + frequency grid
    ctx.strokeStyle = colors.border;
    ctx.beginPath();
    ctx.moveTo(0, respY(0));
    ctx.lineTo(WIDTH, respY(0));
    ctx.stroke();
    ctx.fillStyle = colors.muted;
    ctx.font = '10px monospace';
    [100, 1000, 10000].forEach((f) => {
      const x = xOf(f);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
      ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x + 3, HEIGHT - 4);
    });

    // Faint original/filtered spectra (scaled into the same vertical space).
    if (spectra) {
      const specY = (db: number) => (1 - (Math.max(-100, Math.min(0, db)) + 100) / 100) * HEIGHT;
      const drawSpec = (mags: Float32Array, freqs: Float32Array, color: string) => {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        for (let k = 1; k < freqs.length; k++) {
          const x = xOf(freqs[k]);
          const y = specY(mags[k]);
          if (k === 1) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      };
      drawSpec(spectra.original.magnitudesDb, spectra.original.frequencies, colors.muted);
      drawSpec(spectra.filtered.magnitudesDb, spectra.filtered.frequencies, colors.fg);
    }

    // The response curve (bold accent).
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x++) {
      const f = FREQ_MIN * Math.pow(nyquist / FREQ_MIN, x / WIDTH);
      const y = respY(magnitudeResponseDb(coeffs, f, sampleRate));
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  }, [coeffs, spectra, sampleRate]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">EQ Preview</h1>
      <p className="mt-1 text-muted">
        Design a filter and see its frequency-response curve. Load a wav file to overlay how the curve reshapes its
        spectrum (grey = original, white = filtered).
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-4 rounded border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-widest text-muted">
          Filter type
          <select
            className="rounded border border-border bg-bg px-2 py-1.5 font-mono text-sm text-fg outline-none focus:border-accent"
            value={type}
            onChange={(e) => setType(e.target.value as BiquadType)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <Slider label={`Freq ${freq} Hz`} min={20} max={20000} step={10} value={freq} onChange={setFreq} />
        <Slider label={`Q ${q.toFixed(2)}`} min={0.1} max={10} step={0.1} value={q} onChange={setQ} />
        <Slider label={`Gain ${gainDb} dB`} min={-24} max={24} step={1} value={gainDb} onChange={setGainDb} />
      </div>

      <div className="mt-3">
        <WavImport />
      </div>

      <div className="mt-6 overflow-hidden rounded border border-border">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block w-full" />
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-widest text-muted">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-44 accent-accent"
      />
    </label>
  );
}
