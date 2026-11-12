import React, { useState, useEffect } from 'react';
import { PlaySquare, ChevronUp, ChevronDown, Focus, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFocusMode } from '../context/FocusModeContext';
import ReelCard from '../components/reels/ReelCard';

export default function ReelsPage() {
  const { user, isKidsMode } = useAuth();
  const { activeMode } = useFocusMode();
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getReels()
      .then((data) => {
        setReels(data);
        setCurrentIndex(0);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [activeMode, isKidsMode]);

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="relative h-[calc(100dvh-120px)] md:h-full w-full flex flex-col items-center justify-center p-2 sm:p-3 overflow-hidden">
      {/* Active Mode Notice */}
      {activeMode && (
        <div className="absolute top-4 z-30 px-3.5 py-1.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-lg">
          <span>{activeMode.emoji}</span>
          <span>Reels strictly filtered: {activeMode.name}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 text-sm">
          Loading responsible Reels...
        </div>
      ) : reels.length === 0 ? (
        <div className="max-w-md p-8 rounded-3xl bg-verity-card border border-verity-border text-center space-y-3">
          <PlaySquare size={36} className="text-verity-pink mx-auto" />
          <h3 className="font-extrabold text-white text-base">No Matching Reels</h3>
          <p className="text-xs text-slate-400">
            No reels found matching your active focus mode interests. Deactivate focus mode or select more interests to discover new creators.
          </p>
        </div>
      ) : (
        <div className="relative w-full max-w-[420px] flex items-center justify-center">
          <ReelCard key={reels[currentIndex].id} reel={reels[currentIndex]} isActive={true} />

          {/* Desktop Navigation Floating Controls */}
          <div className="hidden lg:flex absolute -right-16 flex-col gap-3 z-30">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-3 rounded-full bg-verity-card/80 hover:bg-slate-800 text-white border border-verity-border disabled:opacity-30 transition-colors shadow-lg"
            >
              <ChevronUp size={22} />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === reels.length - 1}
              className="p-3 rounded-full bg-verity-card/80 hover:bg-slate-800 text-white border border-verity-border disabled:opacity-30 transition-colors shadow-lg"
            >
              <ChevronDown size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
