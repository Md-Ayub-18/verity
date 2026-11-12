import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, ArrowLeft, MoreHorizontal, Grid, 
  PlaySquare, Bookmark, Share2, Lock, Heart, MessageCircle,
  Camera, Edit3, Settings, UserX, Copy, X, Video, Plus, ShieldAlert, Trash2, Eye
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/feed/PostCard';
import ReelCard from '../components/reels/ReelCard';
import StoryViewer from '../components/feed/StoryViewer';

const isVideoPost = (post) =>
  post?.content_type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(post?.media_url || '');

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts'); // posts, reels, saved
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // Interactive modals
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedReel, setSelectedReel] = useState(null);
  const [showStories, setShowStories] = useState(false);

  // Highlights state
  const [showAddHighlightModal, setShowAddHighlightModal] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [highlightTitle, setHighlightTitle] = useState('');
  const [highlightMediaUrl, setHighlightMediaUrl] = useState('');
  const [highlightMediaType, setHighlightMediaType] = useState('photo');
  const [savingHighlight, setSavingHighlight] = useState(false);

  // 3-dots menu & Edit Profile Modal states
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const targetUsername = username || currentUser?.username;

  useEffect(() => {
    if (!targetUsername) return;
    setLoading(true);
    setShowMoreMenu(false);
    api.getProfile(targetUsername)
      .then((data) => {
        setProfile(data);
        setIsFollowing(data.is_following);
        setFollowersCount(data.followers_count);
        setEditDisplayName(data.display_name || '');
        setEditBio(data.bio || '');
        setEditAvatarUrl(data.avatar_url || '');
        if (data.is_self) {
          api.getSavedPosts().then(setSavedPosts).catch(() => {});
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [targetUsername]);

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSavingProfile(true);
      const uploaded = await api.uploadMedia(file, 'avatars');
      const updatedUser = await api.updateProfile({ avatar_url: uploaded.url });
      updateUser(updatedUser);
      setProfile((prev) => (prev ? { ...prev, avatar_url: uploaded.url } : prev));
      setEditAvatarUrl(uploaded.url);
    } catch (err) {
      alert(err.message || 'Failed to update profile picture');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveEditProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const updatedUser = await api.updateProfile({
        display_name: editDisplayName,
        bio: editBio,
        avatar_url: editAvatarUrl,
      });
      updateUser(updatedUser);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              display_name: updatedUser.display_name,
              bio: updatedUser.bio,
              avatar_url: updatedUser.avatar_url,
            }
          : prev
      );
      setShowEditModal(false);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleBlockUser = async () => {
    setShowMoreMenu(false);
    if (!profile) return;
    if (window.confirm(`Block @${profile.username}?`)) {
      try {
        await api.toggleBlockUser(profile.id);
        navigate('/');
      } catch (err) {
        alert(err.message || 'Could not block user');
      }
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    try {
      const res = await api.toggleFollowUser(profile.id);
      setIsFollowing(res.following);
      setFollowersCount(res.followers_count);
      const refreshed = await api.getProfile(targetUsername);
      setProfile(refreshed);
    } catch (err) {
      console.error(err);
    }
  };

  const handleHighlightFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    try {
      setSavingHighlight(true);
      const uploaded = await api.uploadMedia(file, 'posts');
      setHighlightMediaUrl(uploaded.url);
      setHighlightMediaType(isVideo ? 'video' : 'photo');
    } catch (err) {
      alert(err.message || 'Failed to upload highlight media');
    } finally {
      setSavingHighlight(false);
    }
  };

  const handleSaveHighlight = async (e) => {
    e.preventDefault();
    if (!highlightTitle.trim() || !highlightMediaUrl) {
      alert('Please enter a highlight title and upload a photo or video.');
      return;
    }
    try {
      setSavingHighlight(true);
      const created = await api.createHighlight({
        title: highlightTitle.trim(),
        cover_url: highlightMediaUrl,
        media_url: highlightMediaUrl,
        media_type: highlightMediaType,
      });
      setProfile((prev) =>
        prev ? { ...prev, highlights: [...(prev.highlights || []), created] } : prev
      );
      setHighlightTitle('');
      setHighlightMediaUrl('');
      setHighlightMediaType('photo');
      setShowAddHighlightModal(false);
    } catch (err) {
      alert(err.message || 'Could not add highlight');
    } finally {
      setSavingHighlight(false);
    }
  };

  const handleDeleteHighlight = async (highlightId) => {
    try {
      await api.deleteHighlight(highlightId);
      setProfile((prev) =>
        prev
          ? { ...prev, highlights: (prev.highlights || []).filter((h) => h.id !== highlightId) }
          : prev
      );
      setActiveHighlight(null);
    } catch (err) {
      alert(err.message || 'Could not delete highlight');
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center text-slate-400 text-sm">
        Loading creator profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center text-slate-400 text-sm">
        Creator profile not found.
      </div>
    );
  }

  const highlights = profile.highlights || [];

  return (
    <div className="w-full max-w-[780px] mx-auto px-3 sm:px-4 md:px-1 py-4 md:py-0 space-y-6">
      {/* Top Header matching Reference Image 2 */}
      <div className="flex items-center justify-between relative">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-extrabold text-sm text-slate-200">@{profile.username}</span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMoreMenu((prev) => !prev)}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <MoreHorizontal size={18} />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl py-1.5 z-40 text-xs font-semibold">
              {profile.is_self && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowEditModal(true);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2.5"
                  >
                    <Edit3 size={14} className="text-verity-pink" />
                    <span>Edit Profile & Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      navigate('/settings');
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2.5"
                  >
                    <Settings size={14} className="text-cyan-400" />
                    <span>Settings & Privacy</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  navigator.clipboard.writeText(window.location.href);
                  alert('Profile link copied!');
                }}
                className="w-full px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2.5"
              >
                <Copy size={14} />
                <span>Copy Profile Link</span>
              </button>
              {!profile.is_self && (
                <button
                  type="button"
                  onClick={handleBlockUser}
                  className="w-full px-3.5 py-2.5 text-left text-red-400 hover:bg-slate-800 flex items-center gap-2.5 border-t border-slate-800"
                >
                  <UserX size={14} />
                  <span>Block @{profile.username}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Creator Info Card */}
      <div className="flex items-start gap-4">
        {/* Avatar: gradient story ring ONLY when user has active stories, clickable to open StoryViewer */}
        <div
          onClick={() => {
            if (profile.stories && profile.stories.length > 0) {
              setShowStories(true);
            }
          }}
          title={profile.stories?.length > 0 ? 'View active story' : undefined}
          className={`relative p-0.5 rounded-full flex-shrink-0 ${
            profile.stories && profile.stories.length > 0
              ? 'gradient-border-ring cursor-pointer'
              : 'border border-slate-700'
          }`}
        >
          <img
            src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
            alt={profile.display_name}
            className="w-20 h-20 rounded-full object-cover border-2 border-verity-dark"
          />
          {profile.is_self && (
            <label
              onClick={(e) => e.stopPropagation()}
              title="Change Profile Picture"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full gradient-btn flex items-center justify-center text-white shadow-lg cursor-pointer border-2 border-verity-dark"
            >
              <Camera size={13} />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-extrabold text-white">{profile.display_name}</h1>
            {profile.is_verified && <CheckCircle2 size={16} className="text-sky-400 fill-sky-400/20" />}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{profile.bio}</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-verity-card border border-verity-border text-center">
        <div>
          <span className="font-extrabold text-base text-white">{followersCount.toLocaleString()}</span>
          <p className="text-[11px] text-slate-400 font-medium">Followers</p>
        </div>
        <div>
          <span className="font-extrabold text-base text-white">{profile.following_count.toLocaleString()}</span>
          <p className="text-[11px] text-slate-400 font-medium">Following</p>
        </div>
        <div>
          <span className="font-extrabold text-base text-white">{profile.posts_count.toLocaleString()}</span>
          <p className="text-[11px] text-slate-400 font-medium">Posts</p>
        </div>
      </div>

      {/* Follow & Share Action Buttons */}
      <div className="flex items-center gap-2">
        {!profile.is_self ? (
          <button
            onClick={handleFollow}
            className={`flex-1 py-3 rounded-2xl font-extrabold text-xs transition-all shadow-md ${
              isFollowing
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'gradient-btn shadow-pink-500/25'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        ) : (
          <button
            onClick={() => setShowEditModal(true)}
            className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold text-xs"
          >
            Edit Profile
          </button>
        )}

        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("Profile link copied!");
          }}
          className="p-3 rounded-2xl bg-verity-card hover:bg-slate-800 text-slate-300 border border-verity-border transition-colors"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Highlights Row: Only user-created highlights + a single '+' button for adding highlights */}
      {(highlights.length > 0 || profile.is_self) && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {highlights.map((hl) => (
              <div
                key={hl.id}
                onClick={() => setActiveHighlight(hl)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-700 group-hover:border-verity-pink transition-colors bg-slate-900">
                  {hl.media_type === 'video' ? (
                    <video src={hl.media_url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                  ) : (
                    <img src={hl.cover_url} alt={hl.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-300 max-w-[68px] truncate">{hl.title}</span>
              </div>
            ))}

            {profile.is_self && (
              <button
                type="button"
                onClick={() => setShowAddHighlightModal(true)}
                title="Add Highlight"
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-700 group-hover:border-verity-pink bg-verity-card flex items-center justify-center text-slate-300 group-hover:text-verity-pink transition-colors">
                  <Plus size={22} />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 group-hover:text-white">New</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab Switcher: Posts, Reels, Saved */}
      <div className="flex items-center justify-around border-t border-slate-800 pt-2 text-xs font-bold text-slate-400">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-1.5 pb-2 border-b-2 transition-all ${
            activeTab === 'posts' ? 'text-white border-verity-pink' : 'border-transparent hover:text-white'
          }`}
        >
          <Grid size={16} /> Posts
        </button>
        <button
          onClick={() => setActiveTab('reels')}
          className={`flex items-center gap-1.5 pb-2 border-b-2 transition-all ${
            activeTab === 'reels' ? 'text-white border-verity-pink' : 'border-transparent hover:text-white'
          }`}
        >
          <PlaySquare size={16} /> Reels
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-1.5 pb-2 border-b-2 transition-all ${
            activeTab === 'saved' ? 'text-white border-verity-pink' : 'border-transparent hover:text-white'
          }`}
        >
          <Bookmark size={16} /> Saved
        </button>
      </div>

      {/* Tab Content: Private Account Gate or Grid */}
      {profile.is_private_locked ? (
        <div className="p-10 text-center rounded-3xl bg-verity-card border border-verity-border space-y-2">
          <Lock size={30} className="text-verity-pink mx-auto" />
          <h3 className="font-bold text-white text-sm">This Account is Private</h3>
          <p className="text-xs text-slate-400">Follow @{profile.username} to view their posts and reels.</p>
        </div>
      ) : (
        <>
          {activeTab === 'posts' && (
            profile.posts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs rounded-3xl bg-verity-card border border-verity-border">
                No posts shared yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {profile.posts.map((post) => {
                  const isVideo = isVideoPost(post);
                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 group cursor-pointer"
                    >
                      {post.media_url ? (
                        isVideo ? (
                          <video
                            src={post.media_url}
                            preload="metadata"
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img src={post.media_url} alt="Post" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full p-3 flex items-center justify-center text-center text-xs text-slate-300 font-medium">
                          {post.caption}
                        </div>
                      )}

                      {(post.is_flagged || post.moderation_status !== 'approved') && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-extrabold flex items-center gap-1 shadow">
                          <ShieldAlert size={11} /> Flagged
                        </span>
                      )}

                      {isVideo && (
                        <span className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 text-white">
                          <Video size={14} />
                        </span>
                      )}

                      {/* Hover overlay with likes & comments */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 text-white font-bold text-xs transition-opacity">
                        <span className="flex items-center gap-1">
                          <Heart size={14} className="fill-white" /> {post.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={14} className="fill-white" /> {post.comments_count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {activeTab === 'reels' && (
            profile.reels.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs rounded-3xl bg-verity-card border border-verity-border">
                No Reels uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {profile.reels.map((reel) => (
                  <div
                    key={reel.id}
                    onClick={() => setSelectedReel(reel)}
                    className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-slate-800 group cursor-pointer"
                  >
                    {reel.thumbnail_url ? (
                      <img
                        src={reel.thumbnail_url}
                        alt={reel.caption || 'Reel thumbnail'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <video
                        src={reel.video_url}
                        preload="metadata"
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                    <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/55 text-white">
                      <PlaySquare size={13} />
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between text-[11px] font-bold text-white">
                      <span className="flex items-center gap-1 bg-black/55 px-2 py-0.5 rounded-full">
                        <Eye size={12} /> {(reel.views_count || 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 bg-black/55 px-2 py-0.5 rounded-full">
                        <Heart size={11} className="fill-white" /> {reel.likes_count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'saved' && (
            !profile.is_self ? (
              <div className="p-8 text-center text-slate-400 text-xs rounded-3xl bg-verity-card border border-verity-border">
                Only @{profile.username} can view their saved items.
              </div>
            ) : savedPosts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs rounded-3xl bg-verity-card border border-verity-border">
                You haven't saved any posts yet. Tap the bookmark icon on posts to save them here.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {savedPosts.map((post) => {
                  const isVideo = isVideoPost(post);
                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 group cursor-pointer"
                    >
                      {post.media_url ? (
                        isVideo ? (
                          <video
                            src={post.media_url}
                            preload="metadata"
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img src={post.media_url} alt="Saved post" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full p-3 flex items-center justify-center text-center text-xs text-slate-300 font-medium">
                          {post.caption}
                        </div>
                      )}
                      {(post.is_flagged || post.moderation_status !== 'approved') && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-extrabold flex items-center gap-1 shadow">
                          <ShieldAlert size={11} /> Flagged
                        </span>
                      )}

                      {isVideo && (
                        <span className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 text-white">
                          <Video size={14} />
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 text-white font-bold text-xs transition-opacity">
                        <span className="flex items-center gap-1">
                          <Heart size={14} className="fill-white" /> {post.likes_count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}

      {/* Edit Profile & Avatar Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-verity-card border border-verity-border rounded-3xl p-6 shadow-2xl space-y-4 text-xs animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Edit Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={editAvatarUrl || profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                  alt="Preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-verity-pink"
                />
                <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer flex items-center gap-1.5 border border-slate-700">
                  <Camera size={14} className="text-verity-pink" />
                  <span>{savingProfile ? 'Uploading...' : 'Upload New Photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-verity-pink"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-verity-pink"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 py-2.5 rounded-xl gradient-btn font-bold text-white"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instagram-Style Post Detail Modal */}
      {selectedPost && (
        <div
          onClick={() => setSelectedPost(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl my-auto relative animate-slide-up"
          >
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X size={20} />
            </button>
            <PostCard
              post={selectedPost}
              onHide={() => setSelectedPost(null)}
            />
          </div>
        </div>
      )}

      {/* Reel Detail Modal */}
      {selectedReel && (
        <div
          onClick={() => setSelectedReel(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[420px]">
            <button
              onClick={() => setSelectedReel(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-30"
            >
              <X size={20} />
            </button>
            <ReelCard key={selectedReel.id} reel={selectedReel} isActive={true} />
          </div>
        </div>
      )}

      {/* Profile Stories Viewer */}
      {showStories && profile.stories && profile.stories.length > 0 && (
        <StoryViewer
          stories={profile.stories}
          initialIndex={0}
          onClose={() => setShowStories(false)}
        />
      )}

      {/* Add Highlight Modal */}
      {showAddHighlightModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-verity-card border border-verity-border rounded-3xl p-6 shadow-2xl space-y-4 text-xs animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Add Profile Highlight</h3>
              <button onClick={() => setShowAddHighlightModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveHighlight} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Highlight Title</label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  placeholder="e.g. Travel, Studio, Milestones"
                  value={highlightTitle}
                  onChange={(e) => setHighlightTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-verity-pink"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Photo or Video</label>
                <label className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-700 hover:border-verity-pink bg-slate-900/70 flex flex-col items-center justify-center gap-2 cursor-pointer text-center">
                  <Plus size={20} className="text-verity-pink" />
                  <span className="text-slate-300 font-semibold">
                    {savingHighlight ? 'Uploading...' : highlightMediaUrl ? 'Change Highlight Media' : 'Upload Photo or Video'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    onChange={handleHighlightFileChange}
                    className="hidden"
                  />
                </label>

                {highlightMediaUrl && (
                  <div className="mt-3 h-40 rounded-2xl overflow-hidden border border-slate-700 bg-black">
                    {highlightMediaType === 'video' ? (
                      <video src={highlightMediaUrl} controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={highlightMediaUrl} alt="Highlight preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHighlightModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHighlight}
                  className="flex-1 py-2.5 rounded-xl gradient-btn font-bold text-white"
                >
                  {savingHighlight ? 'Saving...' : 'Save Highlight'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Highlight Viewer Modal */}
      {activeHighlight && (
        <div
          onClick={() => setActiveHighlight(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-verity-card border border-verity-border rounded-3xl overflow-hidden shadow-2xl animate-slide-up"
          >
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">{activeHighlight.title}</h3>
              <div className="flex items-center gap-2">
                {profile.is_self && (
                  <button
                    onClick={() => handleDeleteHighlight(activeHighlight.id)}
                    title="Delete Highlight"
                    className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  onClick={() => setActiveHighlight(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="bg-black max-h-[70vh] flex items-center justify-center">
              {activeHighlight.media_type === 'video' ? (
                <video src={activeHighlight.media_url} controls autoPlay className="w-full max-h-[70vh] object-contain" />
              ) : (
                <img src={activeHighlight.media_url} alt={activeHighlight.title} className="w-full max-h-[70vh] object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
