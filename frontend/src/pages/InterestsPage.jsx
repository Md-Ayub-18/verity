import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Check, BookOpen, Trophy, Palette, 
  Cpu, Film, Heart, Globe, ShieldCheck, AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ICON_MAP = {
  BookOpen: BookOpen,
  Trophy: Trophy,
  Palette: Palette,
  Cpu: Cpu,
  Film: Film,
  Heart: Heart,
  Globe: Globe,
};

export default function InterestsPage() {
  const { user, isKidsMode, updateUser } = useAuth();
  const [allInterests, setAllInterests] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    Promise.all([api.getInterests(), api.getMyInterests()])
      .then(([interests, myInterests]) => {
        setAllInterests(interests);
        setSelectedIds(myInterests.map((i) => i.id));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (interest) => {
    // Check if child is trying to select non-permitted interest
    if ((user?.account_type === 'child' || isKidsMode) && !interest.is_child_permitted) {
      alert("Child accounts can only select Learning and Art interests for safety.");
      return;
    }

    let nextIds;
    if (selectedIds.includes(interest.id)) {
      if (selectedIds.length === 1) {
        alert("Please keep at least one interest selected for your feed.");
        return;
      }
      nextIds = selectedIds.filter((id) => id !== interest.id);
    } else {
      nextIds = [...selectedIds, interest.id];
    }

    setSelectedIds(nextIds);

    // Save immediately to backend without requiring manual save button!
    try {
      const updated = await api.updateMyInterests(nextIds);
      setSelectedIds(updated.map((i) => i.id));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      alert(err.message || 'Failed to update interests');
      // Revert state
      setSelectedIds(selectedIds);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center text-slate-400 text-sm">
        Loading interests...
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-4 md:px-1 py-4 md:py-0 space-y-5">
      {/* Glass Header */}
      <div className={`p-5 rounded-[18px] flex items-center justify-between gap-4 ${
        isKidsMode ? 'bg-[#F4F7FB] border border-slate-300' : 'glass-card'
      }`}>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#8657FF]/30 to-[#36CFFF]/25 border border-white/10 flex items-center justify-center text-[#36CFFF]">
            <Sparkles size={20} />
          </span>
          <div>
            <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isKidsMode ? 'text-slate-900' : 'text-[#F4F5FF]'}`}>
              Select Your Interests
            </h1>
            <p className={`text-xs mt-0.5 ${isKidsMode ? 'text-slate-600' : 'text-[#A0A8BE]'}`}>
              Choose what you love. Your normal feed balances these with controlled discovery.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1 animate-fade-in">
            <Check size={14} className="stroke-[3]" /> Saved Instantly
          </span>
        )}
      </div>

      {/* Child account notice if applicable */}
      {(user?.account_type === 'child' || isKidsMode) && (
        <div className="p-4 rounded-[18px] bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
          <ShieldCheck size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Child-Safe Filtering Enabled: </span>
            In compliance with Verity Child Safety policies, child accounts are exclusively allowed to select <strong>Learning</strong> and <strong>Art</strong>.
          </div>
        </div>
      )}

      {/* Interests Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {allInterests.map((interest) => {
          const isSelected = selectedIds.includes(interest.id);
          const Icon = ICON_MAP[interest.icon] || Sparkles;
          const isPermittedForChild = interest.is_child_permitted;
          const isChildLocked = (user?.account_type === 'child' || isKidsMode) && !isPermittedForChild;

          return (
            <div
              key={interest.id}
              onClick={() => !isChildLocked && handleToggle(interest)}
              className={`p-5 rounded-[18px] transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isChildLocked
                  ? 'opacity-40 cursor-not-allowed glass-card'
                  : isSelected
                    ? isKidsMode
                      ? 'bg-white border-2 border-sky-500 shadow-md'
                      : 'glass-card border-[#FF477E]/55 bg-gradient-to-br from-[#FF477E]/12 via-[#191D2D]/85 to-[#8657FF]/18 shadow-[0_0_24px_-8px_rgba(255,71,126,0.35)]'
                    : isKidsMode
                      ? 'bg-[#F4F7FB] border border-slate-300'
                      : 'glass-card hover:border-[#8657FF]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${interest.gradient} flex items-center justify-center text-white shadow-md`}>
                    <Icon size={22} />
                  </div>

                  {isSelected && (
                    <div className="w-7 h-7 rounded-full gradient-btn flex items-center justify-center text-white shadow">
                      <Check size={16} className="stroke-[3]" />
                    </div>
                  )}
                </div>

                <h3 className="font-extrabold text-base text-white mb-1">{interest.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {interest.description}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                {interest.is_child_permitted ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck size={12} /> Child Safe
                  </span>
                ) : (
                  <span className="text-slate-500 font-medium">Standard</span>
                )}

                <span className={`font-bold ${isSelected ? 'text-verity-pink' : 'text-slate-400'}`}>
                  {isSelected ? 'Active' : 'Click to add'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
