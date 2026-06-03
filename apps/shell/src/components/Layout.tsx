import type { ReactNode } from 'react';
import { Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { PresetBar } from '@idolmancer/ui';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-bg text-fg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-surface/60 px-6 py-2.5">
          <PresetBar />
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded px-2 py-1 text-sm ${
                isActive ? 'text-accent' : 'text-muted hover:text-fg'
              }`
            }
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
        </header>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
