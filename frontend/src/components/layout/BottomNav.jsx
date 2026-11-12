import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, Plus, PlaySquare, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function BottomNav({ onOpenCreate }) {
  const { user, isKidsMode } = useAuth();

  return (
    <div className="md:hidden fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <nav className={`pointer-events-auto flex items-center justify-between gap-1 p-2 rounded-full shadow-2xl backdrop-blur-xl border ${
        isKidsMode 
          ? 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-300/40' 
          : 'bg-black/75 border-white/10 text-slate-300 shadow-black/80'
      }`}>
        <NavLink
          to="/"
          className={({ isActive }) => `
            flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all
            ${isActive 
              ? 'gradient-btn shadow-md shadow-pink-500/30' 
              : 'hover:text-white'
            }
          `}
        >
          <Home size={18} />
          <span className="hidden sm:inline">Home</span>
        </NavLink>

        {!isKidsMode && (
          <NavLink
            to="/explore"
            className={({ isActive }) => `
              p-2.5 rounded-full transition-all
              ${isActive ? 'text-verity-pink' : 'hover:text-white'}
            `}
          >
            <Compass size={20} />
          </NavLink>
        )}

        {/* Floating Center Create Action */}
        <button
          onClick={onOpenCreate}
          className="w-11 h-11 rounded-full gradient-btn flex items-center justify-center shadow-lg shadow-pink-500/40 active:scale-90 transition-transform"
        >
          <Plus size={22} className="stroke-[2.5]" />
        </button>

        <NavLink
          to="/reels"
          className={({ isActive }) => `
            p-2.5 rounded-full transition-all
            ${isActive ? 'text-verity-pink' : 'hover:text-white'}
          `}
        >
          <PlaySquare size={20} />
        </NavLink>

        <NavLink
          to={`/profile/${user?.username || ''}`}
          className={({ isActive }) => `
            p-2.5 rounded-full transition-all
            ${isActive ? 'text-verity-pink' : 'hover:text-white'}
          `}
        >
          {user?.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.display_name} 
              className="w-6 h-6 rounded-full object-cover border border-slate-600" 
            />
          ) : (
            <User size={20} />
          )}
        </NavLink>
      </nav>
    </div>
  );
}
