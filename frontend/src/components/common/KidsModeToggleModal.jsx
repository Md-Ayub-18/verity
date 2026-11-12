import React, { useState, useEffect } from 'react';
import { Unlock, X, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function KidsModeToggleModal() {
  const { kidsModalMode, setKidsModalMode, confirmUnlockKidsMode } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    setCode('');
  }, [kidsModalMode]);

  if (kidsModalMode !== 'unlock') return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the current time password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await confirmUnlockKidsMode(code.trim());
    } catch (err) {
      setError(err.message || 'Incorrect current time password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#191D2D]/95 border border-white/10 rounded-[20px] p-6 shadow-2xl space-y-4 text-xs text-[#F4F5FF] animate-slide-up">
        <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
              <Clock size={17} />
            </div>
            <h3 className="font-extrabold text-base text-[#F4F5FF]">
              Unlock Kids Mode
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setKidsModalMode(null)}
            className="p-1 text-[#A0A8BE] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <p className="text-[#A0A8BE] leading-relaxed">
              Enter password to exit Kids Mode.
            </p>
            <p className="text-[11px] font-semibold text-amber-300">
              Hint : Time
            </p>
          </div>

          <input
            type="password"
            inputMode="numeric"
            required
            autoFocus
            placeholder="Enter password"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError('');
            }}
            className="w-full px-3.5 py-2.5 rounded-[14px] !bg-[#0B0D17] !border !border-white/15 text-center font-mono text-lg font-bold tracking-widest !text-[#F4F5FF] placeholder-slate-500 focus:outline-none focus:!border-[#8657FF]"
          />

          {error && (
            <p className="text-[#FF477E] font-semibold bg-[#FF477E]/10 border border-[#FF477E]/30 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setKidsModalMode(null)}
              className="flex-1 py-2.5 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.1] text-[#A0A8BE] hover:text-white font-bold"
            >
              Stay in Kids Mode
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-[12px] gradient-btn text-white font-bold flex items-center justify-center gap-1.5"
            >
              <Unlock size={14} /> {loading ? 'Checking...' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

