import { selectionStore } from '@idolmancer/data-model';
import { afterEach, describe, expect, it } from 'vitest';
import { memoryBackend } from './backend';
import { persistSelection } from './persist';

afterEach(() => {
  selectionStore.getState().reset();
});

describe('persistSelection', () => {
  it('writes selection changes to the backend (minus the audio sample)', () => {
    const backend = memoryBackend();
    const unsubscribe = persistSelection(backend);

    selectionStore.getState().setKeyMode({ tonic: 7, scale: 'Mixolydian' });
    selectionStore.getState().setSample({ name: 'x.wav', sampleRate: 44100, channelData: [new Float32Array(2)] });

    const raw = backend.get('idolmancer.selection');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.keyMode).toEqual({ tonic: 7, scale: 'Mixolydian' });
    expect(parsed.sample).toBeUndefined(); // samples are not persisted

    unsubscribe();
  });

  it('hydrates the store from previously stored data', () => {
    const backend = memoryBackend();
    backend.set('idolmancer.selection', JSON.stringify({ keyMode: { tonic: 2, scale: 'Dorian' } }));

    const unsubscribe = persistSelection(backend);
    expect(selectionStore.getState().selection.keyMode).toEqual({ tonic: 2, scale: 'Dorian' });
    unsubscribe();
  });
});
