import React, { useState } from 'react';
import { X, Camera, Sparkles, Upload } from 'lucide-react';
import { api } from '../../services/api';

export default function CreateStoryModal({ onClose, onStoryCreated }) {
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const res = await api.uploadMedia(file, 'posts');
      setMediaUrl(res.url);
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalUrl = mediaUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600';

    try {
      setLoading(true);
      const created = await api.createStory({
        media_url: finalUrl,
        caption,
        is_live: isLive,
      });
      if (onStoryCreated) onStoryCreated(created);
      onClose();
    } catch (err) {
      alert(err.message || 'Story could not be created');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-verity-card border border-verity-border rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-up text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="font-bold text-base text-white">Add to Your Story</h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Story Media</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400"
            />
            {mediaUrl && (
              <img src={mediaUrl} alt="Preview" className="w-full h-36 object-cover rounded-xl mt-2 border border-slate-800" />
            )}
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Caption (Optional)</label>
            <input
              type="text"
              placeholder="What's happening right now?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
            />
          </div>

          <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
              className="w-4 h-4 accent-verity-pink"
            />
            <span className="text-slate-300 font-semibold">Mark as Live Stream Highlight</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl gradient-btn font-bold text-white shadow-md shadow-pink-500/30"
            >
              Share Story
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
