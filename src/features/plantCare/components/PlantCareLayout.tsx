import { NavLink, Outlet } from 'react-router-dom';

const sections = [
  { to: '/care', label: 'Today', end: true },
  { to: '/care/garden', label: 'My Garden' },
  { to: '/care/add', label: 'Add plant' },
  { to: '/care/journal', label: 'Journal' },
  { to: '/care/settings', label: 'Settings' },
];

export default function PlantCareLayout() {
  return (
    <div className="plant-care-surface">
      <header className="care-masthead">
        <div>
          <p className="care-kicker">Rosary Plant House</p>
          <p className="care-title">Plant Care</p>
        </div>
        <span className="care-region">India edition</span>
      </header>
      <nav className="care-section-nav" aria-label="Plant Care sections">
        {sections.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            end={section.end}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            {section.label}
          </NavLink>
        ))}
      </nav>
      <div className="care-workspace">
        <Outlet />
      </div>
    </div>
  );
}
