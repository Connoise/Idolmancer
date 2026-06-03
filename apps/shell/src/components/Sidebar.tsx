import { Music4 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { tools } from '../registry';

export function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4">
      <NavLink to="/" className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Music4 className="h-5 w-5 text-accent" />
        Idolmancer
      </NavLink>

      <div className="px-2 text-xs uppercase tracking-wide text-muted">Tools</div>

      {tools.length === 0 && (
        <p className="px-2 py-1 text-sm text-muted">No tools registered yet.</p>
      )}

      {tools.map((tool) => (
        <NavLink
          key={tool.manifest.id}
          to={`/tools/${tool.manifest.id}`}
          className={({ isActive }) =>
            `rounded px-2 py-1.5 text-sm transition-colors hover:bg-surface-2 ${
              isActive ? 'bg-surface-2 text-accent' : 'text-fg'
            }`
          }
        >
          {tool.manifest.name}
        </NavLink>
      ))}
    </aside>
  );
}
