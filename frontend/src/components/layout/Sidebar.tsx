import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BookIcon } from '../ui/Icons';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  urlCount: number;
}

const navGroups = [
  {
    label: 'Operations',
    items: [
      { to: '/dashboard', label: 'Home', icon: 'ti-home-2' },
      { to: '/monitors', label: 'Monitors', icon: 'ti-radar-2', countKey: 'urlCount' },
      { to: '/incidents', label: 'Incidents', icon: 'ti-alert-triangle', count: 3 },
      { to: '/status-pages', label: 'Status Pages', icon: 'ti-world-share' },
    ],
  },
  {
    label: 'Control',
    items: [
      { to: '/maintenance', label: 'Maintenance', icon: 'ti-calendar-time' },
      { to: '/alerts', label: 'Alerts', icon: 'ti-bell-ringing', count: 4 },
      { to: '/reports', label: 'Reports', icon: 'ti-file-analytics' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/integrations', label: 'Integrations', icon: 'ti-plug-connected' },
      { to: '/settings', label: 'Settings', icon: 'ti-settings' },
    ],
  },
];

export function Sidebar({ urlCount }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isUrlDetail = location.pathname.startsWith('/urls/');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar" style={{ width: '240px', padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
      <div className="sidebar-brand">
        Uptime Monitor
        <i className="ti ti-chevrons-left" style={{ marginLeft: 'auto', color: '#9CA3AF', cursor: 'pointer' }} />
      </div>

      <nav className="sidebar-nav" aria-label="Operational navigation" style={{ flex: 1, overflowY: 'auto' }}>
        {navGroups.map((group) => (
          <div className="sidebar-group" key={group.label}>
            <div className="sidebar-group-label">{group.label}</div>
            {group.items.map((item) => {
              const count = item.countKey === 'urlCount' ? urlCount : item.count;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => {
                    const active = isActive || (isUrlDetail && item.to === '/monitors');
                    return `sidebar-link${active ? ' active' : ''}`;
                  }}
                >
                  <span className="sidebar-link-main">
                    <i className={`ti ${item.icon}`} aria-hidden="true" />
                    {item.label}
                  </span>
                  {typeof count === 'number' && <span className="sidebar-count">{count}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <a
          href={`${import.meta.env.VITE_API_BASE_URL}/docs`}
          target="_blank"
          rel="noreferrer"
          className="sidebar-doc-link"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4B5563', fontSize: '13px', textDecoration: 'none', marginBottom: '16px' }}
        >
          <BookIcon size={15} />
          API Docs
        </a>
        <button
          onClick={handleLogout}
          className="sidebar-doc-link"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left', color: '#4B5563', fontSize: '13px', marginBottom: '24px' }}
        >
          <i className="ti ti-logout" />
          Log out
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: '#FFF', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FFE4E1', color: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name || 'User'}</div>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>Admin</div>
          </div>
          <i className="ti ti-chevron-down" style={{ color: '#9CA3AF', fontSize: '14px' }} />
        </div>
      </div>
    </aside>
  );
}

