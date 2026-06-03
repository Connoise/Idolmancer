// RBJ "Audio EQ Cookbook" biquad filters. Used by the EQ-preview tool to draw a
// frequency-response curve and to apply that curve offline to a loaded sample.

export type BiquadType = 'lowpass' | 'highpass' | 'peaking' | 'lowshelf' | 'highshelf';

export interface BiquadParams {
  type: BiquadType;
  /** Centre/cutoff frequency in Hz. */
  freq: number;
  /** Quality factor / resonance. */
  Q: number;
  /** Gain in dB (used by peaking and shelving filters). */
  gainDb: number;
}

export interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/** Compute normalised biquad coefficients for a filter at a given sample rate. */
export function designBiquad(params: BiquadParams, sampleRate: number): BiquadCoeffs {
  const { type, freq, Q, gainDb } = params;
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const A = Math.pow(10, gainDb / 40);
  const alpha = sin / (2 * Q);

  let b0: number;
  let b1: number;
  let b2: number;
  let a0: number;
  let a1: number;
  let a2: number;

  switch (type) {
    case 'lowpass':
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
    case 'peaking':
      b0 = 1 + alpha * A;
      b1 = -2 * cos;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cos;
      a2 = 1 - alpha / A;
      break;
    case 'lowshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 - (A - 1) * cos + s);
      b1 = 2 * A * (A - 1 - (A + 1) * cos);
      b2 = A * (A + 1 - (A - 1) * cos - s);
      a0 = A + 1 + (A - 1) * cos + s;
      a1 = -2 * (A - 1 + (A + 1) * cos);
      a2 = A + 1 + (A - 1) * cos - s;
      break;
    }
    case 'highshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 + (A - 1) * cos + s);
      b1 = -2 * A * (A - 1 + (A + 1) * cos);
      b2 = A * (A + 1 + (A - 1) * cos - s);
      a0 = A + 1 - (A - 1) * cos + s;
      a1 = 2 * (A - 1 - (A + 1) * cos);
      a2 = A + 1 - (A - 1) * cos - s;
      break;
    }
    default:
      throw new Error(`Unknown biquad type: ${type as string}`);
  }

  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Magnitude of the filter's frequency response at `freq`, in decibels. */
export function magnitudeResponseDb(c: BiquadCoeffs, freq: number, sampleRate: number): number {
  const w = (2 * Math.PI * freq) / sampleRate;
  const cos1 = Math.cos(w);
  const cos2 = Math.cos(2 * w);
  const sin1 = Math.sin(w);
  const sin2 = Math.sin(2 * w);
  const numRe = c.b0 + c.b1 * cos1 + c.b2 * cos2;
  const numIm = -(c.b1 * sin1 + c.b2 * sin2);
  const denRe = 1 + c.a1 * cos1 + c.a2 * cos2;
  const denIm = -(c.a1 * sin1 + c.a2 * sin2);
  const num = Math.hypot(numRe, numIm);
  const den = Math.hypot(denRe, denIm);
  return 20 * Math.log10(num / den);
}

/** Apply the biquad to a sample buffer (direct-form I), returning a new buffer. */
export function applyBiquad(data: Float32Array, c: BiquadCoeffs): Float32Array {
  const out = new Float32Array(data.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  return out;
}
