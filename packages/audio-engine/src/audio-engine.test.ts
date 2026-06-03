import { describe, expect, it } from 'vitest';
import {
  applyBiquad,
  computePeaks,
  designBiquad,
  magnitudeResponseDb,
  magnitudeSpectrum,
  mixToMono,
  parseWav,
} from './index';

/** Encode a mono 16-bit PCM WAV from a Float32 buffer (for round-trip tests). */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(v * 32767), true);
  }
  return buffer;
}

function sine(freq: number, sampleRate: number, length: number): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return out;
}

describe('wav', () => {
  it('round-trips a 16-bit PCM mono wav', () => {
    const original = sine(440, 8000, 800);
    const sample = parseWav(encodeWav(original, 8000));
    expect(sample.sampleRate).toBe(8000);
    expect(sample.channelData.length).toBe(1);
    expect(sample.channelData[0].length).toBe(800);
    // 16-bit quantisation keeps values within ~1/32768.
    expect(sample.channelData[0][100]).toBeCloseTo(original[100], 3);
  });

  it('rejects non-wav data', () => {
    expect(() => parseWav(new ArrayBuffer(64))).toThrow();
  });

  it('mixes channels to mono', () => {
    const mono = mixToMono({
      name: 't',
      sampleRate: 100,
      channelData: [new Float32Array([1, 1]), new Float32Array([-1, 0])],
    });
    expect(Array.from(mono)).toEqual([0, 0.5]);
  });
});

describe('fft', () => {
  it('locates the bin of a pure sine tone', () => {
    const sampleRate = 8192;
    const fftSize = 1024;
    const freq = 512; // exactly on bin 64
    const { frequencies, magnitudesDb } = magnitudeSpectrum(sine(freq, sampleRate, fftSize), fftSize, sampleRate);
    let peak = 0;
    for (let k = 1; k < magnitudesDb.length; k++) if (magnitudesDb[k] > magnitudesDb[peak]) peak = k;
    expect(frequencies[peak]).toBeCloseTo(freq, 0);
  });
});

describe('waveform peaks', () => {
  it('produces the requested number of min/max buckets', () => {
    const peaks = computePeaks(sine(50, 1000, 1000), 100);
    expect(peaks.length).toBe(100);
    expect(peaks[25].max).toBeGreaterThanOrEqual(peaks[25].min);
  });
});

describe('biquad', () => {
  it('passes DC through a lowpass and attenuates high frequencies', () => {
    const sr = 44100;
    const c = designBiquad({ type: 'lowpass', freq: 1000, Q: 0.707, gainDb: 0 }, sr);
    expect(magnitudeResponseDb(c, 20, sr)).toBeCloseTo(0, 0);
    expect(magnitudeResponseDb(c, 15000, sr)).toBeLessThan(-20);
  });

  it('peaking filter boosts by ~gain at its centre frequency', () => {
    const sr = 44100;
    const c = designBiquad({ type: 'peaking', freq: 1000, Q: 1, gainDb: 6 }, sr);
    expect(magnitudeResponseDb(c, 1000, sr)).toBeCloseTo(6, 1);
  });

  it('lowpass filtering reduces high-frequency energy in a signal', () => {
    const sr = 44100;
    const high = sine(15000, sr, 8192);
    const c = designBiquad({ type: 'lowpass', freq: 1000, Q: 0.707, gainDb: 0 }, sr);
    const filtered = applyBiquad(high, c);
    const rms = (d: Float32Array) => Math.sqrt(d.reduce((s, v) => s + v * v, 0) / d.length);
    expect(rms(filtered)).toBeLessThan(rms(high) * 0.5);
  });
});
