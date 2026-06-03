import { useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { selectionStore } from '@idolmancer/data-model';
import { computePeaks, mixToMono, sampleDuration } from '@idolmancer/audio-engine';
import { colors } from '@idolmancer/tokens';
import { WavImport } from '@idolmancer/ui';

const WIDTH = 920;
const HEIGHT = 240;

export default function Waveform() {
  const sample = useStore(selectionStore, (s) => s.selection.sample);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = colors.surface;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = colors.border;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT / 2);
    ctx.lineTo(WIDTH, HEIGHT / 2);
    ctx.stroke();

    if (!sample) return;
    const peaks = computePeaks(mixToMono(sample), WIDTH);
    ctx.strokeStyle = colors.accent;
    ctx.beginPath();
    peaks.forEach((p, x) => {
      const yMax = (1 - (p.max + 1) / 2) * HEIGHT;
      const yMin = (1 - (p.min + 1) / 2) * HEIGHT;
      ctx.moveTo(x + 0.5, yMax);
      ctx.lineTo(x + 0.5, yMin);
    });
    ctx.stroke();
  }, [sample]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Waveform</h1>
      <p className="mt-1 text-muted">Time-domain view of an imported wav file (channels mixed to mono).</p>

      <div className="mt-4">
        <WavImport />
      </div>

      <div className="mt-6 overflow-hidden rounded border border-border">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block w-full" />
      </div>

      {sample ? (
        <div className="mt-3 font-mono text-xs text-muted">
          {sampleDuration(sample).toFixed(3)} s · {sample.channelData[0]?.length.toLocaleString()} frames @{' '}
          {sample.sampleRate.toLocaleString()} Hz
        </div>
      ) : (
        <div className="mt-3 text-sm text-muted">Import a wav file to see its waveform.</div>
      )}
    </div>
  );
}
