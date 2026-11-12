import React, { useEffect, useState } from 'react';
import { Plus, Radio } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StoryViewer from './StoryViewer';

export default function StoriesTray({ onOpenCreateStory }) {
  const { user, isKidsMode } = useAuth();
  const [stories, setStories] = useState([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);

  useEffect(() => {
    api.getStories()
      .then(setStories)
      .catch((err) => console.error(err));
  }, []);

  return (
    <>
      <div className="flex items-center gap-3.5 overflow-x-auto py-2 px-1 scrollbar-none no-scrollbar">
        {/* Your Story button */}
        {!isKidsMode && (
          <div 
            onClick={onOpenCreateStory}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
          >
            <div className="relative w-16 h-16 rounded-2xl bg-verity-card border-2 border-dashed border-slate-700 flex items-center justify-center group-hover:border-verity-pink transition-all">
              <img 
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                alt="Your story" 
                className="w-13 h-13 rounded-xl object-cover opacity-60 group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full gradient-btn flex items-center justify-center text-white shadow-md">
                  <Plus size={14} className="stroke-[3]" />
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-300">Your story</span>
          </div>
        )}

        {/* Stories from creators */}
        {stories.map((story, idx) => (
          <div
            key={story.id}
            onClick={() => setActiveStoryIndex(idx)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
          >
            <div className={`relative p-0.5 rounded-2xl transition-transform group-hover:scale-105 ${
              story.is_live
                ? 'bg-gradient-to-tr from-red-500 via-rose-500 to-amber-500 animate-pulse'
                : 'gradient-border-ring'
            }`}>
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black p-0.5">
                <img
                  src={story.media_url}
                  alt={story.author_display_name}
                  className="w-full h-full rounded-xl object-cover"
                />
              </div>

              {story.is_live && (
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-[9px] rounded-md tracking-wider flex items-center gap-0.5 shadow-md">
                  <Radio size={8} /> LIVE
                </div>
              )}
            </div>
            <span className={`text-[11px] font-semibold truncate w-16 text-center ${isKidsMode ? 'text-slate-800' : 'text-slate-300'}`}>
              {story.author_display_name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Story Viewer Modal */}
      {activeStoryIndex !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
        />
      )}
    </>
  );
}
