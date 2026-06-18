import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage, loginUser } from '../api/client';
import { Toast } from '../components/ui/Toast';
import { isValidEmail } from '../utils/validation';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser({ username: normalizedEmail, password });
      login(data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to login'));
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
          
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your account to continue monitoring your services.</p>
          
          <div className="auth-trust-badge">
            <div className="auth-trust-icon">
              <ShieldCheck size={20} />
            </div>
            <div className="auth-trust-text">
              <strong>Your monitoring. Your data.</strong>
              Secure, reliable, and built for uptime.
            </div>
          </div>
        </div>
        
        <div className="auth-form-wrapper">
          <form onSubmit={handleSubmit}>
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
                  aria-invalid={error === 'Enter a valid email address.'}
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
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
            
            <div className="auth-form-options">
              <label className="auth-checkbox-label">
                <input type="checkbox" className="auth-checkbox" />
                Remember me
              </label>
              <span className="auth-link">Forgot password?</span>
            </div>
            
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          
          <div className="auth-footer">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </div>
        </div>
      </div>
      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </div>
  );
}
