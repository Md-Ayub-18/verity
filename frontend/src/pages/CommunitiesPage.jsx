import React, { useState, useEffect } from 'react';
import { Users, Plus, ShieldCheck, Check, Sparkles, MessageSquare } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/feed/PostCard';

export default function CommunitiesPage() {
  const { user, isKidsMode } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [activeComm, setActiveComm] = useState(null);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');

  const fetchCommunities = async () => {
    try {
      const data = await api.getCommunities();
      setCommunities(data);
      if (data.length > 0 && !activeComm) {
        selectCommunity(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const selectCommunity = async (comm) => {
    setActiveComm(comm);
    setLoadingPosts(true);
    try {
      const posts = await api.getCommunityPosts(comm.slug);
      setCommunityPosts(posts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleToggleJoin = async (comm) => {
    try {
      if (comm.is_member) {
        await api.leaveCommunity(comm.id);
      } else {
        await api.joinCommunity(comm.id);
      }
      await fetchCommunities();
      if (activeComm?.id === comm.id) {
        setActiveComm({ ...comm, is_member: !comm.is_member });
      }
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const created = await api.createCommunity({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        rules,
        interest_id: 1,
      });
      setShowCreateModal(false);
      setName('');
      setSlug('');
      setDescription('');
      setRules('');
      await fetchCommunities();
      selectCommunity(created);
    } catch (err) {
      alert(err.message || 'Failed to create community');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-verity-border/60">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Users size={26} className="text-verity-pink" />
            <span>Topic Communities</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Topic-focused spaces for sharing knowledge, discoveries, and creative works.
          </p>
        </div>

        {!isKidsMode && user?.account_type !== 'child' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-2xl gradient-btn font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/25"
          >
            <Plus size={16} /> New Community
          </button>
        )}
      </div>

      {/* Communities Carousel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {communities.map((comm) => {
          const isSelected = activeComm?.id === comm.id;
          return (
            <div
              key={comm.id}
              onClick={() => selectCommunity(comm)}
              className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-gradient-to-br from-verity-card to-slate-900 border-verity-pink shadow-lg shadow-pink-500/15'
                  : 'bg-verity-card border-verity-border hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 mb-2.5">
                <img
                  src={comm.icon_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100'}
                  alt={comm.name}
                  className="w-10 h-10 rounded-2xl object-cover border border-slate-700"
                />
                <div className="truncate">
                  <h4 className="font-extrabold text-sm text-white truncate">{comm.name}</h4>
                  <span className="text-[11px] text-slate-400">/c/{comm.slug}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                {comm.description}
              </p>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                <span className="text-slate-400 font-medium">{comm.member_count} members</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleJoin(comm);
                  }}
                  className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition-all ${
                    comm.is_member
                      ? 'bg-slate-800 text-slate-300 border border-slate-700'
                      : 'gradient-btn text-white'
                  }`}
                >
                  {comm.is_member ? 'Joined' : 'Join'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Community Feed */}
      {activeComm && (
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">{activeComm.name}</h2>
              <p className="text-xs text-slate-400">{activeComm.rules || 'Be kind and respect community guidelines.'}</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-semibold">
              Interest: {activeComm.interest_name}
            </span>
          </div>

          {loadingPosts ? (
            <p className="text-xs text-slate-400">Loading community posts...</p>
          ) : communityPosts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs rounded-3xl bg-verity-card border border-verity-border">
              No posts in this community yet. Be the first to share!
            </div>
          ) : (
            <div className="space-y-4 max-w-xl mx-auto">
              {communityPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-verity-card border border-verity-border rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-up">
            <h3 className="font-bold text-base text-white">Create Topic Community</h3>
            <form onSubmit={handleCreateCommunity} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Community Name</label>
                <input
                  type="text"
                  placeholder="e.g. Clean Energy Builders"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="What is this community's mission?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Community Rules</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 1. Be kind. 2. No link spam."
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl gradient-btn font-bold text-white shadow-md shadow-pink-500/30"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
