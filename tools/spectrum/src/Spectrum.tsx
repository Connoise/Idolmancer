import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { selectionStore } from '@idolmancer/data-model';
import { magnitudeSpectrum, mixToMono } from '@idolmancer/audio-engine';
import { colors } from '@idolmancer/tokens';
import { WavImport } from '@idolmancer/ui';

const WIDTH = 920;
const HEIGHT = 280;
const DB_MIN = -100;
const DB_MAX = 0;
const FREQ_MIN = 20;
const FFT_SIZES = [1024, 2048, 4096, 8192] as const;
const GRID_FREQS = [100, 1000, 10000];

export default function Spectrum() {
  const sample = useStore(selectionStore, (s) => s.selection.sample);
  const [fftSize, setFftSize] = useState(4096);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const spectrum = useMemo(() => {
    if (!sample) return null;
    const mono = mixToMono(sample);
    const start = Math.max(0, Math.floor(mono.length / 2 - fftSize / 2));
    return magnitudeSpectrum(mono.subarray(start, start + fftSize), fftSize, sample.sampleRate);
  }, [sample, fftSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = colors.surface;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (!sample || !spectrum) return;
    const nyquist = sample.sampleRate / 2;
    const xOf = (f: number) =>
      (Math.log10(Math.max(f, FREQ_MIN) / FREQ_MIN) / Math.log10(nyquist / FREQ_MIN)) * WIDTH;
    const yOf = (db: number) =>
      (1 - (Math.max(DB_MIN, Math.min(DB_MAX, db)) - DB_MIN) / (DB_MAX - DB_MIN)) * HEIGHT;

    ctx.strokeStyle = colors.border;
    ctx.fillStyle = colors.muted;
    ctx.font = '10px monospace';
    GRID_FREQS.forEach((f) => {
      const x = xOf(f);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
      ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x + 3, HEIGHT - 4);
    });

    ctx.strokeStyle = colors.accent;
    ctx.beginPath();
    const { frequencies, magnitudesDb } = spectrum;
    for (let k = 1; k < frequencies.length; k++) {
      const x = xOf(frequencies[k]);
      const y = yOf(magnitudesDb[k]);
      if (k === 1) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [sample, spectrum]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Spectrum</h1>
      <p className="mt-1 text-muted">
        Frequency-domain (FFT) view of an imported wav file. Log-frequency axis, magnitude in dB.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <WavImport />
        <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-muted">
          FFT size
          <select
            className="rounded border border-border bg-bg px-2 py-1 font-mono text-sm text-fg outline-none focus:border-accent"
            value={fftSize}
            onChange={(e) => setFftSize(Number(e.target.value))}
          >
            {FFT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 overflow-hidden rounded border border-border">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block w-full" />
      </div>
      {!sample && <div className="mt-3 text-sm text-muted">Import a wav file to see its spectrum.</div>}
    </div>
  );
}
