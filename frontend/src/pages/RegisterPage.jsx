import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Baby, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const isChildPreselected = searchParams.get('age_group') === 'child';
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState(isChildPreselected ? '2016-01-01' : '2000-01-01');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        email,
        username,
        display_name: displayName,
        password,
        birth_date: birthDate,
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-verity-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-verity-card border border-verity-border shadow-2xl space-y-5 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button 
            onClick={() => navigate('/age-gate')} 
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="font-extrabold text-sm text-white">Create Verity Account</span>
          <div className="w-6" />
        </div>

        {isChildPreselected && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300 font-medium">
            <Baby size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>Child Account Protection Active: Kids Mode, 30m limit, and Learning/Art content are automatically enabled.</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Display Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Mila Anderson"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Username</label>
            <input
              type="text"
              required
              placeholder="e.g. mila.creates"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Date of Birth</label>
            <input
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-verity-pink"
            />
            <p className="text-[10px] text-slate-400 mt-1">Our backend validates this to determine your safe account classification.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl gradient-btn font-extrabold text-sm shadow-xl shadow-pink-500/25 disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <span 
            onClick={() => navigate('/login')} 
            className="text-verity-coral font-bold cursor-pointer hover:underline"
          >
            Sign in
          </span>
        </div>
      </div>
    </div>
  );
}
