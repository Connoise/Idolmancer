import { useRef, useState } from 'react';
import { useStore } from 'zustand';
import { selectionStore } from '@idolmancer/data-model';
import { parseWav, sampleDuration } from '@idolmancer/audio-engine';

/**
 * Shared wav-file import control. Decodes the file offline, stores it on the
 * shared selection, and shows what is currently loaded. Used by every analysis
 * tool so the sample is imported once and read everywhere.
 */
export function WavImport() {
  const sample = useStore(selectionStore, (s) => s.selection.sample);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const decoded = parseWav(buffer);
      selectionStore.getState().setSample({ ...decoded, name: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read file');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".wav,audio/wav,audio/x-wav"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm text-accent hover:bg-accent/20"
      >
        Import WAV…
      </button>
      {sample && (
        <span className="font-mono text-xs text-muted">
          {sample.name} · {(sample.sampleRate / 1000).toFixed(1)} kHz · {sample.channelData.length}ch ·{' '}
          {sampleDuration(sample).toFixed(2)}s
        </span>
      )}
      {error && <span className="font-mono text-xs text-red-400">{error}</span>}
    </div>
  );
}
