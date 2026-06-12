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
      style={{
        width: 200,
        borderRight: '1px solid rgba(198, 161, 91, 0.18)',
        backgroundColor: 'rgba(10, 11, 14, 0.92)',
        padding: '24px 16px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'inset -1px 0 0 rgba(255, 255, 255, 0.04)',
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <NavLink
          to="/dashboard"
          style={{
            ...navStyle,
            color: isDashboard ? '#F7F0E4' : '#A9A195',
            backgroundColor: isDashboard ? 'rgba(198, 161, 91, 0.15)' : 'transparent',
            borderLeftColor: isDashboard ? '#C6A15B' : 'transparent',
          }}
        >
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            Dashboard
            <span
              style={{
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#F7F0E4',
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
          style={{ color: '#A9A195', fontSize: 13, display: 'inline-flex', gap: 8 }}
        >
          <BookIcon size={15} />
          Docs
        </a>
        <div style={{ color: '#6F685E', fontSize: 12 }}>v0.1.0</div>
      </div>
    </aside>
  );
}
