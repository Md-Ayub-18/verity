import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, MessageCircle, UserPlus, ShieldCheck, CheckCheck, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo } from '../utils/time';

export default function NotificationsPage() {
  const { isKidsMode } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(false);
    const interval = setInterval(() => fetchNotifications(true), 5000);
    const onFocus = () => fetchNotifications(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const handleMarkRead = async (notif) => {
    if (!notif.is_read) {
      try {
        await api.markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        window.dispatchEvent(new Event('verity:notifications-updated'));
      } catch (err) {
        console.error(err);
      }
    }
    if (notif.type === 'moderation') {
      navigate('/moderation');
    } else if (notif.entity_type === 'reel') {
      navigate('/reels');
    } else if (notif.entity_type === 'stitch_project') {
      navigate('/stitch');
    } else if (notif.actor_username) {
      navigate(`/profile/${notif.actor_username}`);
    } else if (notif.entity_type === 'post') {
      navigate('/');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('verity:notifications-updated'));
    } catch (err) {
      console.error(err);
    }
  };

  const renderIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart size={16} className="text-verity-pink fill-verity-pink" />;
      case 'comment':
        return <MessageCircle size={16} className="text-cyan-400" />;
      case 'follow':
        return <UserPlus size={16} className="text-emerald-400" />;
      case 'moderation':
        return <ShieldCheck size={16} className="text-amber-400" />;
      default:
        return <Sparkles size={16} className="text-verity-coral" />;
    }
  };

  return (
    <div className="w-full max-w-[780px] mx-auto px-3 sm:px-4 md:px-1 py-4 md:py-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-verity-border/60">
        <div>
          <h1 className={`text-2xl font-black tracking-tight flex items-center gap-2.5 ${
            isKidsMode ? 'text-slate-900' : 'text-white'
          }`}>
            <Bell size={26} className="text-verity-pink" />
            <span>Notifications</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Stay updated on interactions, new followers, and safety updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchNotifications(false)}
            title="Refresh notifications"
            className="p-2 rounded-2xl bg-verity-card border border-verity-border hover:border-verity-pink/50 text-slate-300 hover:text-white transition-all"
          >
            <RefreshCw size={14} />
          </button>
          {notifications.some((n) => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 rounded-2xl bg-verity-card border border-verity-border hover:border-verity-pink/50 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all"
            >
              <CheckCheck size={14} className="text-emerald-400" /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-verity-card/40 animate-pulse border border-verity-border/50" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className={`p-10 text-center rounded-3xl border space-y-2 ${
          isKidsMode ? 'bg-white border-slate-200 text-slate-600' : 'bg-verity-card border-verity-border text-slate-400'
        }`}>
          <Bell size={34} className="text-verity-pink mx-auto opacity-80" />
          <h3 className={`font-bold text-base ${isKidsMode ? 'text-slate-900' : 'text-white'}`}>
            All Caught Up
          </h3>
          <p className="text-xs">
            Likes, comments, new followers, and safety notices will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleMarkRead(notif)}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                notif.is_read
                  ? isKidsMode
                    ? 'bg-white border-slate-200 opacity-80'
                    : 'bg-verity-card/50 border-verity-border/60 opacity-80'
                  : isKidsMode
                    ? 'bg-sky-50 border-sky-200 shadow-sm'
                    : 'bg-verity-card border-verity-pink/40 shadow-md shadow-pink-500/10'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <img
                    src={notif.actor_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-slate-700"
                  />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                    {renderIcon(notif.type)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className={`text-xs leading-snug ${
                    isKidsMode ? 'text-slate-800' : 'text-slate-200'
                  } ${!notif.is_read ? 'font-bold' : 'font-medium'}`}>
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {formatTimeAgo(notif.created_at)}
                  </span>
                </div>
              </div>

              {!notif.is_read && (
                <span className="w-2.5 h-2.5 rounded-full bg-verity-pink flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

