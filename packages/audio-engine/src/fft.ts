// In-place iterative radix-2 Cooley–Tukey FFT, plus a windowed magnitude
// spectrum helper. Offline analysis only — no real-time pipeline.

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/** In-place complex FFT. `re`/`im` must have the same power-of-two length. */
export function fftRadix2(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (!isPowerOfTwo(n)) throw new Error('FFT length must be a power of two');

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1;
      let cwi = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cwr - im[b] * cwi;
        const ti = re[b] * cwi + im[b] * cwr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncwr = cwr * wr - cwi * wi;
        cwi = cwr * wi + cwi * wr;
        cwr = ncwr;
      }
    }
  }
}

export interface Spectrum {
  /** Bin centre frequencies in Hz (length fftSize/2). */
  frequencies: Float32Array;
  /** Magnitude of each bin in decibels. */
  magnitudesDb: Float32Array;
}

/**
 * Hann-windowed magnitude spectrum of the first `fftSize` samples (zero-padded
 * if shorter). Returns the positive-frequency half.
 */
export function magnitudeSpectrum(samples: Float32Array, fftSize: number, sampleRate: number): Spectrum {
  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);
  const n = Math.min(fftSize, samples.length);
  for (let i = 0; i < n; i++) {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1)); // Hann
    re[i] = samples[i] * window;
  }

  fftRadix2(re, im);

  const bins = fftSize / 2;
  const frequencies = new Float32Array(bins);
  const magnitudesDb = new Float32Array(bins);
  for (let k = 0; k < bins; k++) {
    const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / fftSize;
    frequencies[k] = (k * sampleRate) / fftSize;
    magnitudesDb[k] = 20 * Math.log10(mag + 1e-12);
  }
  return { frequencies, magnitudesDb };
}
