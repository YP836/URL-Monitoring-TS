import { NavLink } from 'react-router-dom';

export function Sidebar() {
  return (
    <aside
      style={{
        width: 200,
        borderRight: '1px solid #e0e0e0',
        backgroundColor: '#fafafa',
        padding: '24px 0',
        height: '100%',
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px' }}>
        <NavLink
          to="/"
          style={({ isActive }) => ({
            padding: '8px 12px',
            textDecoration: 'none',
            borderRadius: 6,
            fontWeight: 500,
            color: isActive ? '#000' : '#666',
            backgroundColor: isActive ? '#e8eaed' : 'transparent',
          })}
        >
          Dashboard
        </NavLink>
        <div
          style={{
            padding: '8px 12px',
            color: '#a0a0a0',
            cursor: 'not-allowed',
            fontWeight: 500,
          }}
          title="Coming soon in Phase 3"
        >
          History
        </div>
      </nav>
    </aside>
  );
}
