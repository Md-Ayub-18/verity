import React, { useState, useEffect } from 'react';
import { 
  Settings, User, Lock, Clock, Shield, 
  Baby, LogOut, Check, UserX, Globe, KeyRound, Laptop, Camera
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useScreenTime } from '../context/ScreenTimeContext';

export default function SettingsPage() {
  const { user, isKidsMode, toggleKidsMode, updateUser, logout, logoutAll } = useAuth();
  const { status, resetTime } = useScreenTime();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isPrivate, setIsPrivate] = useState(user?.is_private || false);
  const [defaultAudience, setDefaultAudience] = useState(user?.default_audience || 'public');
  const [screenLimit, setScreenLimit] = useState(user?.daily_screen_time_limit || 60);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Blocked users & sessions
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');

  useEffect(() => {
    api.getBlockedUsers().then(setBlockedUsers).catch(() => {});
    api.getSessions().then(setSessions).catch(() => {});
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const res = await api.uploadMedia(file, 'avatars');
      setAvatarUrl(res.url);
      const updated = await api.updateProfile({ avatar_url: res.url });
      updateUser(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      alert(err.message || 'Failed to upload profile photo');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await api.updateProfile({
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
        is_private: isPrivate,
        default_audience: defaultAudience,
        daily_screen_time_limit: user?.account_type !== 'child' ? Number(screenLimit) : undefined,
      });
      updateUser(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId) => {
    try {
      await api.toggleBlockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err.message || 'Could not unblock user');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage('');
    try {
      const res = await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwMessage(res.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwMessage(err.message || 'Password change failed');
    }
  };

  return (
    <div className="w-full max-w-[820px] mx-auto px-3 sm:px-4 md:px-1 py-4 md:py-0 space-y-5">
      {/* Header */}
      <div className={`p-5 rounded-[18px] flex items-center justify-between gap-4 ${
        isKidsMode ? 'bg-[#F4F7FB] border border-slate-300' : 'glass-card'
      }`}>
        <div>
          <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5 ${
            isKidsMode ? 'text-slate-900' : 'text-[#F4F5FF]'
          }`}>
            <Settings size={24} className="text-[#FF477E]" />
            <span>Settings & Privacy</span>
          </h1>
          <p className={`text-xs mt-1 ${isKidsMode ? 'text-slate-600' : 'text-[#A0A8BE]'}`}>
            Manage your profile, privacy, blocked accounts, sessions, and safety preferences.
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1 animate-fade-in">
            <Check size={14} className="stroke-[3]" /> Saved
          </span>
        )}
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
        {/* Profile & Privacy Details */}
        <div className={`p-6 rounded-[18px] space-y-4 ${
          isKidsMode ? 'bg-[#F4F7FB] border border-slate-300' : 'glass-card'
        }`}>
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <User size={16} className="text-cyan-400" />
            <span>Profile & Audience Defaults</span>
          </h3>

          <div className="flex items-center gap-4">
            <img
              src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover border-2 border-verity-pink/50"
            />
            <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer flex items-center gap-1.5 border border-slate-700">
              <Camera size={14} className="text-verity-pink" />
              <span>Change Profile Picture</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Bio</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
              <Globe size={13} className="text-verity-coral" /> Default Post Audience
            </label>
            <select
              value={defaultAudience}
              onChange={(e) => setDefaultAudience(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-verity-pink"
            >
              <option value="public">Public (Visible in Discovery)</option>
              <option value="followers">Followers Only</option>
              <option value="private">Private (Only You)</option>
            </select>
          </div>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 cursor-pointer">
            <div>
              <span className="font-bold text-white block">Private Account</span>
              <span className="text-[11px] text-slate-400">Only followers can view your profile posts and reels.</span>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 accent-verity-pink cursor-pointer"
            />
          </label>
        </div>

        {/* Screen-Time Management */}
        <div className={`p-6 rounded-[18px] space-y-4 ${
          isKidsMode ? 'bg-[#F4F7FB] border border-slate-300' : 'glass-card'
        }`}>
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Clock size={16} className="text-verity-coral" />
            <span>Screen-Time Budget</span>
          </h3>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-bold">Daily Time Limit (Minutes)</label>
              <span className="font-bold text-white">{screenLimit} mins</span>
            </div>

            {user?.account_type === 'child' ? (
              <p className="text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30">
                Child account screen limits are mandatory (30 mins) and cannot be changed in Kids Mode.
              </p>
            ) : (
              <input
                type="range"
                min={15}
                max={180}
                step={15}
                value={screenLimit}
                onChange={(e) => setScreenLimit(Number(e.target.value))}
                className="w-full accent-verity-pink"
              />
            )}
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
            <span>Used today: {Math.round(status.screen_time_used_today)} minutes</span>
            <button
              type="button"
              onClick={resetTime}
              className="text-emerald-400 hover:underline font-bold"
            >
              Reset screen counter (Demo)
            </button>
          </div>
        </div>

        {/* Kids Mode Toggle */}
        <div className={`p-6 rounded-[18px] space-y-3 ${
          isKidsMode ? 'bg-[#F4F7FB] border border-slate-300' : 'glass-card'
        }`}>
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Baby size={16} className="text-amber-400" />
            <span>Kids Mode Transformation</span>
          </h3>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Transform the entire Verity interface into a soft, safe, accessible child-friendly portal.
          </p>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="font-bold text-white">
              {isKidsMode ? 'Kids Mode is Currently ACTIVE' : 'Normal Verity Experience Active'}
            </span>
            <button
              type="button"
              onClick={toggleKidsMode}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                isKidsMode
                  ? 'bg-amber-400 text-amber-950 shadow'
                  : 'gradient-btn text-white'
              }`}
            >
              {isKidsMode ? 'Disable Preview' : 'Enable Kids Mode'}
            </button>
          </div>
        </div>

        {/* Save Changes Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl gradient-btn font-extrabold text-sm shadow-xl shadow-pink-500/25 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Profile & Privacy Settings'}
        </button>
      </form>

      {/* Blocked Users Management */}
      <div className={`p-6 rounded-[18px] space-y-3 text-xs ${
        isKidsMode ? 'bg-[#F4F7FB] border border-slate-300' : 'glass-card'
      }`}>
        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
          <UserX size={16} className="text-red-400" />
          <span>Blocked Users ({blockedUsers.length})</span>
        </h3>
        {blockedUsers.length === 0 ? (
          <p className="text-slate-400">You haven't blocked any accounts.</p>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((bu) => (
              <div key={bu.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <img
                    src={bu.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                    alt={bu.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-bold text-white">{bu.display_name}</p>
                    <p className="text-[11px] text-slate-400">@{bu.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnblock(bu.id)}
                  className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Change */}
      <form onSubmit={handleChangePassword} className={`p-6 rounded-[18px] space-y-3 text-xs ${
        isKidsMode ? 'bg-[#F4F7FB] border border-slate-300' : 'glass-card'
      }`}>
        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
          <KeyRound size={16} className="text-purple-400" />
          <span>Password Management</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="password"
            required
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500"
          />
        </div>
        {pwMessage && <p className="text-[11px] text-emerald-400 font-semibold">{pwMessage}</p>}
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700"
        >
          Update Password
        </button>
      </form>

      {/* Active Sessions & Logout */}
      <div className={`p-6 rounded-[18px] space-y-4 text-xs ${
        isKidsMode ? 'bg-[#F4F7FB] border border-slate-300' : 'glass-card'
      }`}>
        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
          <Laptop size={16} className="text-emerald-400" />
          <span>Active Sessions ({sessions.length})</span>
        </h3>

        {sessions.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {sessions.map((s) => (
              <div key={s.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="truncate pr-2">
                  <p className="font-semibold text-white truncate">{s.user_agent}</p>
                  <p className="text-[10px] text-slate-400">IP: {s.ip_address} • {new Date(s.created_at).toLocaleString()}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">Active</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={logout}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1.5"
          >
            <LogOut size={14} /> Sign Out Current Device
          </button>
          <button
            type="button"
            onClick={logoutAll}
            className="flex-1 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold flex items-center justify-center gap-1.5"
          >
            <Shield size={14} /> Logout All Devices
          </button>
        </div>
      </div>
    </div>
  );
}
