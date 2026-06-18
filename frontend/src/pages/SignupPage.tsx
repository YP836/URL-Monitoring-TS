import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, BarChart2 } from 'lucide-react';
import { signupUser, loginUser } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from '../components/ui/Toast';

export function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signupUser({ full_name: fullName, email, password });
      const data = await loginUser({ username: email, password });
      login(data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-hero">
          <div className="auth-logo">
            <div className="auth-logo-circle">U</div>
            <span className="auth-logo-text">Uptime Monitor</span>
          </div>
          
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Start monitoring in minutes. Create your account to get started.</p>
          
          <div className="auth-trust-badge">
            <div className="auth-trust-icon">
              <BarChart2 size={20} />
            </div>
            <div className="auth-trust-text">
              <strong>Monitor everything. Anywhere.</strong>
              Get real-time alerts and detailed insights.
            </div>
          </div>
        </div>
        
        <div className="auth-form-wrapper">
          <form onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <label className="auth-label">Full name</label>
              <div className="auth-input-wrapper">
                <User size={16} className="auth-icon" />
                <input 
                  type="text" 
                  className="auth-input" 
                  placeholder="John Doe" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Email address</label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-icon" />
                <input 
                  type="email" 
                  className="auth-input" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>
            
            <div className="auth-input-group">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-icon" />
                <input 
                  type="password" 
                  className="auth-input" 
                  placeholder="Create a password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  minLength={8}
                />
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>At least 8 characters</div>
            </div>
            
            <div className="auth-form-options" style={{ marginTop: 24 }}>
              <label className="auth-checkbox-label" style={{ fontSize: 12 }}>
                <input type="checkbox" className="auth-checkbox" required />
                <span>I agree to the <span className="auth-link">Terms of Service</span> and <span className="auth-link">Privacy Policy</span></span>
              </label>
            </div>
            
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          
          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </div>
  );
}
