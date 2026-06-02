import type { AudioSample } from '@idolmancer/data-model';

// A dependency-free WAV (RIFF/PCM) decoder. We parse wav files directly rather
// than relying on the Web Audio AudioContext so decoding is deterministic,
// offline, and unit-testable in Node. Supports 8/16/24/32-bit integer and
// 32/64-bit float PCM, any channel count.

function readId(view: DataView, offset: number): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

interface WavFormat {
  audioFormat: number;
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

export function parseWav(buffer: ArrayBuffer): AudioSample {
  const view = new DataView(buffer);
  if (readId(view, 0) !== 'RIFF' || readId(view, 8) !== 'WAVE') {
    throw new Error('Not a RIFF/WAVE file');
  }

  let fmt: WavFormat | null = null;
  let dataOffset = -1;
  let dataLength = 0;

  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const id = readId(view, offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      fmt = {
        audioFormat: view.getUint16(body, true),
        numChannels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        bitsPerSample: view.getUint16(body + 14, true),
      };
    } else if (id === 'data') {
      dataOffset = body;
      dataLength = Math.min(size, view.byteLength - body);
    }
    offset = body + size + (size % 2); // chunks are word-aligned
  }

  if (!fmt) throw new Error('Missing fmt chunk');
  if (dataOffset < 0) throw new Error('Missing data chunk');

  const { audioFormat, numChannels, sampleRate, bitsPerSample } = fmt;
  const bytesPerSample = bitsPerSample / 8;
  const frameCount = Math.floor(dataLength / (bytesPerSample * numChannels));
  const isFloat = audioFormat === 3;
  const channels = Array.from({ length: numChannels }, () => new Float32Array(frameCount));

  for (let i = 0; i < frameCount; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const p = dataOffset + (i * numChannels + ch) * bytesPerSample;
      let v: number;
      if (isFloat) {
        v = bitsPerSample === 64 ? view.getFloat64(p, true) : view.getFloat32(p, true);
      } else if (bitsPerSample === 16) {
        v = view.getInt16(p, true) / 32768;
      } else if (bitsPerSample === 24) {
        const b0 = view.getUint8(p);
        const b1 = view.getUint8(p + 1);
        const b2 = view.getUint8(p + 2);
        let int = (b2 << 16) | (b1 << 8) | b0;
        if (int & 0x800000) int |= ~0xffffff; // sign-extend
        v = int / 8388608;
      } else if (bitsPerSample === 32) {
        v = view.getInt32(p, true) / 2147483648;
      } else if (bitsPerSample === 8) {
        v = (view.getUint8(p) - 128) / 128; // 8-bit PCM is unsigned
      } else {
        throw new Error(`Unsupported bit depth: ${bitsPerSample}`);
      }
      channels[ch][i] = v;
    }
  }

  return { name: 'imported.wav', sampleRate, channelData: channels };
}

/** Down-mix all channels to a single mono buffer (simple average). */
export function mixToMono(sample: AudioSample): Float32Array {
  const length = sample.channelData[0]?.length ?? 0;
  const out = new Float32Array(length);
  const channels = sample.channelData.length;
  if (channels === 0) return out;
  for (let ch = 0; ch < channels; ch++) {
    const data = sample.channelData[ch];
    for (let i = 0; i < length; i++) out[i] += data[i] / channels;
  }
  return out;
}

/** Duration of a sample in seconds. */
export function sampleDuration(sample: AudioSample): number {
  return (sample.channelData[0]?.length ?? 0) / sample.sampleRate;
}
