import React, { useState } from 'react';
import { Moon, ShieldCheck, KeyRound, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useScreenTime } from '../../context/ScreenTimeContext';

export default function KidsLockScreen() {
  const { user, logout } = useAuth();
  const { status, resetTime } = useScreenTime();
  const [guardianPin, setGuardianPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Lock triggers only when limit is reached and account is child or kids mode
  if (!status.should_lock_screen) return null;

  const handleUnlockWithPin = (e) => {
    e.preventDefault();
    // Default demo guardian PIN: 1234
    if (guardianPin === '1234' || guardianPin === 'admin') {
      resetTime();
    } else {
      setPinError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-2xl flex items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 animate-fade-in">
        {/* Playful sleeping icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
          <Moon size={40} className="animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full">
            Daily Limit Reached
          </span>
          <h2 className="text-2xl font-black text-white">Time's Up for Today! 🌟</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You've reached your {status.daily_screen_time_limit}-minute screen time limit. Great job exploring today! Step away, stretch, and rest your eyes.
          </p>
        </div>

        {/* Parental PIN Override & Demo Reset Form */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <KeyRound size={15} className="text-verity-pink" />
            <span>Parent PIN Override</span>
          </div>

          <form onSubmit={handleUnlockWithPin} className="flex gap-2">
            <input
              type="password"
              placeholder="Enter PIN (Demo: 1234)"
              value={guardianPin}
              onChange={(e) => { setGuardianPin(e.target.value); setPinError(false); }}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl gradient-btn text-xs font-bold text-white shadow"
            >
              Unlock
            </button>
          </form>

          {pinError && (
            <p className="text-[11px] text-red-400">Incorrect PIN. (Use 1234 for demo)</p>
          )}

          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
            <span>Demo reset helper:</span>
            <button
              onClick={resetTime}
              className="flex items-center gap-1 text-emerald-400 hover:underline font-semibold"
            >
              <RotateCcw size={12} /> Reset to 0 mins
            </button>
          </div>
        </div>

        <button
          onClick={logout}
          className="text-xs text-slate-400 hover:text-white underline"
        >
          Sign Out of Verity
        </button>
      </div>
    </div>
  );
}
