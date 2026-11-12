import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Heart, ThumbsUp, Radio, Bookmark, ShieldCheck, Baby, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot / Reset Password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newResetPw, setNewResetPw] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1: request, 2: confirm
  const [resetFeedback, setResetFeedback] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(usernameOrEmail.trim(), password, rememberMe);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Incorrect credentials');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (username) => {
    setError('');
    setLoading(true);
    try {
      await login(username, 'password123');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-verity-dark flex flex-col items-center justify-center p-4 selection:bg-verity-pink">
      <div className="max-w-md w-full space-y-6">
        {/* Onboarding Hero Stack matching Reference Image 1 (Left Screen) */}
        <div className="relative w-full h-56 flex items-center justify-center">
          {/* Card 1 - Left angled */}
          <div className="absolute w-36 h-48 rounded-3xl overflow-hidden shadow-2xl -rotate-12 -translate-x-12 translate-y-2 border border-white/20">
            <img
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400"
              alt="Friend moment"
              className="w-full h-full object-cover"
            />
            {/* Live badge */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-600 text-[10px] font-extrabold text-white flex items-center gap-1 shadow">
              <Radio size={8} /> Live!
            </div>
            {/* Awesome reaction badge */}
            <div className="absolute bottom-2 -left-1 px-2.5 py-1 rounded-full bg-pink-600 text-[10px] font-extrabold text-white shadow-lg rotate-6">
              Awesome!
            </div>
          </div>

          {/* Card 2 - Center focused */}
          <div className="absolute w-40 h-52 rounded-3xl overflow-hidden shadow-2xl z-10 border border-white/25">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
              alt="Mila Anderson"
              className="w-full h-full object-cover"
            />
            {/* Thumbs up badge */}
            <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/30 flex items-center justify-center text-amber-400 shadow-lg">
              <ThumbsUp size={14} className="fill-amber-400" />
            </div>
          </div>

          {/* Card 3 - Right angled */}
          <div className="absolute w-36 h-48 rounded-3xl overflow-hidden shadow-2xl rotate-12 translate-x-12 translate-y-3 border border-white/20">
            <img
              src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400"
              alt="Joyful moment"
              className="w-full h-full object-cover"
            />
            {/* Like badge */}
            <div className="absolute top-3 right-2 px-2.5 py-0.5 rounded-full bg-verity-pink text-[10px] font-extrabold text-white shadow-lg -rotate-6">
              Like!
            </div>
            {/* Save it badge */}
            <div className="absolute bottom-3 right-0 px-2.5 py-0.5 rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-lg">
              Save it!
            </div>
          </div>
        </div>

        {/* Hero Heading from Reference Image 1 */}
        <div className="text-center space-y-1.5 px-2">
          <div className="flex items-center justify-center gap-1.5 text-2xl font-black text-white">
            <span>Your Next Creator Is a</span>
            <span className="bg-gradient-to-r from-verity-pink to-verity-coral bg-clip-text text-transparent">
              Verity
            </span>
            <span>Away</span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Discover fresh content, connect with creators, and control your digital time responsibly.
          </p>
        </div>

        {/* Login Form Box */}
        <div className="p-6 rounded-3xl bg-verity-card border border-verity-border shadow-2xl space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Username or Email</label>
              <input
                type="text"
                required
                placeholder="e.g. mila.creates or giri@verity.app"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 accent-verity-pink"
                />
                <span>Remember me</span>
              </label>
              <span 
                onClick={() => { setShowForgotModal(true); setResetStep(1); setResetFeedback(''); }}
                className="text-verity-coral hover:underline cursor-pointer"
              >
                Forgot password?
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl gradient-btn font-extrabold text-sm shadow-xl shadow-pink-500/30 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Selector for Judges/Reviewers */}
          <div className="pt-2 border-t border-slate-800 text-center space-y-2">
            <span className="text-[11px] font-bold text-slate-400">1-Click Demo Accounts:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickLogin('mila.creates')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold flex items-center justify-center gap-1"
              >
                <span>🎨 Mila (Creator)</span>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('giri')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold flex items-center justify-center gap-1"
              >
                <span>👑 Giri (Adult)</span>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('sammy_kid')}
                className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center justify-center gap-1"
              >
                <span>🧸 Sammy (Child)</span>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('alex_mod')}
                className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-semibold flex items-center justify-center gap-1"
              >
                <span>🛡️ Alex (Moderator)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Create Account Link / Age Gate */}
        <div className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <span
            onClick={() => navigate('/age-gate')}
            className="text-verity-coral font-bold cursor-pointer hover:underline"
          >
            Create account
          </span>
        </div>
      </div>

      {/* Forgot / Reset Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-verity-card border border-verity-border rounded-3xl p-6 shadow-2xl space-y-4 text-xs animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Password Recovery</h3>
              <button onClick={() => setShowForgotModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {resetStep === 1 ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await api.forgotPassword(resetEmail);
                    setResetFeedback(res.message);
                    if (res.demo_reset_token) {
                      setResetToken(res.demo_reset_token);
                      setResetStep(2);
                    }
                  } catch (err) {
                    setResetFeedback(err.message);
                  }
                }}
                className="space-y-3"
              >
                <p className="text-slate-400">Enter your registered email address to generate a password reset token.</p>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500"
                />
                {resetFeedback && <p className="text-emerald-400 font-medium">{resetFeedback}</p>}
                <button type="submit" className="w-full py-2.5 rounded-xl gradient-btn font-bold text-white">
                  Send Reset Token
                </button>
              </form>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await api.resetPassword({ token: resetToken, new_password: newResetPw });
                    alert(res.message);
                    setShowForgotModal(false);
                  } catch (err) {
                    setResetFeedback(err.message);
                  }
                }}
                className="space-y-3"
              >
                <p className="text-emerald-400">{resetFeedback}</p>
                <input
                  type="text"
                  required
                  placeholder="Reset token"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="New password (min 6 chars)"
                  value={newResetPw}
                  onChange={(e) => setNewResetPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500"
                />
                <button type="submit" className="w-full py-2.5 rounded-xl gradient-btn font-bold text-white">
                  Reset Password
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
