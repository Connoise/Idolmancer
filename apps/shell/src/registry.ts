import type { ComponentType } from 'react';
import type { ToolManifest } from '@idolmancer/data-model';
import { manifest as chordgen } from '@idolmancer/chordgen/manifest';
import { manifest as transitionEngine } from '@idolmancer/transition-engine/manifest';

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
];

export function findTool(id: string | undefined): ToolRegistryEntry | undefined {
  return tools.find((tool) => tool.manifest.id === id);
}
