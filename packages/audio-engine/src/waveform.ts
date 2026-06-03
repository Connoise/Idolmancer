export interface Peak {
  min: number;
  max: number;
}

/**
 * Reduce a long sample buffer to `buckets` min/max pairs for waveform drawing —
 * one pair per horizontal pixel column.
 */
export function computePeaks(data: Float32Array, buckets: number): Peak[] {
  const out: Peak[] = [];
  if (buckets <= 0 || data.length === 0) return out;
  const size = Math.max(1, Math.floor(data.length / buckets));
  for (let b = 0; b < buckets; b++) {
    const start = b * size;
    if (start >= data.length) {
      out.push({ min: 0, max: 0 });
      continue;
    }
    const end = Math.min(data.length, start + size);
    let min = Infinity;
    let max = -Infinity;
    for (let i = start; i < end; i++) {
      const v = data[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    out.push({ min, max });
  }
  return out;
}
