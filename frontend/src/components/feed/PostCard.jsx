import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, 
  CheckCircle2, Sparkles, ShieldAlert, EyeOff, Flag, 
  UserX, Info, Send, Bot
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatTimeAgo } from '../../utils/time';
import WhyAmISeeingThisModal from './WhyAmISeeingThisModal';
import ReportModal from './ReportModal';

export default function PostCard({ post, onHide }) {
  const { user, isKidsMode } = useAuth();
  const navigate = useNavigate();

  const [hasLiked, setHasLiked] = useState(post.has_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [hasSaved, setHasSaved] = useState(post.has_saved);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);

  const [showMenu, setShowMenu] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [aiTooltip, setAiTooltip] = useState(false);

  const handleLike = async () => {
    try {
      const res = await api.toggleLikePost(post.id);
      setHasLiked(res.liked);
      setLikesCount(res.likes_count);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      const res = await api.toggleSavePost(post.id);
      setHasSaved(res.saved);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setCommentsLoading(true);
      try {
        const res = await api.getPostComments(post.id);
        setComments(res);
      } catch (err) {
        console.error(err);
      } finally {
        setCommentsLoading(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const created = await api.addPostComment(post.id, newComment);
      setComments([...comments, created]);
      setCommentsCount((prev) => prev + 1);
      setNewComment('');
    } catch (err) {
      alert(err.message || 'Comment could not be submitted');
    }
  };

  const handleHide = async () => {
    setShowMenu(false);
    try {
      await api.hidePost(post.id);
      if (onHide) onHide(post.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockUser = async () => {
    setShowMenu(false);
    if (window.confirm(`Block @${post.author_username}? You won't see their posts or profile.`)) {
      try {
        await api.toggleBlockUser(post.user_id);
        if (onHide) onHide(post.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <>
      <article className={`rounded-[18px] transition-all duration-200 overflow-hidden ${
        isKidsMode 
          ? 'bg-white border border-slate-200 text-slate-800 shadow-slate-200/50' 
          : 'glass-card text-[#F4F5FF]'
      }`}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate(`/profile/${post.author_username}`)}
          >
            <div className="relative">
              <img
                src={post.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={post.author_display_name}
                className="w-10 h-10 rounded-full object-cover border border-white/20"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold text-sm hover:underline ${isKidsMode ? 'text-slate-900' : 'text-white'}`}>
                  {post.author_display_name}
                </span>
                {post.author_is_verified && (
                  <CheckCircle2 size={14} className="text-sky-500 fill-sky-400/20" />
                )}
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${isKidsMode ? 'text-slate-600' : 'text-slate-400'}`}>
                <span>@{post.author_username}</span>
                <span>•</span>
                <span>{formatTimeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Interest Pill */}
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
              isKidsMode
                ? 'bg-sky-100 text-sky-900 border-sky-200'
                : 'bg-slate-800/80 text-slate-300 border-slate-700'
            }`}>
              {post.interest_name}
            </span>

            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`p-1.5 rounded-full transition-colors ${
                  isKidsMode ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                <MoreHorizontal size={18} />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl py-1.5 z-30 text-xs font-semibold">
                  <button
                    onClick={() => { setShowMenu(false); setShowWhyModal(true); }}
                    className="w-full px-3.5 py-2.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2.5"
                  >
                    <Info size={15} className="text-verity-pink" />
                    <span>Why am I seeing this?</span>
                  </button>
                  <button
                    onClick={handleHide}
                    className="w-full px-3.5 py-2.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2.5"
                  >
                    <EyeOff size={15} />
                    <span>Hide this post</span>
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                    className="w-full px-3.5 py-2.5 text-left text-amber-400 hover:bg-slate-800 flex items-center gap-2.5"
                  >
                    <Flag size={15} />
                    <span>Report post</span>
                  </button>
                  {user?.id !== post.user_id && (
                    <button
                      onClick={handleBlockUser}
                      className="w-full px-3.5 py-2.5 text-left text-red-400 hover:bg-slate-800 flex items-center gap-2.5 border-t border-slate-800"
                    >
                      <UserX size={15} />
                      <span>Block @{post.author_username}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Flagged / Safety Removal Notice (shown to creator only since removed from public feeds) */}
        {(post.is_flagged || post.under_review_badge || post.moderation_status !== 'approved') && (
          <div className="px-4 py-2.5 bg-red-500/15 border-y border-red-500/35 flex items-center justify-between gap-2 text-xs text-red-200 font-medium">
            <div className="flex items-start gap-2">
              <ShieldAlert size={16} className="flex-shrink-0 text-red-400 mt-0.5" />
              <div>
                <span className="font-extrabold text-red-300">
                  Flagged: {post.flag_reason || 'Harmful, Misleading, or Unsafe Content'}
                </span>
                <p className="text-[11px] text-red-200/80">
                  Removed from the public feed and visible only to you.
                </p>
              </div>
            </div>
            {user?.id === post.user_id && (
              <button
                onClick={async () => {
                  const reason = window.prompt('Explain why this post complies with Verity guidelines:');
                  if (reason && reason.trim().length >= 5) {
                    try {
                      await api.submitAppeal({ entity_type: 'post', entity_id: post.id, reason });
                      alert('Appeal submitted for moderator review.');
                    } catch (err) {
                      alert(err.message || 'Could not submit appeal');
                    }
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-red-500/25 hover:bg-red-500/40 text-red-100 font-bold whitespace-nowrap"
              >
                Appeal
              </button>
            )}
          </div>
        )}

        {/* Media (Photo / Video / Text) */}
        {post.media_url ? (
          <div className="relative w-full bg-black/40 overflow-hidden flex items-center justify-center max-h-[550px]">
            {post.content_type === 'video' ? (
              <video
                src={post.media_url}
                controls
                className="w-full h-auto max-h-[550px] object-contain"
              />
            ) : (
              <img
                src={post.media_url}
                alt="Post content"
                className="w-full h-auto max-h-[550px] object-cover"
                loading="lazy"
              />
            )}

            {/* AI-Content Badge Overlay */}
            {post.is_ai_generated && (
              <div 
                className="absolute top-3 left-3 z-10"
                onMouseEnter={() => setAiTooltip(true)}
                onMouseLeave={() => setAiTooltip(false)}
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-lg cursor-pointer">
                  <Sparkles size={12} className="text-verity-coral animate-pulse" />
                  <span>AI Generated</span>
                </div>

                {aiTooltip && (
                  <div className="absolute top-8 left-0 w-64 p-2.5 rounded-xl bg-slate-950/95 border border-slate-700 text-[11px] text-slate-200 shadow-2xl z-30 leading-normal">
                    {post.ai_label_explanation || "This post has been verified or labeled by the author as AI-assisted content."}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Interaction Actions Bar */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Like */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 text-sm font-bold transition-colors group ${
                  isKidsMode ? 'text-slate-800 hover:text-verity-pink' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Heart
                  size={20}
                  className={`transition-transform active:scale-125 ${
                    hasLiked ? 'text-verity-pink fill-verity-pink' : 'group-hover:text-verity-pink'
                  }`}
                />
                <span>{likesCount.toLocaleString()}</span>
              </button>

              {/* Comment */}
              <button
                onClick={handleToggleComments}
                className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${
                  isKidsMode ? 'text-slate-800 hover:text-sky-600' : 'text-slate-300 hover:text-white'
                }`}
              >
                <MessageCircle size={20} className="hover:text-cyan-400" />
                <span>{commentsCount.toLocaleString()}</span>
              </button>

              {/* Save */}
              <button
                onClick={handleSave}
                className={`transition-colors ${
                  isKidsMode ? 'text-slate-800 hover:text-amber-600' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Bookmark
                  size={20}
                  className={hasSaved ? 'text-amber-500 fill-amber-500' : ''}
                />
              </button>
            </div>

            {/* Share */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin);
                alert("Post link copied to clipboard!");
              }}
              className={`p-1.5 rounded-full transition-colors ${
                isKidsMode ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Share2 size={19} />
            </button>
          </div>

          {/* Caption */}
          {post.caption && (
            <div className={`text-sm leading-relaxed ${isKidsMode ? 'text-slate-800' : 'text-slate-200'}`}>
              <span 
                className={`font-bold mr-2 hover:underline cursor-pointer ${isKidsMode ? 'text-slate-950' : 'text-white'}`}
                onClick={() => navigate(`/profile/${post.author_username}`)}
              >
                {post.author_username}
              </span>
              <span>{post.caption}</span>
            </div>
          )}

          {/* Transparent Recommendation Reason */}
          {post.recommendation_reason && (
            <div className={`flex items-center gap-1.5 text-[11px] pt-1 ${isKidsMode ? 'text-slate-600' : 'text-slate-400'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-verity-pink inline-block"></span>
              <span>{post.recommendation_reason}</span>
            </div>
          )}

          {/* Comments Accordion */}
          {showComments && (
            <div className={`pt-3 border-t space-y-3 animate-fade-in ${isKidsMode ? 'border-slate-200' : 'border-slate-800/80'}`}>
              {commentsLoading ? (
                <p className="text-xs text-slate-500">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-slate-500">No comments yet. Share your thoughts!</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <div key={c.id} className="text-xs flex items-start gap-2">
                      <img 
                        src={c.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'} 
                        alt={c.display_name} 
                        className="w-5 h-5 rounded-full object-cover mt-0.5"
                      />
                      <div>
                        <span className={`font-bold mr-1 ${isKidsMode ? 'text-slate-900' : 'text-slate-200'}`}>{c.username}</span>
                        <span className={isKidsMode ? 'text-slate-700' : 'text-slate-300'}>{c.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add a responsible comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="p-2 rounded-xl gradient-btn text-white disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          )}
        </div>
      </article>

      {/* Why Am I Seeing This Modal */}
      {showWhyModal && (
        <WhyAmISeeingThisModal
          post={post}
          onClose={() => setShowWhyModal(false)}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          postId={post.id}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  );
}
