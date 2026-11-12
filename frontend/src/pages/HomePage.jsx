import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Focus, Filter, RefreshCw, AlertCircle, 
  Baby, ShieldCheck, Play 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFocusMode } from '../context/FocusModeContext';
import StoriesTray from '../components/feed/StoriesTray';
import PostCard from '../components/feed/PostCard';

export default function HomePage({ onOpenCreate, onOpenCreateStory }) {
  const { user, isKidsMode } = useAuth();
  const { activeMode } = useFocusMode();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [activeInterestFilter, setActiveInterestFilter] = useState('All');
  const [interests, setInterests] = useState([]);

  const fetchFeed = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await api.getFeed(1, 25);
      setPosts(data);
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    api.getInterests().then(setInterests).catch(() => {});
  }, [activeMode, isKidsMode]);

  const handlePostHide = (hiddenId) => {
    setPosts((prev) => prev.filter((p) => p.id !== hiddenId));
  };

  const filteredPosts = posts.filter((p) => {
    if (activeInterestFilter === 'All') return true;
    return p.interest_name?.toLowerCase() === activeInterestFilter.toLowerCase();
  });

  return (
    <div className="w-full max-w-[780px] mx-auto px-3 sm:px-4 md:px-0 py-4 md:py-0 space-y-5">
      {/* Stories Tray */}
      <div className={`p-3.5 rounded-[18px] ${
        isKidsMode ? 'bg-[#F4F7FB] border border-slate-300' : 'glass-card'
      }`}>
        <StoriesTray onOpenCreateStory={onOpenCreateStory} />
      </div>

      {/* Focus Mode Banner (Shows when Focus Mode is ON) */}
      {activeMode && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-rose-500/15 border border-purple-500/30 flex items-center justify-between text-xs animate-fade-in shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{activeMode.emoji}</span>
            <div>
              <div className={`flex items-center gap-1.5 font-bold ${isKidsMode ? 'text-slate-900' : 'text-white'}`}>
                <span>{activeMode.name} Active</span>
                <span className="text-[10px] bg-verity-pink/30 text-verity-pink px-2 py-0.2 rounded-full uppercase tracking-wider font-extrabold">
                  Strict Filtering
                </span>
              </div>
              <p className={`text-[11px] mt-0.5 ${isKidsMode ? 'text-slate-700' : 'text-slate-400'}`}>
                Displaying only content matching active mode interests. Unrelated posts are blocked.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Kids Mode Safe Banner (Shows when in Kids Mode) */}
      {isKidsMode && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-800 animate-fade-in">
          <span className="text-2xl">🧸</span>
          <div>
            <div className="font-extrabold text-sm text-emerald-950 flex items-center gap-1.5">
              <span>Child-Safe Feed Active</span>
              <ShieldCheck size={14} className="text-emerald-600" />
            </div>
            <p className="text-emerald-800 text-[11px] mt-0.5">
              Content is strictly restricted to Learning and Art. Unapproved external links and adult posts are excluded.
            </p>
          </div>
        </div>
      )}

      {/* Category Pills Bar matching Reference Image 1 Right Screen */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveInterestFilter('All')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
              activeInterestFilter === 'All'
                ? 'gradient-btn text-white shadow-md shadow-pink-500/20'
                : isKidsMode
                  ? 'bg-[#F4F7FB] text-slate-700 border border-slate-300'
                  : 'glass-panel text-[#A0A8BE] hover:text-[#F4F5FF] hover:border-[#8657FF]/35'
            }`}
          >
            All
          </button>

          {interests.map((interest) => {
            const isActive = activeInterestFilter === interest.name;
            return (
              <button
                key={interest.id}
                onClick={() => setActiveInterestFilter(interest.name)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'gradient-btn text-white shadow-md shadow-pink-500/20'
                    : isKidsMode
                      ? 'bg-[#F4F7FB] text-slate-700 border border-slate-300'
                      : 'glass-panel text-[#A0A8BE] hover:text-[#F4F5FF] hover:border-[#8657FF]/35'
                }`}
            >
              {interest.name}
            </button>
          );
        })}
      </div>

      {/* Post List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-96 rounded-3xl bg-verity-card/40 animate-pulse border border-verity-border/60" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className={`p-10 rounded-3xl border text-center space-y-3 ${
          isKidsMode ? 'bg-[#F4F7FB] border-slate-300' : 'bg-verity-card border-verity-border'
        }`}>
          <Focus size={36} className="text-verity-coral mx-auto" />
          <h3 className={`font-extrabold text-base ${isKidsMode ? 'text-slate-900' : 'text-white'}`}>No Matching Posts Found</h3>
          <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isKidsMode ? 'text-slate-600' : 'text-slate-400'}`}>
            {activeMode
              ? `Strict Focus Mode is on (${activeMode.name}). No posts match this mode's selected interests.`
              : 'Try selecting more interests or checking back later as creators post new updates.'}
          </p>
          <button
            onClick={() => fetchFeed(true)}
            className="px-4 py-2 rounded-xl gradient-btn text-xs font-bold"
          >
            Refresh Feed
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} onHide={handlePostHide} />
          ))}
        </div>
      )}
    </div>
  );
}
