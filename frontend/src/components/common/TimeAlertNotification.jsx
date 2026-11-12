import React from 'react';
import { Clock, X, Sparkles } from 'lucide-react';
import { useScreenTime } from '../../context/ScreenTimeContext';

export default function TimeAlertNotification() {
  const { activeAlert, dismissAlert } = useScreenTime();

  if (!activeAlert) return null;

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm w-full animate-slide-up">
      <div className="p-4 rounded-3xl bg-slate-900/95 border-2 border-verity-coral/60 text-white shadow-2xl backdrop-blur-xl flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-verity-pink to-verity-coral flex items-center justify-center flex-shrink-0 shadow-md">
          <Clock size={18} className="text-white" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="font-bold text-xs uppercase tracking-wider text-verity-coral">
            Screen Time Reminder
          </h4>
          <p className="text-xs text-slate-200 leading-normal">
            {activeAlert}
          </p>
        </div>
        <button
          onClick={dismissAlert}
          className="p-1 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
