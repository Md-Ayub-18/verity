import React, { useState } from 'react';
import { 
  Focus, Plus, Check, Clock, Sparkles, Trash2, 
  BookOpen, Trophy, Palette, Cpu, Film, Heart, Globe, ShieldCheck 
} from 'lucide-react';
import { useFocusMode } from '../context/FocusModeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function FocusModePage() {
  const { user, isKidsMode } = useAuth();
  const { focusModes, activeMode, toggleMode, createMode, deleteMode } = useFocusMode();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [description, setDescription] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [duration, setDuration] = useState(45);
  const [allInterests, setAllInterests] = useState([]);

  React.useEffect(() => {
    api.getInterests().then(setAllInterests).catch(() => {});
  }, []);

  const handleToggle = async (modeId) => {
    await toggleMode(modeId);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (selectedInterests.length === 0) {
      alert('Please pick at least one interest for this focus mode.');
      return;
    }

    try {
      await createMode({
        name,
        emoji,
        description,
        selected_interest_ids: selectedInterests,
        focus_duration_minutes: duration,
      });
      setShowCreateModal(false);
      setName('');
      setSelectedInterests([]);
    } catch (err) {
      alert(err.message || 'Failed to create focus mode');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-verity-border/60">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Focus size={26} className="text-verity-pink" />
            <span>Focus Modes</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            When Focus Mode is active, your feed and Reels are strictly filtered to only your chosen interests.
          </p>
        </div>

        {!isKidsMode && user?.account_type !== 'child' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-2xl gradient-btn font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/25"
          >
            <Plus size={16} /> New Mode
          </button>
        )}
      </div>

      {/* Focus Mode Explanation Card */}
      <div className="p-4 rounded-3xl bg-verity-card border border-verity-border text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 font-bold text-white">
          <Sparkles size={16} className="text-verity-coral" />
          <span>How Focus Mode Works</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Focus Mode OFF:</strong> You experience a balanced discovery feed (70% matching your selected interests + 30% discovery from other categories).
        </p>
        <p className="text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Focus Mode ON:</strong> Strict content gate. Only posts and Reels matching the active mode's interests will be displayed. Zero unrelated distractions.
        </p>
      </div>

      {/* Modes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {focusModes.map((mode) => {
          const isActive = mode.is_active;
          return (
            <div
              key={mode.id}
              className={`p-5 rounded-3xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'bg-gradient-to-br from-verity-pink/20 to-purple-500/20 border-verity-pink shadow-lg shadow-pink-500/15'
                  : 'bg-verity-card border-verity-border hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{mode.emoji}</span>
                  {isActive ? (
                    <span className="px-2.5 py-1 rounded-full bg-verity-pink text-white font-extrabold text-[11px] flex items-center gap-1 shadow">
                      <Check size={12} className="stroke-[3]" /> Active
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
                      Inactive
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-base text-white mb-1">{mode.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {mode.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock size={12} /> {mode.focus_duration_minutes}m target
                </span>

                <div className="flex items-center gap-2">
                  {!mode.is_system_default && (
                    <button
                      onClick={() => deleteMode(mode.id)}
                      className="p-1.5 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  <button
                    onClick={() => handleToggle(mode.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      isActive
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'gradient-btn shadow-sm'
                    }`}
                  >
                    {isActive ? 'Turn Off' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Custom Focus Mode Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-verity-card border border-verity-border rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Create Custom Focus Mode</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full text-slate-400 hover:text-white">
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Mode Name & Emoji</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={2}
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="w-12 text-center p-2 rounded-xl bg-slate-900 border border-slate-800 text-lg"
                  />
                  <input
                    type="text"
                    placeholder="e.g. Deep Coding, Weekend Chill"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="What is the goal of this focus session?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-2">Select Strict Interests</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {allInterests.map((interest) => {
                    const isSelected = selectedInterests.includes(interest.id);
                    return (
                      <div
                        key={interest.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedInterests(selectedInterests.filter((id) => id !== interest.id));
                          } else {
                            setSelectedInterests([...selectedInterests, interest.id]);
                          }
                        }}
                        className={`p-2.5 rounded-2xl border cursor-pointer font-semibold transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-verity-pink/20 border-verity-pink text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{interest.name}</span>
                        {isSelected && <Check size={14} className="text-verity-pink stroke-[3]" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Duration Target (Minutes)</label>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-verity-pink"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl gradient-btn font-bold text-white shadow-md shadow-pink-500/30"
                >
                  Save Mode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
