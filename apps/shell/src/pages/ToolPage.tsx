import { lazy, Suspense, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { findTool } from '../registry';

export function ToolPage() {
  const { id } = useParams();
  const entry = useMemo(() => findTool(id), [id]);
  const ToolComponent = useMemo(() => (entry ? lazy(entry.load) : null), [entry]);

  if (!entry || !ToolComponent) {
    return <p className="text-muted">Tool not found: {id}</p>;
  }

  return (
    <Suspense fallback={<p className="text-muted">Loading {entry.manifest.name}…</p>}>
      <ToolComponent />
    </Suspense>
  );
}
