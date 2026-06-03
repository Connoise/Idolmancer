import type { ComponentType } from 'react';
import type { ToolManifest } from '@idolmancer/data-model';
import { manifest as chordgen } from '@idolmancer/chordgen/manifest';
import { manifest as transitionEngine } from '@idolmancer/transition-engine/manifest';
import { manifest as harmonics } from '@idolmancer/harmonics/manifest';
import { manifest as bpmMs } from '@idolmancer/bpm-ms/manifest';
import { manifest as waveform } from '@idolmancer/waveform/manifest';
import { manifest as spectrum } from '@idolmancer/spectrum/manifest';
import { manifest as eqPreview } from '@idolmancer/eq-preview/manifest';

/**
 * A registered tool: its framework-agnostic manifest plus a lazy loader for its
 * React component. The shell discovers tools purely through this registry, so
 * adding a tool is one entry here — no other shell code changes.
 */
export interface ToolRegistryEntry {
  manifest: ToolManifest;
  load: () => Promise<{ default: ComponentType }>;
}

/**
 * The registered tools. Manifests are imported eagerly (they are tiny); each
 * tool's component is loaded lazily on navigation so heavy dependencies (Tone.js,
 * etc.) are not pulled into the initial bundle.
 */
export const tools: ToolRegistryEntry[] = [
  { manifest: chordgen, load: () => import('@idolmancer/chordgen') },
  { manifest: transitionEngine, load: () => import('@idolmancer/transition-engine') },
  { manifest: harmonics, load: () => import('@idolmancer/harmonics') },
  { manifest: bpmMs, load: () => import('@idolmancer/bpm-ms') },
  { manifest: waveform, load: () => import('@idolmancer/waveform') },
  { manifest: spectrum, load: () => import('@idolmancer/spectrum') },
  { manifest: eqPreview, load: () => import('@idolmancer/eq-preview') },
];

export function findTool(id: string | undefined): ToolRegistryEntry | undefined {
  return tools.find((tool) => tool.manifest.id === id);
}
