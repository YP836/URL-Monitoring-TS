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
  const { logout } = useAuth();
  const isUrlDetail = location.pathname.startsWith('/urls/');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav" aria-label="Operational navigation">
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

      <div className="sidebar-footer">
        <a
          href={`${import.meta.env.VITE_API_BASE_URL}/docs`}
          target="_blank"
          rel="noreferrer"
          className="sidebar-doc-link"
        >
          <BookIcon size={15} />
          API Docs
        </a>
        <button
          onClick={handleLogout}
          className="sidebar-doc-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left', marginTop: '12px' }}
        >
          <i className="ti ti-logout" style={{ marginRight: '8px' }} />
          Log out
        </button>
      </div>
    </aside>
  );
}

