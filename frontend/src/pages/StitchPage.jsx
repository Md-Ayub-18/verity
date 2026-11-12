import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Film, Plus, Check, Play, Upload, ShieldCheck, 
  Sparkles, Video, CheckCircle2, Clock, AlertCircle, Send, X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function StitchPage() {
  const { user, isKidsMode } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [interests, setInterests] = useState([]);
  const [publishCaption, setPublishCaption] = useState('');
  const [publishInterestId, setPublishInterestId] = useState(1);
  const [publishing, setPublishing] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [clipUrl, setClipUrl] = useState('');
  const [clipCaption, setClipCaption] = useState('');
  const [consentGiven, setConsentGiven] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stitchingInProgress, setStitchingInProgress] = useState(false);

  const fetchProjects = async () => {
    try {
      const data = await api.getStitchProjects();
      setProjects(data);
      if (data.length > 0 && !activeProject) {
        setActiveProject(data[0]);
      } else if (activeProject) {
        const found = data.find((p) => p.id === activeProject.id);
        if (found) setActiveProject(found);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
    api.getInterests()
      .then((list) => {
        setInterests(list);
        const art = list.find((i) => i.slug === 'art') || list[0];
        if (art) setPublishInterestId(art.id);
      })
      .catch(() => {});
  }, []);

  const canPublishFinal = activeProject && activeProject.final_video_url && (
    user?.id === activeProject.creator_id || user?.is_admin || user?.is_moderator
  );

  const handleOpenPublishModal = () => {
    if (!activeProject) return;
    setPublishCaption(`${activeProject.title} — Final Collaborative Stitch 🎬`);
    setShowPublishModal(true);
  };

  const handlePublishToProfile = async (e) => {
    e.preventDefault();
    if (!activeProject) return;
    try {
      setPublishing(true);
      await api.publishStitchedVideo(activeProject.id, {
        caption: publishCaption,
        interest_id: publishInterestId,
        audience: 'public',
      });
      setShowPublishModal(false);
      alert('Final stitched video published as a post on your profile!');
      navigate(`/profile/${user.username}`);
    } catch (err) {
      alert(err.message || 'Could not publish stitched video');
    } finally {
      setPublishing(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setLoading(true);
      const created = await api.createStitchProject({
        title: newTitle,
        description: newDescription,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      await fetchProjects();
      setActiveProject(created);
    } catch (err) {
      alert(err.message || 'Failed to create stitch project');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      const res = await api.uploadMedia(file, 'stitch');
      setClipUrl(res.url);
    } catch (err) {
      alert(err.message || 'Video upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitContribution = async (e) => {
    e.preventDefault();
    const finalClipUrl = clipUrl || "/uploads/stitch/clip_part1.mp4";

    try {
      setLoading(true);
      await api.submitContribution(activeProject.id, {
        project_id: activeProject.id,
        video_url: finalClipUrl,
        caption: clipCaption,
        consent_given: consentGiven,
      });
      setShowContributeModal(false);
      setClipUrl('');
      setClipCaption('');
      await fetchProjects();
    } catch (err) {
      alert(err.message || 'Failed to submit contribution');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClip = async (contribId) => {
    try {
      await api.reviewContribution(contribId, 'approved', 'Approved for final montage.');
      await fetchProjects();
    } catch (err) {
      alert(err.message || 'Failed to approve clip');
    }
  };

  const handleRenderStitch = async () => {
    if (!activeProject) return;
    try {
      setStitchingInProgress(true);
      const updated = await api.renderStitchedVideo(activeProject.id);
      setActiveProject(updated);
      await fetchProjects();
      alert('Stitching complete! Final video is ready for playback.');
    } catch (err) {
      alert(err.message || 'FFmpeg stitching encountered an issue.');
    } finally {
      setStitchingInProgress(false);
    }
  };

  return (
    <div className="w-full px-3 sm:px-4 md:px-1 py-4 md:py-0 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-verity-border/60">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Film size={26} className="text-verity-pink" />
            <span>Collaborative Stitch Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build shared multi-creator video montages with verified consent and FFmpeg processing.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-2xl gradient-btn font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/25"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Project Selector Bar */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {projects.map((proj) => (
          <button
            key={proj.id}
            onClick={() => setActiveProject(proj)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
              activeProject?.id === proj.id
                ? 'gradient-btn text-white border-transparent shadow-md'
                : 'bg-verity-card text-slate-300 border-verity-border hover:border-slate-700'
            }`}
          >
            {proj.title}
          </button>
        ))}
      </div>

      {activeProject && (
        <div className="space-y-6">
          {/* Final Video Hero at the Top whenever stitching is complete */}
          {activeProject.final_video_url && (
            <div className="p-5 sm:p-6 rounded-3xl bg-verity-card border border-emerald-500/35 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle2 size={12} /> Final Stitched Video Ready
                  </span>
                  <h2 className="text-xl font-extrabold text-white mt-1">{activeProject.title}</h2>
                </div>

                {canPublishFinal && (
                  <button
                    onClick={handleOpenPublishModal}
                    className="px-4 py-2.5 rounded-xl gradient-btn text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-500/30"
                  >
                    <Send size={14} /> Post to Profile
                  </button>
                )}
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-700 bg-black aspect-video max-h-[440px]">
                <video
                  key={activeProject.final_video_url}
                  src={activeProject.final_video_url}
                  preload="auto"
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 size={13} /> Final Stitched Montage Rendered Successfully via FFmpeg
              </p>
            </div>
          )}

          {/* Project Details & Controls Banner */}
          <div className="p-6 rounded-3xl bg-verity-card border border-verity-border shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-verity-coral bg-verity-pink/15 px-2.5 py-0.5 rounded-full">
                  Status: {activeProject.status}
                </span>
                <h2 className="text-xl font-extrabold text-white mt-1">{activeProject.title}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {activeProject.description} · Lead: @{activeProject.creator_username}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowContributeModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <Upload size={14} /> Submit Clip
                </button>

                <button
                  onClick={handleRenderStitch}
                  disabled={stitchingInProgress}
                  className="px-4 py-2 rounded-xl gradient-btn text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-500/30 disabled:opacity-50"
                >
                  <Sparkles size={14} /> {stitchingInProgress ? 'Stitching FFmpeg...' : 'Render Video'}
                </button>
              </div>
            </div>
          </div>

          {/* Contributions Timeline */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Video size={18} className="text-cyan-400" />
              <span>Contributed Clips ({activeProject.contributions.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {activeProject.contributions.map((clip, idx) => (
                <div
                  key={clip.id}
                  className="p-4 rounded-3xl bg-verity-card border border-verity-border space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[11px]">
                      {idx + 1}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      clip.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {clip.status}
                    </span>
                  </div>

                  <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
                    <video key={clip.video_url} src={clip.video_url} preload="auto" controls playsInline className="w-full h-full object-cover" />
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-bold text-white truncate">@{clip.username}</p>
                    <p className="text-slate-400 line-clamp-1">{clip.caption || 'No caption'}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <ShieldCheck size={11} className="text-emerald-400" /> Consent recorded
                    </p>
                  </div>

                  {clip.status === 'pending' && (
                    <button
                      onClick={() => handleApproveClip(clip.id)}
                      className="w-full py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors"
                    >
                      Approve for Final Stitch
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-verity-card border border-verity-border rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-up">
            <h3 className="font-bold text-base text-white">Create Stitch Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Project Title</label>
                <input
                  type="text"
                  placeholder="e.g. Earth Day Collaborative Video"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description & Guidelines</label>
                <textarea
                  rows={3}
                  placeholder="Tell contributors what clips to submit..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
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
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl gradient-btn font-bold text-white shadow-md shadow-pink-500/30"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Clip Modal */}
      {showContributeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-verity-card border border-verity-border rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-up">
            <h3 className="font-bold text-base text-white">Submit Video Clip</h3>
            <form onSubmit={handleSubmitContribution} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Upload MP4 Video</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">Or leave blank to use sample demo clip.</p>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Clip Description</label>
                <input
                  type="text"
                  placeholder="Describe your scene or contribution..."
                  value={clipCaption}
                  onChange={(e) => setClipCaption(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-verity-pink"
                />
              </div>

              {/* Explicit Consent Record */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-900 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="w-4 h-4 accent-verity-pink mt-0.5"
                />
                <span className="text-[11px] text-slate-300 leading-normal">
                  I grant permission for my clip to be stitched, shared, and included in the final collaborative project video under Verity terms.
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContributeModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !consentGiven}
                  className="flex-1 py-2.5 rounded-xl gradient-btn font-bold text-white shadow-md shadow-pink-500/30 disabled:opacity-50"
                >
                  Submit Clip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publish Stitched Video as Post Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-verity-card border border-verity-border rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-up text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Post Final Video to Profile</h3>
              <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePublishToProfile} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Post Caption</label>
                <textarea
                  rows={3}
                  value={publishCaption}
                  onChange={(e) => setPublishCaption(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-verity-pink"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Interest Category</label>
                <select
                  value={publishInterestId}
                  onChange={(e) => setPublishInterestId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-verity-pink"
                >
                  {interests.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="flex-1 py-2.5 rounded-xl gradient-btn font-bold text-white shadow-md shadow-pink-500/30 disabled:opacity-50"
                >
                  {publishing ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
