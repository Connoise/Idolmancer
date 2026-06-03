import { describe, expect, it } from 'vitest';
import { memoryBackend } from './backend';
import { deletePreset, listPresets, savePreset } from './presets';

describe('presets', () => {
  it('saves, lists, overwrites by name, and deletes', () => {
    const backend = memoryBackend();
    expect(listPresets(backend)).toEqual([]);

    savePreset('Verse', { keyMode: { tonic: 0, scale: 'Major' }, tempoBpm: 120 }, backend);
    savePreset('Chorus', { keyMode: { tonic: 7, scale: 'Mixolydian' } }, backend);
    expect(listPresets(backend).map((p) => p.name)).toEqual(['Verse', 'Chorus']);

    // Overwrite by name, and confirm the sample is never stored.
    savePreset(
      'Verse',
      {
        keyMode: { tonic: 2, scale: 'Dorian' },
        sample: { name: 's.wav', sampleRate: 44100, channelData: [new Float32Array(1)] },
      },
      backend,
    );
    const verse = listPresets(backend).find((p) => p.name === 'Verse');
    expect(verse?.selection.keyMode).toEqual({ tonic: 2, scale: 'Dorian' });
    expect((verse?.selection as { sample?: unknown }).sample).toBeUndefined();
    expect(listPresets(backend)).toHaveLength(2); // overwrote, not appended

    deletePreset('Verse', backend);
    expect(listPresets(backend).map((p) => p.name)).toEqual(['Chorus']);
  });
});
