import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

type IconName = 'today' | 'garden' | 'add' | 'journal' | 'profile';

const navItems: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/today', label: 'Today', icon: 'today' },
  { to: '/garden', label: 'My Garden', icon: 'garden' },
  { to: '/add', label: 'Add', icon: 'add' },
  { to: '/journal', label: 'Journal', icon: 'journal' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
];

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    today: <><path d="M5 3v3M15 3v3M3 8h14"/><rect x="3" y="5" width="14" height="12" rx="3"/><path d="m7 12 2 2 4-5"/></>,
    garden: <><path d="M10 18V9"/><path d="M10 12C6 12 4 9 4 5c4 0 6 2 6 6"/><path d="M10 14c4 0 6-3 6-7-4 0-6 2-6 6"/></>,
    add: <><circle cx="10" cy="10" r="7"/><path d="M10 6v8M6 10h8"/></>,
    journal: <><path d="M5 3h9a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1Z"/><path d="M7 7h6M7 10h6M7 13h3"/></>,
    profile: <><circle cx="10" cy="7" r="3"/><path d="M4 17c.8-3.3 2.8-5 6-5s5.2 1.7 6 5"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 20 20">{paths[name]}</svg>;
}

export default function AppShell() {
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="brand-bar">
        <NavLink to="/today" className="brand-lockup" aria-label="Rosary Plant Care home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>Rosary</strong><small>Plant Care</small></span>
        </NavLink>
        <span className="region-chip">India edition</span>
      </header>
      <main id="main-content" className="app-content">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
