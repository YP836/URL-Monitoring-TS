import { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { getUsers, deleteUser, updateUser } from '../api/client';
import { AdminUserOverview, UserUpdate } from '../types';
import { Badge } from '../components/ui/Badge';
import { Toast } from '../components/ui/Toast';

export function TeamPage() {
  const [users, setUsers] = useState<AdminUserOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
      setError(null);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user? All their monitors will also be deleted. This cannot be undone.')) {
      return;
    }
    try {
      await deleteUser(id);
      setToast('User successfully deleted');
      void fetchUsers();
    } catch (e: any) {
      alert(e.response?.data?.detail || e.message || 'Failed to delete user');
    }
  };

  const handlePromote = async (id: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'viewer' : 'admin';
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }
    try {
      await updateUser(id, { role: newRole });
      setToast(`User promoted to ${newRole}`);
      void fetchUsers();
    } catch (e: any) {
      alert(e.response?.data?.detail || e.message || 'Failed to update user');
    }
  };

  return (
    <PageLayout title="Team Management" subtitle="Manage viewers, admins, and oversee workspace access.">
      {toast && <Toast message={toast} onClose={() => setToast(null)} type="success" />}
      
      <div className="ops-panel" style={{ marginTop: '24px' }}>
        <div className="ops-panel-header">
          <div>
            <p className="ops-kicker">Workspace members</p>
            <h3>All users in your organization</h3>
          </div>
          <Badge variant="neutral" label={`${users.length} members`} />
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Loading users...</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#E24B4A' }}>{error}</div>
        ) : (
          <div className="ops-table-wrap">
            <table className="ops-fleet-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Monitors</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="ops-monitor-cell">
                        <strong>{user.full_name}</strong>
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="ops-mini-chip" style={{ background: user.role === 'admin' ? '#E8F5E9' : '#F3F4F6', color: user.role === 'admin' ? '#2E7D32' : '#374151' }}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                        {user.url_count} {user.url_count === 1 ? 'monitor' : 'monitors'}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#6B7280' }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="ops-table-action"
                          onClick={() => handlePromote(user.id, user.role)}
                          title={user.role === 'admin' ? 'Demote to viewer' : 'Promote to admin'}
                        >
                          <i className="ti ti-shield" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="ops-table-action"
                          style={{ color: '#E24B4A' }}
                          onClick={() => handleDelete(user.id)}
                          title="Delete user"
                        >
                          <i className="ti ti-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
