import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Sparkles, UserCheck, Baby, ArrowLeft } from 'lucide-react';

export default function AgeGatePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-verity-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-verity-card border border-verity-border shadow-2xl text-center space-y-6 animate-slide-up">
        {/* Brand Logo */}
        <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-verity-pink to-verity-coral flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-pink-500/25">
          V
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-black text-white">How old are you?</h1>
          <p className="text-xs text-slate-400">
            Verity provides age-tailored experiences and strong protections for young creators.
          </p>
        </div>

        <div className="space-y-3.5 pt-2">
          {/* Option A: 13 or older */}
          <button
            onClick={() => navigate('/register?age_group=teen_adult')}
            className="w-full p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-verity-pink/50 text-left transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-verity-pink/20 text-verity-pink flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCheck size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">I'm 13 or older</h3>
                <p className="text-[11px] text-slate-400">Standard registration with full interests & discovery</p>
              </div>
            </div>
          </button>

          {/* Option B: Under 13 (Child) */}
          <button
            onClick={() => navigate('/register?age_group=child')}
            className="w-full p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 text-left transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Baby size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">I'm under 13</h3>
                <p className="text-[11px] text-slate-400">Child-safe Kids Mode: Learning & Art with 30m daily limit</p>
              </div>
            </div>
          </button>
        </div>

        <div className="pt-2">
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto"
          >
            <ArrowLeft size={14} /> Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
