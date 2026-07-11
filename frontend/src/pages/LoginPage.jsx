import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../services/api';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { token } = await api.auth.login(username, password);
      setToken(token);
      toast.success('Logged in');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="card w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Shield className="w-12 h-12 text-brand-400 mb-3" />
          <h1 className="text-2xl font-bold text-brand-300">Backup Central</h1>
          <p className="text-gray-500 text-sm mt-1">Container Backup Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input
              type="text"
              className="input-field"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
