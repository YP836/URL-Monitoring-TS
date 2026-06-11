import { Badge } from '../ui/Badge';
import { StatusDot } from '../ui/StatusDot';

export function TopBar() {
  return (
    <header
      style={{
        height: 56,
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>Uptime Monitor</div>
      <div>
        <Badge
          variant="success"
          label={
            <>
              <StatusDot status="UP" /> Live
            </>
          }
        />
      </div>
    </header>
  );
}
