import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Globe, Sparkles, ArrowLeft, Image, Film, Music
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function CreatePostModal({ onClose, onPostCreated }) {
  const { user, isKidsMode } = useAuth();

  // Only two clean creation types: 'post' (images, videos, or text) and 'reel' (short videos)
  const [createKind, setCreateKind] = useState('post');
  const [detectedMediaType, setDetectedMediaType] = useState('text'); // 'photo' | 'video' | 'text'
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [audioTitle, setAudioTitle] = useState('Original Audio');
  const [selectedInterestId, setSelectedInterestId] = useState(1);
  const [interests, setInterests] = useState([]);
  const [audience, setAudience] = useState(user?.default_audience || 'public');
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [tags, setTags] = useState(['verity', 'creative']);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getInterests().then((data) => {
      const filtered = (user?.account_type === 'child' || isKidsMode)
        ? data.filter((i) => i.is_child_permitted)
        : data;
      setInterests(filtered);
      if (filtered.length > 0) setSelectedInterestId(filtered[0].id);
    }).catch(() => {});
  }, [user, isKidsMode]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    if (createKind === 'reel' && !isVideo) {
      alert('Reels require a short video file (MP4, WEBM, MOV).');
      return;
    }

    try {
      setLoading(true);
      const category = createKind === 'reel' ? 'reels' : 'posts';
      const res = await api.uploadMedia(file, category);
      setMediaUrl(res.url);
      setDetectedMediaType(isVideo ? 'video' : 'photo');
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const clearMedia = () => {
    setMediaUrl('');
    setThumbnailUrl('');
    setDetectedMediaType('text');
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const res = await api.uploadMedia(file, 'reels');
      setThumbnailUrl(res.url);
    } catch (err) {
      alert(err.message || 'Thumbnail upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim().replace(/^#/, ''))) {
      setTags([...tags, newTag.trim().replace(/^#/, '')]);
      setNewTag('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fullCaption = `${caption} ${tags.map((t) => `#${t}`).join(' ')}`.trim();

    if (createKind === 'reel') {
      if (!mediaUrl) {
        alert('Please upload a short video for your Reel.');
        return;
      }
      setLoading(true);
      try {
        const createdReel = await api.createReel({
          video_url: mediaUrl,
          thumbnail_url: thumbnailUrl || null,
          caption: fullCaption,
          interest_id: selectedInterestId,
          audio_title: audioTitle || 'Original Audio',
          is_ai_generated: isAiGenerated,
          ai_label_explanation: isAiGenerated
            ? (aiExplanation || 'Creator declared this reel as AI-assisted.')
            : null,
        });
        if (onPostCreated) onPostCreated(createdReel);
        onClose();
      } catch (err) {
        alert(err.message || 'Failed to publish reel');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Standard Post (covers image, video, or text-only)
    if (!mediaUrl && !caption.trim()) {
      alert('Please add a photo/video or write a caption for your post.');
      return;
    }

    const contentType = mediaUrl ? detectedMediaType : 'text';

    setLoading(true);
    try {
      const createdPost = await api.createPost({
        content_type: contentType,
        media_url: mediaUrl || null,
        caption: fullCaption,
        interest_id: selectedInterestId,
        audience,
        is_ai_generated: isAiGenerated,
        ai_label_explanation: isAiGenerated
          ? (aiExplanation || 'Content generated or enhanced using generative AI.')
          : null,
      });
      if (onPostCreated) onPostCreated(createdPost);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-5 my-auto ${
        isKidsMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-verity-card border-verity-border text-slate-100'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800/40 text-slate-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-base font-extrabold tracking-tight">Create & Share</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800/40 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Two Clear Creation Modes: Post (Photo/Video/Text) or Reel (Short Video) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setCreateKind('post'); clearMedia(); }}
            className={`flex-1 py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              createKind === 'post' ? 'gradient-btn shadow-md' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <Image size={15} /> Post (Photo / Video / Text)
          </button>
          {user?.account_type !== 'child' && (
            <button
              type="button"
              onClick={() => { setCreateKind('reel'); clearMedia(); }}
              className={`flex-1 py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                createKind === 'reel' ? 'gradient-btn shadow-md' : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              <Film size={15} /> Reel (Short Video)
            </button>
          )}
        </div>

        {/* Media Upload Area */}
        <div className="flex items-center gap-3">
          <label className="w-28 h-32 rounded-2xl border-2 border-dashed border-slate-700 hover:border-verity-pink flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors flex-shrink-0 bg-slate-900/60 text-center px-2">
            <input
              type="file"
              accept={createKind === 'reel' ? 'video/mp4,video/webm,video/quicktime' : 'image/*,video/mp4,video/webm,video/quicktime'}
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-7 h-7 rounded-full gradient-btn flex items-center justify-center text-white shadow">
              <Plus size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {createKind === 'reel' ? 'Upload Video' : 'Add Photo / Video'}
            </span>
          </label>

          {mediaUrl ? (
            <div className="relative flex-1 h-32 rounded-2xl overflow-hidden border border-slate-700 bg-black">
              {detectedMediaType === 'video' || createKind === 'reel' ? (
                <video src={mediaUrl} controls className="w-full h-full object-contain" />
              ) : (
                <img src={mediaUrl} alt="Uploaded preview" className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={clearMedia}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-red-500 text-white flex items-center justify-center"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="flex-1 h-32 rounded-2xl border border-slate-800/70 bg-slate-900/30 flex items-center justify-center text-center px-4 text-[11px] text-slate-400">
              {createKind === 'reel'
                ? 'Select a vertical or short MP4/WEBM video to publish to Reels.'
                : 'Upload an image or video, or leave empty to publish a text post.'}
            </div>
          )}
        </div>

        {/* Optional Reel Cover Thumbnail */}
        {createKind === 'reel' && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="Reel thumbnail" className="w-10 h-14 rounded-lg object-cover border border-slate-700 flex-shrink-0" />
              ) : (
                <div className="w-10 h-14 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <Image size={16} />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-slate-200">Reel Thumbnail</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {thumbnailUrl ? 'Custom cover selected' : 'Optional — auto-generated from your video if omitted'}
                </p>
              </div>
            </div>
            <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer whitespace-nowrap border border-slate-700">
              {thumbnailUrl ? 'Change' : 'Upload Cover'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleThumbnailUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Caption */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-300">Caption</label>
            <span className="text-[11px] text-slate-500">{caption.length}/200</span>
          </div>
          <textarea
            rows={3}
            maxLength={200}
            placeholder={createKind === 'reel' ? 'Describe your Reel...' : 'Share a moment, photo, video, or thought...'}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
          />
        </div>

        {/* Hashtags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {tags.map((t) => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-full bg-verity-pink/15 text-verity-coral border border-verity-pink/30 text-xs font-bold flex items-center gap-1"
            >
              #{t}
              <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))}>
                <X size={10} />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className="w-16 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-white"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 hover:text-white"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Primary Interest */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1.5">Primary Interest</label>
          <select
            value={selectedInterestId}
            onChange={(e) => setSelectedInterestId(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-verity-pink"
          >
            {interests.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} {i.is_child_permitted ? '(Child Safe)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Audio Title for Reels OR Audience for Posts (NO location!) */}
        <div className="space-y-2.5 text-xs">
          {createKind === 'reel' ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="flex items-center gap-2 text-slate-300">
                <Music size={15} className="text-verity-pink" /> Audio Track
              </span>
              <input
                type="text"
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
                className="text-right bg-transparent text-slate-200 font-semibold focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="flex items-center gap-2 text-slate-300">
                <Globe size={15} className="text-cyan-400" /> Audience
              </span>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none"
              >
                <option value="public" className="bg-slate-900">Public</option>
                <option value="followers" className="bg-slate-900">Followers Only</option>
                <option value="private" className="bg-slate-900">Private</option>
              </select>
            </div>
          )}

          {/* AI-Content Disclosure */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-verity-coral animate-pulse" />
                <span className="font-bold text-slate-200">AI-Content Disclosure</span>
              </div>
              <input
                type="checkbox"
                checked={isAiGenerated}
                onChange={(e) => setIsAiGenerated(e.target.checked)}
                className="w-4 h-4 accent-verity-pink cursor-pointer"
              />
            </div>
            {isAiGenerated && (
              <input
                type="text"
                placeholder="Explain the AI model or tooling used..."
                value={aiExplanation}
                onChange={(e) => setAiExplanation(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-white focus:outline-none focus:border-verity-pink"
              />
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-2xl gradient-btn font-extrabold text-sm shadow-xl shadow-pink-500/30 disabled:opacity-50"
        >
          {loading ? 'Publishing...' : createKind === 'reel' ? 'Publish Reel' : 'Share Post'}
        </button>
      </div>
    </div>
  );
}
