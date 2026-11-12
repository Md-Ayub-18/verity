import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, MessageCircle, Bookmark, Share2, Volume2, 
  VolumeX, Music, CheckCircle2, Sparkles, Flag, X, Send, Play, Pause, Eye
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ReelCard({ reel, isActive }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasLiked, setHasLiked] = useState(reel.has_liked);
  const [likesCount, setLikesCount] = useState(reel.likes_count);
  const [hasSaved, setHasSaved] = useState(reel.has_saved);
  const [isFollowing, setIsFollowing] = useState(reel.is_following_author);
  const [commentsCount, setCommentsCount] = useState(reel.comments_count);
  const [viewsCount, setViewsCount] = useState(reel.views_count || 0);
  const viewTrackedRef = useRef(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('hate_speech');
  const [reportDesc, setReportDesc] = useState('');

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isActive) {
      if (!viewTrackedRef.current) {
        viewTrackedRef.current = true;
        api.trackReelView(reel.id)
          .then((res) => {
            if (typeof res?.views_count === 'number') setViewsCount(res.views_count);
          })
          .catch(() => {});
      }
      vid.currentTime = 0;
      vid.volume = 1.0;
      vid.muted = false;
      vid.play()
        .then(() => {
          setIsMuted(false);
          setIsPlaying(true);
        })
        .catch(() => {
          // Browser blocked unmuted autoplay -> fallback to muted autoplay with clear unmute pill
          vid.muted = true;
          setIsMuted(true);
          vid.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      if (isMuted) {
        vid.muted = false;
        vid.volume = 1.0;
        setIsMuted(false);
      }
      vid.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    const nextMuted = !isMuted;
    vid.muted = nextMuted;
    if (!nextMuted) {
      vid.volume = 1.0;
      vid.play().catch(() => {});
    }
    setIsMuted(nextMuted);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const res = await api.toggleLikeReel(reel.id);
      setHasLiked(res.liked);
      setLikesCount(res.likes_count);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    try {
      const res = await api.toggleSaveReel(reel.id);
      setHasSaved(res.saved);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async (e) => {
    e.stopPropagation();
    try {
      const res = await api.toggleFollowUser(reel.user_id);
      setIsFollowing(res.following);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenComments = async (e) => {
    e.stopPropagation();
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      setCommentsLoading(true);
      try {
        const res = await api.getReelComments(reel.id);
        setComments(res);
      } catch (err) {
        console.error(err);
      } finally {
        setCommentsLoading(false);
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const created = await api.addReelComment(reel.id, newComment);
      setComments((prev) => [...prev, created]);
      setCommentsCount((prev) => prev + 1);
      setNewComment('');
    } catch (err) {
      alert(err.message || 'Could not post comment');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.reportReel(reel.id, { reason: reportReason, description: reportDesc });
      setShowReportModal(false);
      setReportDesc('');
      alert('Thank you. This reel has been reported for moderator review.');
    } catch (err) {
      alert(err.message || 'Could not submit report');
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-136px)] md:h-[calc(100dvh-56px)] max-h-[780px] max-w-[420px] mx-auto rounded-3xl overflow-hidden bg-black shadow-2xl flex items-center justify-center select-none snap-start">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={reel.video_url}
        poster={reel.thumbnail_url || undefined}
        preload="auto"
        autoPlay
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlay}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Play/Pause center hint when paused */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center z-10 bg-black/25 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
            <Play size={28} className="ml-1" />
          </div>
        </div>
      )}

      {/* Top Overlay: Category Pill + AI Badge + Mute/Play/Report */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold text-xs shadow-lg">
            {reel.interest_name}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-slate-200 font-semibold text-[11px] flex items-center gap-1">
            <Eye size={12} /> {viewsCount.toLocaleString()}
          </span>
          {reel.is_ai_generated && (
            <span className="px-2.5 py-1 rounded-full bg-verity-pink/30 backdrop-blur-md border border-verity-pink/40 text-white font-semibold text-[11px] flex items-center gap-1">
              <Sparkles size={11} className="text-verity-coral" /> AI Reel
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            title={isPlaying ? 'Pause' : 'Play'}
            className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/10 hover:bg-black/70 transition-colors"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            className={`px-2.5 py-1.5 rounded-full backdrop-blur-md text-white border transition-colors flex items-center gap-1.5 text-[11px] font-bold ${
              isMuted
                ? 'bg-verity-pink/80 border-white/30 animate-pulse'
                : 'bg-black/50 border-white/10 hover:bg-black/70'
            }`}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            {isMuted && <span>Tap for Sound</span>}
          </button>
        </div>
      </div>

      {/* Right Action Icons Column */}
      <div className="absolute right-3.5 bottom-20 z-20 flex flex-col items-center gap-4 text-white">
        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleLike}
            className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-125 ${
              hasLiked ? 'bg-verity-pink/30 text-verity-pink' : 'bg-black/40 hover:bg-black/60'
            }`}
          >
            <Heart size={22} className={hasLiked ? 'fill-verity-pink' : ''} />
          </button>
          <span className="text-xs font-bold shadow-sm">{likesCount.toLocaleString()}</span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleOpenComments}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all"
          >
            <MessageCircle size={22} />
          </button>
          <span className="text-xs font-bold">{commentsCount.toLocaleString()}</span>
        </div>

        {/* Save */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleSave}
            className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
              hasSaved ? 'bg-amber-500/30 text-amber-400' : 'bg-black/40 hover:bg-black/60'
            }`}
          >
            <Bookmark size={22} className={hasSaved ? 'fill-amber-400' : ''} />
          </button>
          <span className="text-xs font-bold">Save</span>
        </div>

        {/* Share */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(window.location.href);
            alert('Reel link copied!');
          }}
          className="w-11 h-11 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all"
        >
          <Share2 size={20} />
        </button>

        {/* Report */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowReportModal(true); }}
          title="Report Reel"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 hover:bg-amber-500/30 text-amber-300 backdrop-blur-md transition-all"
        >
          <Flag size={18} />
        </button>

        {/* Audio spinning vinyl icon */}
        <div className="w-9 h-9 rounded-full border-2 border-white/60 overflow-hidden bg-black flex items-center justify-center animate-spin">
          <Music size={14} />
        </div>
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute left-0 right-16 bottom-4 z-20 p-4 text-white space-y-2 pointer-events-none">
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <img
            src={reel.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt={reel.author_display_name}
            onClick={() => navigate(`/profile/${reel.author_username}`)}
            className="w-10 h-10 rounded-full object-cover border-2 border-verity-pink/60 cursor-pointer"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span
                onClick={() => navigate(`/profile/${reel.author_username}`)}
                className="font-bold text-sm hover:underline cursor-pointer"
              >
                {reel.author_display_name}
              </span>
              {reel.author_is_verified && <CheckCircle2 size={13} className="text-sky-400 fill-sky-400/20" />}
            </div>
            <span className="text-[11px] text-white/70">@{reel.author_username}</span>
          </div>

          {user?.id !== reel.user_id && (
            <button
              onClick={handleFollow}
              className={`ml-2 text-xs px-3 py-1 rounded-full font-bold transition-all ${
                isFollowing ? 'bg-white/20 text-white' : 'gradient-btn text-white shadow-md'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {reel.caption && (
          <p className="text-xs text-white/90 leading-snug line-clamp-2 pointer-events-auto">
            {reel.caption}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-white/80 pointer-events-auto">
          <Music size={12} className="flex-shrink-0" />
          <span className="truncate">{reel.audio_title}</span>
        </div>
      </div>

      {reel.recommendation_reason && (
        <div className="absolute top-14 left-4 z-20 text-[10px] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-white/80 border border-white/10 pointer-events-none">
          {reel.recommendation_reason}
        </div>
      )}

      {/* Comments Drawer Overlay */}
      {showComments && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 h-[62%] z-30 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 rounded-t-3xl p-4 flex flex-col animate-slide-up"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-sm text-white">Comments ({commentsCount})</h4>
            <button onClick={() => setShowComments(false)} className="p-1 text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {commentsLoading ? (
              <p className="text-xs text-slate-400 text-center">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No comments yet. Start the conversation!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5 text-xs">
                  <img
                    src={c.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                    alt={c.username}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                  />
                  <div>
                    <span className="font-bold text-white mr-1.5">@{c.username}</span>
                    <span className="text-slate-300">{c.text}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              placeholder="Add a comment..."
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

      {/* Report Modal inside Reel */}
      {showReportModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <form onSubmit={handleReportSubmit} className="w-full bg-verity-card border border-verity-border rounded-3xl p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Flag size={15} className="text-amber-400" /> Report Reel
              </h4>
              <button type="button" onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
            >
              <option value="hate_speech">Hate speech</option>
              <option value="harassment">Harassment or bullying</option>
              <option value="misinformation">Misinformation</option>
              <option value="nsfw">Inappropriate / NSFW</option>
              <option value="spam">Spam</option>
              <option value="child_safety">Child safety concern</option>
            </select>
            <textarea
              rows={2}
              placeholder="Additional details (optional)..."
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500"
            />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold">
              Submit Report
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
