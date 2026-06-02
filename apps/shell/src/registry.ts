import type { ComponentType } from 'react';
import type { ToolManifest } from '@idolmancer/data-model';

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
 * Phase 1 will register the existing tools here, e.g.:
 *
 *   {
 *     manifest: chordgenManifest,
 *     load: () => import('@idolmancer/chordgen'),
 *   }
 */
export const tools: ToolRegistryEntry[] = [];

export function findTool(id: string | undefined): ToolRegistryEntry | undefined {
  return tools.find((tool) => tool.manifest.id === id);
}
