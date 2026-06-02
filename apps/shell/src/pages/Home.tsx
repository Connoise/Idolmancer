import { Link } from 'react-router-dom';
import { tools } from '../registry';

export function Home() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Idolmancer</h1>
      <p className="mt-1 text-muted">A music composition and theory workbench.</p>

      {tools.length === 0 ? (
        <div className="mt-8 rounded-lg border border-border bg-surface p-8 text-center text-muted">
          No tools have been registered yet. Tools are integrated in Phase 1.
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4">
          {tools.map((tool) => (
            <li key={tool.manifest.id} className="rounded-lg border border-border bg-surface p-4">
              <Link to={`/tools/${tool.manifest.id}`} className="font-medium text-accent">
                {tool.manifest.name}
              </Link>
              <div className="mt-1 text-xs uppercase tracking-wide text-muted">
                {tool.manifest.category}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
