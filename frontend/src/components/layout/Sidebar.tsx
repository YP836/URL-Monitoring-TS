import { NavLink, useLocation } from 'react-router-dom';
import { BookIcon } from '../ui/Icons';

interface SidebarProps {
  urlCount: number;
}

export function Sidebar({ urlCount }: SidebarProps) {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/urls/');

  const navStyle = {
    padding: '9px 12px',
    textDecoration: 'none',
    borderRadius: 6,
    fontWeight: 500,
    transition: 'background 0.15s, color 0.15s',
    borderLeft: '3px solid transparent',
  };

  return (
    <aside
      className="sidebar"
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <NavLink
          to="/dashboard"
          style={{
            ...navStyle,
            color: isDashboard ? '#111827' : '#6B7280',
            backgroundColor: isDashboard ? 'rgba(255, 127, 80, 0.1)' : 'transparent',
            borderLeftColor: isDashboard ? '#FF7F50' : 'transparent',
          }}
        >
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            Dashboard
            <span
              style={{
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: 'rgba(255, 127, 80, 0.1)',
                color: '#D6543D',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
              }}
            >
              {urlCount}
            </span>
          </span>
        </NavLink>
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <a
          href={`${import.meta.env.VITE_API_BASE_URL}/docs`}
          target="_blank"
          rel="noreferrer"
          style={{ color: '#6B7280', fontSize: 13, display: 'inline-flex', gap: 8 }}
        >
          <BookIcon size={15} />
          Docs
        </a>
        <div style={{ color: '#9CA3AF', fontSize: 12 }}>v0.1.0</div>
      </div>
    </aside>
  );
}
