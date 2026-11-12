import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function StoryViewer({ stories, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const duration = 5000; // 5 seconds per story

  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (isPaused) return;

    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused]);

  const handleNext = () => {
    setProgress(0);
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    setProgress(0);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X size={20} />
      </button>

      {/* Story Card Container */}
      <div 
        className="relative w-full max-w-sm h-[85vh] max-h-[750px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
          {stories.map((s, idx) => (
            <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75"
                style={{
                  width: `${idx < currentIndex ? 100 : idx === currentIndex ? progress : 0}%`,
                }}
              />
            </div>
          ))}
        </div>

        {/* Creator Header */}
        <div className="absolute top-6 left-4 right-4 z-30 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <img
              src={currentStory.author_avatar || currentStory.media_url}
              alt={currentStory.author_display_name}
              className="w-9 h-9 rounded-full object-cover border border-white/40"
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm">{currentStory.author_display_name}</span>
                <CheckCircle2 size={13} className="text-sky-400 fill-sky-400/20" />
              </div>
              <span className="text-[11px] text-white/70">@{currentStory.author_username}</span>
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="flex-1 w-full h-full relative">
          <img
            src={currentStory.media_url}
            alt="Story media"
            className="w-full h-full object-cover"
          />

          {/* Caption overlay */}
          {currentStory.caption && (
            <div className="absolute bottom-6 left-4 right-4 z-20 p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-sm">
              {currentStory.caption}
            </div>
          )}
        </div>

        {/* Navigation Touch Areas */}
        <div 
          onClick={handlePrev} 
          className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" 
        />
        <div 
          onClick={handleNext} 
          className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer" 
        />
      </div>

      {/* Side Arrow buttons for desktop */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="hidden md:flex absolute left-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={handleNext}
          className="hidden md:flex absolute right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
}
