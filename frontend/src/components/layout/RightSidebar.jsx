import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Info, Sparkles, Bell, Search, Activity } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useScreenTime } from '../../context/ScreenTimeContext';

export default function RightSidebar({ variant = 'sidebar' }) {
  const { user, isKidsMode } = useAuth();
  const { status } = useScreenTime();
  const [suggested, setSuggested] = useState([]);
  const [followingMap, setFollowingMap] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isKidsMode) {
      api.getSuggestedUsers()
        .then(setSuggested)
        .catch(() => {});
    }
  }, [isKidsMode]);

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
  }, [user]);

  const handleFollow = async (userId) => {
    try {
      const res = await api.toggleFollowUser(userId);
      setFollowingMap((prev) => ({ ...prev, [userId]: res.following }));
    } catch (err) {
      console.error(err);
    }
  };

  const budget = Math.max(1, status.daily_screen_time_limit || 60);
  const used = Math.max(0, Math.round(status.screen_time_used_today || 0));
  const remaining = Math.max(0, budget - used);
  const usageRatio = Math.min(1, used / budget);
  const usagePercent = Math.min(100, Math.round(usageRatio * 100));

  const isExcessive = used >= budget;
  const isWarning = !isExcessive && usagePercent >= 70;

  // Circular progress ring math
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - usageRatio);

  const isStacked = variant === 'stacked';

  return (
    <aside
      className={
        isStacked
          ? 'lg:hidden w-full pt-4 pb-6 space-y-4'
          : 'hidden lg:flex lg:flex-col lg:w-[280px] xl:w-[320px] flex-shrink-0 h-full overflow-y-auto space-y-3.5 pr-0.5'
      }
    >
      {/* Smart Activity Header Bar (Desktop 3-Column Alignment Anchor) */}
      {!isStacked && (
        <div
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-[16px] flex-shrink-0 ${
            isKidsMode
              ? 'bg-[#F4F7FB] border border-slate-300 text-slate-900'
              : 'glass-card text-[#F4F5FF]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-[#8657FF]/20 border border-[#8657FF]/30 flex items-center justify-center text-[#36CFFF] flex-shrink-0">
              <Activity size={14} />
            </span>
            <span className="text-xs font-bold tracking-wide uppercase text-[#A0A8BE] truncate">
              Smart Activity
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isKidsMode && (
              <button
                onClick={() => navigate('/explore')}
                title="Explore"
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-[#A0A8BE] hover:text-[#F4F5FF] transition-colors duration-200"
              >
                <Search size={14} />
              </button>
            )}
            <button
              onClick={() => navigate('/notifications')}
              title="Notifications"
              className="relative p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-[#A0A8BE] hover:text-[#F4F5FF] transition-colors duration-200"
            >
              <Bell size={14} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF477E] text-white text-[9px] font-extrabold flex items-center justify-center shadow">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* A. Screen Balance Card */}
      <div
        className={`relative overflow-hidden p-4 rounded-[18px] flex-shrink-0 ${
          isKidsMode
            ? 'bg-[#F4F7FB] border border-slate-300 text-slate-900'
            : 'glass-card text-[#F4F5FF]'
        }`}
      >
        {!isKidsMode && (
          <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#8657FF]/18 blur-2xl" />
        )}

        <div className="relative flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#8657FF]/30 to-[#36CFFF]/25 border border-white/10 flex items-center justify-center text-[#36CFFF]">
              <Clock size={17} />
            </div>
            <div>
              <h3 className={`text-sm font-bold leading-tight ${isKidsMode ? 'text-slate-900' : 'text-[#F4F5FF]'}`}>
                Screen Balance
              </h3>
              <p className={`text-[11px] ${isKidsMode ? 'text-slate-600' : 'text-[#A0A8BE]'}`}>
                Mindful Browsing
              </p>
            </div>
          </div>

          {/* Usage Health Pill */}
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 whitespace-nowrap ${
              isExcessive
                ? 'bg-[#FF477E]/15 text-[#FF477E] border-[#FF477E]/35'
                : isWarning
                  ? 'bg-amber-400/15 text-amber-300 border-amber-400/35'
                  : 'bg-[#36CFFF]/15 text-[#36CFFF] border-[#36CFFF]/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isExcessive ? 'bg-[#FF477E] animate-pulse' : isWarning ? 'bg-amber-400' : 'bg-[#36CFFF]'
              }`}
            />
            {isExcessive ? 'Limit Reached' : isWarning ? 'Near Limit' : 'Healthy'}
          </span>
        </div>

        {/* Circular Progress Indicator + Stats */}
        <div className="relative flex items-center gap-3.5">
          <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <defs>
                <linearGradient id={`verity-ring-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={isExcessive ? '#FF477E' : '#8657FF'} />
                  <stop offset="100%" stopColor={isExcessive ? '#FF6B8B' : '#36CFFF'} />
                </linearGradient>
              </defs>
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke={isKidsMode ? '#CBD5E1' : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth="6.5"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke={`url(#verity-ring-${variant})`}
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={`text-sm font-extrabold leading-none ${isKidsMode ? 'text-slate-900' : 'text-[#F4F5FF]'}`}>
                {used}m
              </span>
              <span className={`text-[10px] font-medium mt-0.5 ${isKidsMode ? 'text-slate-600' : 'text-[#A0A8BE]'}`}>
                of {budget}m
              </span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 gap-1.5 text-xs min-w-0">
            <div className={`px-2.5 py-1.5 rounded-[12px] flex items-center justify-between border ${
              isKidsMode ? 'bg-white border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'
            }`}>
              <span className={`text-[11px] ${isKidsMode ? 'text-slate-600' : 'text-[#A0A8BE]'}`}>Daily Budget</span>
              <span className={`font-bold ${isKidsMode ? 'text-slate-900' : 'text-[#F4F5FF]'}`}>{budget}m</span>
            </div>
            <div className={`px-2.5 py-1.5 rounded-[12px] flex items-center justify-between border ${
              isKidsMode ? 'bg-white border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'
            }`}>
              <span className={`text-[11px] ${isKidsMode ? 'text-slate-600' : 'text-[#A0A8BE]'}`}>Remaining</span>
              <span className={`font-bold ${isExcessive ? 'text-[#FF477E]' : isKidsMode ? 'text-slate-900' : 'text-[#36CFFF]'}`}>
                {remaining}m ({usagePercent}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* B. Creator Recommendations */}
      {!isKidsMode && suggested.length > 0 && (
        <div className="p-4 rounded-[18px] glass-card space-y-2.5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#8657FF]" />
              <h3 className="font-bold text-sm text-[#F4F5FF]">Creators For You</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="text-xs font-semibold text-[#36CFFF] hover:text-[#FF477E] transition-colors duration-200"
            >
              See All
            </button>
          </div>

          <div className="space-y-1.5">
            {suggested.slice(0, 3).map((creator) => {
              const isFollowing = followingMap[creator.id];
              return (
                <div
                  key={creator.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-[14px] bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.05] hover:border-[#8657FF]/35 transition-all duration-200"
                >
                  <div
                    className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
                    onClick={() => navigate(`/profile/${creator.username}`)}
                  >
                    <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-[#FF477E] via-[#8657FF] to-[#36CFFF] flex-shrink-0">
                      <img
                        src={creator.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                        alt={creator.display_name}
                        className="w-9 h-9 rounded-full object-cover bg-[#0B0D17]"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-[#F4F5FF] truncate">
                          {creator.display_name}
                        </span>
                        {creator.is_verified && (
                          <CheckCircle2 size={12} className="text-[#36CFFF] fill-[#36CFFF]/20 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#A0A8BE] truncate">@{creator.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFollow(creator.id)}
                    className={`text-[11px] px-3 py-1.5 rounded-full font-bold transition-all duration-200 flex-shrink-0 ${
                      isFollowing
                        ? 'bg-white/[0.08] text-[#F4F5FF] border border-white/[0.12] hover:bg-white/[0.14]'
                        : 'gradient-btn shadow-sm'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* C. Transparency / Information Card */}
      <div
        className={`relative overflow-hidden p-4 rounded-[18px] space-y-2 flex-shrink-0 ${
          isKidsMode
            ? 'bg-[#F4F7FB] border border-slate-300 text-slate-800'
            : 'glass-card text-[#A0A8BE]'
        }`}
      >
        {!isKidsMode && (
          <>
            <div className="pointer-events-none absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#36CFFF]/14 blur-2xl" />
            <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#8657FF]/14 blur-2xl" />
          </>
        )}

        <div className="relative flex items-center gap-2">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isKidsMode ? 'bg-sky-100 text-sky-700' : 'bg-[#8657FF]/20 border border-[#8657FF]/30 text-[#36CFFF]'
          }`}>
            <Info size={14} />
          </span>
          <h4 className={`text-xs font-bold ${isKidsMode ? 'text-slate-900' : 'text-[#F4F5FF]'}`}>
            Verity Transparency
          </h4>
        </div>

        <p className={`relative text-[11px] leading-relaxed ${isKidsMode ? 'text-slate-600' : 'text-[#A0A8BE]'}`}>
          Your feed combines your selected interests with controlled discovery. We never optimize solely for endless engagement.
        </p>
      </div>
    </aside>
  );
}

