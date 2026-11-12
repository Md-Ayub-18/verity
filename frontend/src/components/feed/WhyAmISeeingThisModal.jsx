import React from 'react';
import { X, Sparkles, Compass, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';

export default function WhyAmISeeingThisModal({ post, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-verity-card border border-verity-border rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-up">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-verity-pink" />
            <h3 className="font-bold text-base text-white">Why am I seeing this?</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 text-xs text-slate-300">
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-verity-pink/20 text-verity-pink">
              <Compass size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white mb-0.5">Recommendation Context</h4>
              <p className="text-slate-400">{post.recommendation_reason || "Based on your balanced discovery feed."}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Heart size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white mb-0.5">Category Match</h4>
              <p className="text-slate-400">
                This post is categorized under <span className="text-white font-semibold">{post.interest_name}</span>.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white mb-0.5">Trust & Safety Standard</h4>
              <p className="text-slate-400">
                Evaluated against community safety guidelines. Status: <span className="text-emerald-400 font-bold uppercase">{post.moderation_status}</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl gradient-btn font-bold text-xs"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
