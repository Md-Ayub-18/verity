import React, { useState } from 'react';
import { X, Flag, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../../services/api';

const REPORT_REASONS = [
  { id: 'hate_speech', label: 'Hate speech or toxic symbols' },
  { id: 'harassment', label: 'Bullying, targeted harassment, or threats' },
  { id: 'misinformation', label: 'Harmful or deceptive misinformation' },
  { id: 'nsfw', label: 'Inappropriate, adult, or graphic imagery' },
  { id: 'spam', label: 'Deceptive financial scam or spam' },
  { id: 'child_safety', label: 'Child safety or minor exploitation concern' },
  { id: 'other', label: 'Other violation of community guidelines' },
];

export default function ReportModal({ postId, onClose }) {
  const [selectedReason, setSelectedReason] = useState('hate_speech');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.reportPost(postId, {
        reason: selectedReason,
        description,
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      alert(err.message || 'Report could not be submitted');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-verity-card border border-verity-border rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-up">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Flag size={18} className="text-amber-400" />
            <h3 className="font-bold text-base text-white">Report Content</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle size={40} className="text-emerald-400 mx-auto" />
            <h4 className="font-bold text-white text-base">Report Received</h4>
            <p className="text-xs text-slate-400">Our safety team is reviewing this post.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-300">
              Why are you reporting this post? Your report is confidential.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                    selectedReason === r.id
                      ? 'bg-amber-500/10 border-amber-500/40 text-white font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={r.id}
                    checked={selectedReason === r.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="accent-amber-400"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Help us understand the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
