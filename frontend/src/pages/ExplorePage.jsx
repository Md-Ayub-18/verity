import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, CheckCircle2, Heart, MessageCircle, PlaySquare, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFocusMode } from '../context/FocusModeContext';
import PostCard from '../components/feed/PostCard';

const isVideoPost = (post) =>
  post?.content_type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(post?.media_url || '');

export default function ExplorePage() {
  const { user, isKidsMode } = useAuth();
  const { activeMode } = useFocusMode();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Popular', 'Learning', 'Art', 'Technology', 'Sports', 'Entertainment'];

  useEffect(() => {
    setLoading(true);
    api.getFeed(1, 30)
      .then((data) => setPosts(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [activeMode, isKidsMode]);

  const filteredPosts = posts.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCaption = p.caption?.toLowerCase().includes(q);
      const matchAuthor = p.author_username?.toLowerCase().includes(q) || p.author_display_name?.toLowerCase().includes(q);
      const matchInterest = p.interest_name?.toLowerCase().includes(q);
      return matchCaption || matchAuthor || matchInterest;
    }
    if (activeCategory !== 'All' && activeCategory !== 'Popular') {
      return p.interest_name?.toLowerCase() === activeCategory.toLowerCase();
    }
    return true;
  });

  return (
    <div className="w-full px-3 sm:px-4 md:px-1 py-4 md:py-0 space-y-5">
      {/* Top Discover Header matching Reference Image 1 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Discover</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">Find content that inspires you.</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search creators, ideas, interests, topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-verity-card border border-verity-border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink shadow-lg"
        />
      </div>

      {/* Categories Bar matching Reference Image 1 Right Screen */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'gradient-btn text-white shadow-md shadow-pink-500/25'
                  : 'bg-verity-card text-slate-400 hover:text-white border border-verity-border hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Content Photo & Video Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Discovering inspiring content...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs rounded-3xl bg-verity-card border border-verity-border">
          No content matches your search. Try adjusting keywords or category.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredPosts.map((post) => {
            const isVideo = isVideoPost(post);
            return (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="relative aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/80 group cursor-pointer shadow-md"
              >
                {post.media_url ? (
                  isVideo ? (
                    <video
                      src={post.media_url}
                      preload="metadata"
                      muted
                      playsInline
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <img
                      src={post.media_url}
                      alt={post.caption || 'Explore post'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  )
                ) : (
                  <div className="w-full h-full p-4 flex items-center justify-center text-center text-xs text-slate-300 font-medium">
                    {post.caption}
                  </div>
                )}

                {/* Interest Tag Badge */}
                <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10">
                  {post.interest_name}
                </span>

                {/* Post type icon if video */}
                {isVideo && (
                  <span className="absolute top-2.5 right-2.5 text-white drop-shadow bg-black/50 p-1 rounded-lg">
                    <PlaySquare size={15} />
                  </span>
                )}

                {/* Hover overlay with creator and reactions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 flex flex-col justify-end p-3 text-white transition-opacity">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold truncate">{post.author_display_name}</span>
                    {post.author_is_verified && <CheckCircle2 size={12} className="text-sky-400 fill-sky-400/20" />}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-200">
                    <span className="flex items-center gap-1">
                      <Heart size={12} className="fill-white" /> {post.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} className="fill-white" /> {post.comments_count}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPost && (
        <div
          onClick={() => setSelectedPost(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl my-auto relative animate-slide-up">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X size={20} />
            </button>
            <PostCard post={selectedPost} onHide={() => setSelectedPost(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
