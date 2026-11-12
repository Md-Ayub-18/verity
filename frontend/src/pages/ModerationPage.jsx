import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Flag, Bot, Users, 
  Clock, CheckCircle2, XCircle, Eye, Trash2, Check 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ModerationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('flagged'); // flagged, comments, appeals, reports, bots, bullying, audit
  const [summary, setSummary] = useState(null);
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [flaggedComments, setFlaggedComments] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [reports, setReports] = useState([]);
  const [bots, setBots] = useState([]);
  const [bullying, setBullying] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchModerationData = async () => {
    try {
      setLoading(true);
      const [sum, flg, flgComm, apls, reps, bts, bly, logs] = await Promise.all([
        api.getModerationSummary(),
        api.getFlaggedPosts(),
        api.getFlaggedComments(),
        api.getAppeals(),
        api.getReports('pending'),
        api.getBotSignals(),
        api.getBullyingSignals(),
        api.getAuditLogs(),
      ]);
      setSummary(sum);
      setFlaggedPosts(flg);
      setFlaggedComments(flgComm);
      setAppeals(apls);
      setReports(reps);
      setBots(bts);
      setBullying(bly);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationData();
  }, []);

  const handlePostAction = async (postId, action, reason) => {
    try {
      await api.takePostModerationAction(postId, { action, reason });
      fetchModerationData();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleResolveReport = async (reportId, action) => {
    try {
      await api.resolveReport(reportId, action, `Report ${action}d by moderator`);
      fetchModerationData();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  if (!user?.is_moderator && !user?.is_admin) {
    return (
      <div className="max-w-md mx-auto p-8 text-center text-slate-400 space-y-3">
        <ShieldCheck size={36} className="text-red-400 mx-auto" />
        <h2 className="text-base font-bold text-white">Restricted Access</h2>
        <p className="text-xs">You must be logged in as an authorized moderator to access this dashboard.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-4 md:px-1 py-4 md:py-0 space-y-5">
      {/* Header */}
      <div className="p-5 rounded-[18px] glass-card flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#F4F5FF] flex items-center gap-2.5">
            <ShieldCheck size={24} className="text-[#FF477E]" />
            <span>Moderation & Safety Center</span>
          </h1>
          <p className="text-xs text-[#A0A8BE] mt-1">
            Review safety alerts, triage incoming reports, inspect bot signals, and log audit decisions.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-[18px] glass-card">
            <span className="text-[11px] font-bold text-[#A0A8BE]">Pending Reports</span>
            <p className="text-2xl font-black text-amber-400 mt-1">{summary.pending_reports_count}</p>
          </div>
          <div className="p-4 rounded-[18px] glass-card">
            <span className="text-[11px] font-bold text-[#A0A8BE]">Flagged Posts</span>
            <p className="text-2xl font-black text-[#FF477E] mt-1">{summary.flagged_posts_count}</p>
          </div>
          <div className="p-4 rounded-[18px] glass-card">
            <span className="text-[11px] font-bold text-[#A0A8BE]">Suspicious Bots</span>
            <p className="text-2xl font-black text-[#8657FF] mt-1">{summary.suspicious_bots_count}</p>
          </div>
          <div className="p-4 rounded-[18px] glass-card">
            <span className="text-[11px] font-bold text-[#A0A8BE]">Bullying Signals</span>
            <p className="text-2xl font-black text-[#36CFFF] mt-1">{summary.bullying_signals_count}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('flagged')}
          className={`px-4 py-2 rounded-2xl whitespace-nowrap transition-all ${
            activeTab === 'flagged' ? 'gradient-btn text-white shadow' : 'text-slate-400 hover:text-white bg-verity-card'
          }`}
        >
          Flagged Posts ({flaggedPosts.length})
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`px-4 py-2 rounded-2xl whitespace-nowrap transition-all ${
            activeTab === 'comments' ? 'gradient-btn text-white shadow' : 'text-slate-400 hover:text-white bg-verity-card'
          }`}
        >
          Flagged Comments ({flaggedComments.length})
        </button>
        <button
          onClick={() => setActiveTab('appeals')}
          className={`px-4 py-2 rounded-2xl whitespace-nowrap transition-all ${
            activeTab === 'appeals' ? 'gradient-btn text-white shadow' : 'text-slate-400 hover:text-white bg-verity-card'
          }`}
        >
          Appeals ({appeals.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-2xl whitespace-nowrap transition-all ${
            activeTab === 'reports' ? 'gradient-btn text-white shadow' : 'text-slate-400 hover:text-white bg-verity-card'
          }`}
        >
          Reports ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('bots')}
          className={`px-4 py-2 rounded-2xl transition-all ${
            activeTab === 'bots' ? 'gradient-btn text-white shadow' : 'text-slate-400 hover:text-white bg-verity-card'
          }`}
        >
          Bot Signals ({bots.length})
        </button>
        <button
          onClick={() => setActiveTab('bullying')}
          className={`px-4 py-2 rounded-2xl transition-all ${
            activeTab === 'bullying' ? 'gradient-btn text-white shadow' : 'text-slate-400 hover:text-white bg-verity-card'
          }`}
        >
          Bullying Patterns ({bullying.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-2xl transition-all ${
            activeTab === 'audit' ? 'gradient-btn text-white shadow' : 'text-slate-400 hover:text-white bg-verity-card'
          }`}
        >
          Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* Tab: Flagged Posts */}
      {activeTab === 'flagged' && (
        <div className="space-y-4">
          {flaggedPosts.length === 0 ? (
            <p className="text-xs text-slate-400 p-6 text-center bg-verity-card rounded-2xl">
              No content currently pending safety review.
            </p>
          ) : (
            flaggedPosts.map((post) => (
              <div key={post.id} className="p-5 rounded-3xl bg-verity-card border border-verity-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">@{post.author_username}</span>
                    <span className="text-slate-400">• Post ID #{post.id}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] uppercase">
                    Status: {post.moderation_status}
                  </span>
                </div>

                <p className="text-xs text-slate-200 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                  {post.caption || '(No caption provided)'}
                </p>

                {post.media_url && (
                  <img src={post.media_url} alt="Flagged" className="w-full max-h-48 object-cover rounded-2xl border border-slate-800" />
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 text-xs">
                  <button
                    onClick={() => handlePostAction(post.id, 'approve', 'Moderator verified content meets standards.')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <Check size={14} /> Approve Post
                  </button>
                  <button
                    onClick={() => handlePostAction(post.id, 'remove', 'Removed due to community violations.')}
                    className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Remove Post
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <p className="text-xs text-slate-400 p-6 text-center bg-verity-card rounded-2xl">
              All user reports have been reviewed and resolved.
            </p>
          ) : (
            reports.map((rep) => (
              <div key={rep.id} className="p-5 rounded-3xl bg-verity-card border border-verity-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase">
                    Violation: {rep.reason}
                  </span>
                  <span className="text-slate-400">Reported by @{rep.reporter_username}</span>
                </div>

                <p className="text-xs text-slate-300">
                  <strong>Description: </strong> {rep.description || 'No additional note provided.'}
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 text-xs">
                  <button
                    onClick={() => handleResolveReport(rep.id, 'resolve')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold"
                  >
                    Action & Resolve
                  </button>
                  <button
                    onClick={() => handleResolveReport(rep.id, 'dismiss')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                  >
                    Dismiss Report
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Bot Signals */}
      {activeTab === 'bots' && (
        <div className="space-y-4">
          {bots.map((bot) => (
            <div key={bot.id} className="p-5 rounded-3xl bg-verity-card border border-verity-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Bot size={18} className="text-purple-400" />
                  <span className="font-bold text-white">@{bot.username}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                  Anomaly Score: {(bot.anomaly_score * 100).toFixed(0)}%
                </span>
              </div>

              <div className="text-xs space-y-1">
                <p className="text-slate-300">Rapid actions recorded: <strong>{bot.rapid_action_count}</strong></p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {bot.flags_detected.map((f, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Bullying Patterns */}
      {activeTab === 'bullying' && (
        <div className="space-y-4">
          {bullying.map((signal) => (
            <div key={signal.id} className="p-5 rounded-3xl bg-verity-card border border-verity-border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">
                  Actor: @{signal.actor_username} ➔ Target: @{signal.target_username}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] uppercase">
                  Severity: {signal.signal_severity}
                </span>
              </div>
              <p className="text-slate-400">
                Repeated toxic comments or harassment incidents: <strong className="text-rose-400">{signal.repeated_flagged_interactions}</strong>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Flagged Comments */}
      {activeTab === 'comments' && (
        <div className="space-y-3">
          {flaggedComments.length === 0 ? (
            <p className="text-xs text-slate-400 p-6 text-center bg-verity-card rounded-2xl">
              No flagged comments pending review.
            </p>
          ) : (
            flaggedComments.map((c) => (
              <div key={c.id} className="p-4 rounded-3xl bg-verity-card border border-verity-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">@{c.username}</span>
                  <span className="text-slate-400">Comment #{c.id}</span>
                </div>
                <p className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">{c.text}</p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={async () => { await api.moderateComment(c.id, 'approve'); fetchModerationData(); }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={async () => { await api.moderateComment(c.id, 'remove'); fetchModerationData(); }}
                    className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 font-bold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Appeals */}
      {activeTab === 'appeals' && (
        <div className="space-y-3">
          {appeals.length === 0 ? (
            <p className="text-xs text-slate-400 p-6 text-center bg-verity-card rounded-2xl">
              No user appeals submitted yet.
            </p>
          ) : (
            appeals.map((a) => (
              <div key={a.id} className="p-4 rounded-3xl bg-verity-card border border-verity-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">@{a.username} • {a.entity_type} #{a.entity_id}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase">
                    {a.status}
                  </span>
                </div>
                <p className="text-slate-300">{a.reason}</p>
                {a.status === 'pending' && (
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={async () => { await api.resolveAppeal(a.id, 'approve', 'Appeal upheld'); fetchModerationData(); }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold"
                    >
                      Approve & Restore
                    </button>
                    <button
                      onClick={async () => { await api.resolveAppeal(a.id, 'reject', 'Decision upheld'); fetchModerationData(); }}
                      className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 font-bold"
                    >
                      Reject Appeal
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Audit Log */}
      {activeTab === 'audit' && (
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-3.5 rounded-2xl bg-verity-card border border-verity-border flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white">{log.moderator_name}</span>
                <span className="text-slate-400"> executed </span>
                <span className="text-verity-pink font-semibold">{log.action}</span>
                <span className="text-slate-400"> on {log.entity_type} #{log.entity_id}</span>
                <p className="text-[11px] text-slate-400 mt-0.5">{log.reason || 'Standard review action'}</p>
              </div>
              <span className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
