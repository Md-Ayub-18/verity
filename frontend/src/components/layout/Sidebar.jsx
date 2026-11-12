import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Compass, PlaySquare, Sparkles, Focus, 
  Users, Film, ShieldCheck, Baby, Settings, Bell,
  PlusCircle, LogOut, CheckCircle2, Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useFocusMode } from '../../context/FocusModeContext';
import { useScreenTime } from '../../context/ScreenTimeContext';

export default function Sidebar({ onOpenCreate }) {
  const { user, isKidsMode, toggleKidsMode, logout } = useAuth();
  const { activeMode } = useFocusMode();
  const { status } = useScreenTime();
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

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

  const navItems = [
    { name: isKidsMode ? 'Safe Feed' : 'Feed', path: '/', icon: Home },
    { name: isKidsMode ? 'Safe Reels' : 'Reels', path: '/reels', icon: PlaySquare, badge: 'Popular' },
    ...(!isKidsMode ? [{ name: 'Explore', path: '/explore', icon: Compass }] : []),
    { name: 'Interests', path: '/interests', icon: Sparkles },
    { name: 'Focus Mode', path: '/focus', icon: Focus, highlight: activeMode?.name },
    ...(!isKidsMode ? [
      { name: 'Communities', path: '/communities', icon: Users },
      { name: 'Stitch Studio', path: '/stitch', icon: Film, badge: 'Collab' },
    ] : []),
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount > 0 ? String(unreadCount) : null },
    ...(user?.is_moderator || user?.is_admin ? [{ name: 'Moderation', path: '/moderation', icon: ShieldCheck, badge: 'Admin' }] : []),
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const screenTimePercent = Math.min(100, Math.round((status.screen_time_used_today / status.daily_screen_time_limit) * 100));

  return (
    <aside className={`hidden md:flex flex-col md:w-[225px] lg:w-[240px] flex-shrink-0 h-full rounded-[18px] transition-colors duration-200 overflow-hidden ${
      isKidsMode 
        ? 'bg-kids-bg border border-kids-border text-kids-text shadow-md' 
        : 'glass-sidebar text-[#F4F5FF]'
    }`}>
      {/* Brand & Kids Mode Pill */}
      <div className="px-4 pt-3.5 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 cursor-pointer min-w-0" onClick={() => navigate('/')}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-lg flex-shrink-0 ${
              isKidsMode ? 'bg-gradient-to-tr from-kids-primary to-kids-secondary' : 'bg-gradient-to-tr from-verity-pink to-verity-coral shadow-pink-500/25'
            }`}>
              V
            </div>
            <div className="flex items-center whitespace-nowrap">
              <span className={`text-xl font-extrabold tracking-tight ${
                isKidsMode ? 'text-kids-primary font-kids' : 'text-white'
              }`}>
                verity
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-verity-coral inline-block ml-1 mt-1.5"></span>
            </div>
          </div>

          {/* Kids Mode Toggle */}
          {user?.account_type !== 'child' ? (
            <button
              onClick={toggleKidsMode}
              title="Toggle Kids Mode"
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 whitespace-nowrap flex-shrink-0 transition-all ${
                isKidsMode 
                  ? 'bg-amber-400 text-amber-950 shadow-md animate-pulse' 
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <Baby size={12} />
              {isKidsMode ? 'Kids: ON' : 'Kids: OFF'}
            </button>
          ) : (
            <span className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <ShieldCheck size={12} /> Child Safe
            </span>
          )}
        </div>

        {/* Active Focus Mode Indicator if active */}
        {activeMode && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-between text-xs animate-fade-in">
            <span className="flex items-center gap-1.5 font-medium text-pink-300">
              <span>{activeMode.emoji}</span>
              <span className="truncate">{activeMode.name} Active</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-pink-500/30 text-white">
              Strict
            </span>
          </div>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center justify-between px-3 py-2 rounded-[12px] text-[13px] font-semibold transition-all duration-200 group
                ${isActive
                  ? isKidsMode
                    ? 'bg-kids-primary text-white shadow-md'
                    : 'bg-gradient-to-r from-[#8657FF]/25 via-[#FF477E]/15 to-transparent text-[#F4F5FF] border border-[#8657FF]/35 shadow-sm'
                  : isKidsMode
                    ? 'text-slate-600 hover:bg-slate-200/60'
                    : 'text-[#A0A8BE] hover:text-[#F4F5FF] hover:bg-white/[0.04]'
                }
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon size={17} className={item.highlight ? 'text-[#FF477E]' : ''} />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FF477E]/15 text-[#FF477E] border border-[#FF477E]/30 flex-shrink-0">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* Prominent Create Button */}
        <div className="pt-2 pb-1">
          <button
            onClick={onOpenCreate}
            className={`w-full py-2.5 px-3 rounded-[12px] text-[13px] font-bold flex items-center justify-center gap-2 shadow-lg transition-all duration-200 active:scale-95 ${
              isKidsMode
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-emerald-500/25'
                : 'gradient-btn shadow-pink-500/25'
            }`}
          >
            <PlusCircle size={16} />
            <span>{isKidsMode ? 'Draw & Share' : 'Create & Share'}</span>
          </button>
        </div>
      </nav>

      {/* Screen-Time Indicator with Live Controls */}
      <div className={`p-3 mx-3 mb-2 rounded-[14px] border text-xs ${
        isKidsMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-white/[0.03] border-white/[0.08]'
      }`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className={`flex items-center gap-1.5 font-medium ${isKidsMode ? 'text-slate-700' : 'text-slate-300'}`}>
            <Clock size={13} className="text-verity-coral" />
            <span>Screen Time</span>
          </div>
          <span className={`font-bold ${isKidsMode ? 'text-slate-900' : 'text-slate-200'}`}>
            {Math.round(status.screen_time_used_today)}m / {status.daily_screen_time_limit}m
          </span>
        </div>
        <div className={`w-full h-2 rounded-full overflow-hidden ${isKidsMode ? 'bg-slate-200' : 'bg-slate-800'}`}>
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              screenTimePercent > 80 ? 'bg-red-500' : screenTimePercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${screenTimePercent}%` }}
          />
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="px-3.5 py-2.5 border-t border-white/[0.08] flex items-center justify-between gap-2">
        <div 
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
          onClick={() => navigate(`/profile/${user?.username}`)}
        >
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt={user?.display_name}
            className="w-10 h-10 rounded-full object-cover border-2 border-verity-pink/40 flex-shrink-0"
          />
          <div className="truncate">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm truncate">{user?.display_name || 'Guest'}</span>
              {user?.is_verified && <CheckCircle2 size={13} className="text-sky-400 flex-shrink-0 fill-sky-400/20" />}
            </div>
            <p className="text-xs text-slate-400 truncate">@{user?.username || 'user'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-800/60 transition-colors"
        >
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  );
}
