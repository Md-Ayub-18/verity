import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Baby, ShieldCheck, Focus, Sparkles, Bell } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useFocusMode } from '../../context/FocusModeContext';

export default function Navbar({ onOpenSearch }) {
  const { user, isKidsMode, toggleKidsMode } = useAuth();
  const { activeMode } = useFocusMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      api.getUnreadNotificationsCount()
        .then((res) => setUnreadCount(res.unread_count || 0))
        .catch(() => {});
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 5000);
    window.addEventListener('verity:notifications-updated', fetchUnread);
    return () => {
      clearInterval(timer);
      window.removeEventListener('verity:notifications-updated', fetchUnread);
    };
  }, [user, location.pathname]);

  return (
    <header className={`sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b transition-colors ${
      isKidsMode 
        ? 'bg-[#EDF2F7]/95 border-slate-300 text-slate-900 backdrop-blur-xl' 
        : 'glass-nav text-[#F4F5FF]'
    }`}>
      {/* Brand */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-base shadow ${
          isKidsMode ? 'bg-kids-primary' : 'bg-gradient-to-tr from-verity-pink to-verity-coral'
        }`}>
          V
        </div>
        <span className={`text-xl font-extrabold tracking-tight ${isKidsMode ? 'text-kids-primary font-kids' : 'text-white'}`}>
          verity
        </span>
      </div>

      {/* Right controls: Active Focus Mode + Kids Toggle + Avatar */}
      <div className="flex items-center gap-2.5">
        {activeMode && (
          <div 
            onClick={() => navigate('/focus')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30 cursor-pointer"
          >
            <span>{activeMode.emoji}</span>
            <span className="hidden sm:inline">{activeMode.name}</span>
          </div>
        )}

        {/* Kids Mode Toggle */}
        {user?.account_type !== 'child' ? (
          <button
            onClick={toggleKidsMode}
            className={`text-xs px-2.5 py-1.5 rounded-full font-bold flex items-center gap-1 transition-all ${
              isKidsMode
                ? 'bg-amber-400 text-amber-950 shadow'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Baby size={14} />
            <span className="hidden sm:inline">{isKidsMode ? 'Kids: ON' : 'Kids: OFF'}</span>
          </button>
        ) : (
          <span className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-bold flex items-center gap-1">
            <ShieldCheck size={13} /> Child Safe
          </span>
        )}

        {/* Notifications */}
        <button 
          onClick={() => navigate('/notifications')}
          title="Notifications"
          className="relative p-2 rounded-full bg-verity-card hover:bg-slate-800 text-slate-300 hover:text-white border border-verity-border transition-colors"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-verity-pink text-white text-[10px] font-black flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Search */}
        {!isKidsMode && (
          <button 
            onClick={() => navigate('/explore')}
            className="p-2 rounded-full bg-verity-card hover:bg-slate-800 text-slate-300 hover:text-white border border-verity-border transition-colors"
          >
            <Search size={16} />
          </button>
        )}

        {/* User avatar */}
        <img
          src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
          alt={user?.display_name}
          onClick={() => navigate(`/profile/${user?.username}`)}
          className="w-8 h-8 rounded-full object-cover border-2 border-verity-pink/40 cursor-pointer"
        />
      </div>
    </header>
  );
}
