const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

function normalizeBackendOrigin(val) {
  if (!val) return '';
  const hasProto = /^https?:\/\//i.test(val);
  const proto = hasProto ? val.match(/^https?:\/\//i)[0] : 'https://';
  let hostPart = val.replace(/^https?:\/\//i, '').split('/')[0];
  // Render Blueprint fromService (property: host) injects slug without .onrender.com
  if (hostPart && !hostPart.includes('.') && !hostPart.startsWith('localhost')) {
    hostPart = `${hostPart}.onrender.com`;
  }
  return `${proto}${hostPart}`;
}

export const BACKEND_ORIGIN = normalizeBackendOrigin(rawApiUrl);
const API_BASE = `${BACKEND_ORIGIN}/api/v1`;

function resolveUploadsInData(value) {
  if (!BACKEND_ORIGIN || value == null) return value;
  if (typeof value === 'string') {
    return value.startsWith('/uploads/') ? `${BACKEND_ORIGIN}${value}` : value;
  }
  if (Array.isArray(value)) {
    return value.map(resolveUploadsInData);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveUploadsInData(v);
    }
    return out;
  }
  return value;
}

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('verity_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // If body is FormData, let browser set Content-Type
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 60000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Server took too long to respond. Please verify the backend server is running.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    // If unauthorized, clear token if expired
    if (!endpoint.includes('/auth/login')) {
      localStorage.removeItem('verity_token');
      localStorage.removeItem('verity_user');
      window.dispatchEvent(new Event('verity_auth_expired'));
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.detail || response.statusText || 'Request failed';
    throw new Error(errorMsg);
  }

  return resolveUploadsInData(data);
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  toggleKidsMode: (body = {}) => request('/auth/toggle-kids-mode', { method: 'POST', body: JSON.stringify(body) }),
  changePassword: (body) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  getSessions: () => request('/auth/sessions'),
  logoutCurrent: () => request('/auth/logout', { method: 'POST' }),
  logoutAll: () => request('/auth/logout-all', { method: 'POST' }),

  // Interests
  getInterests: () => request('/interests'),
  getMyInterests: () => request('/interests/my'),
  updateMyInterests: (interestIds) => request('/interests/my', { method: 'PUT', body: JSON.stringify({ interest_ids: interestIds }) }),

  // Focus Modes
  getFocusModes: () => request('/focus-modes'),
  createFocusMode: (body) => request('/focus-modes', { method: 'POST', body: JSON.stringify(body) }),
  toggleFocusMode: (id) => request(`/focus-modes/${id}/toggle`, { method: 'PUT' }),
  deleteFocusMode: (id) => request(`/focus-modes/${id}`, { method: 'DELETE' }),

  // Posts
  getFeed: (page = 1, limit = 20) => request(`/posts/feed?page=${page}&limit=${limit}`),
  getSavedPosts: () => request('/posts/saved'),
  createPost: (body) => request('/posts', { method: 'POST', body: JSON.stringify(body) }),
  toggleLikePost: (id) => request(`/posts/${id}/like`, { method: 'POST' }),
  toggleSavePost: (id) => request(`/posts/${id}/save`, { method: 'POST' }),
  hidePost: (id) => request(`/posts/${id}/hide`, { method: 'POST' }),
  getPostComments: (id) => request(`/posts/${id}/comments`),
  addPostComment: (id, text) => request(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  reportPost: (id, body) => request(`/posts/${id}/report`, { method: 'POST', body: JSON.stringify(body) }),

  // Reels
  getReels: (limit = 20) => request(`/reels/feed?limit=${limit}`),
  createReel: (body) => request('/reels', { method: 'POST', body: JSON.stringify(body) }),
  trackReelView: (id) => request(`/reels/${id}/view`, { method: 'POST' }),
  toggleLikeReel: (id) => request(`/reels/${id}/like`, { method: 'POST' }),
  toggleSaveReel: (id) => request(`/reels/${id}/save`, { method: 'POST' }),
  getReelComments: (id) => request(`/reels/${id}/comments`),
  addReelComment: (id, text) => request(`/reels/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  reportReel: (id, body) => request(`/reels/${id}/report`, { method: 'POST', body: JSON.stringify(body) }),

  // Stories
  getStories: () => request('/stories'),
  createStory: (body) => request('/stories', { method: 'POST', body: JSON.stringify(body) }),

  // Profiles & Users
  getProfile: (username) => request(`/users/${username}`),
  createHighlight: (body) => request('/users/me/highlights', { method: 'POST', body: JSON.stringify(body) }),
  deleteHighlight: (id) => request(`/users/me/highlights/${id}`, { method: 'DELETE' }),
  toggleFollowUser: (userId) => request(`/users/${userId}/follow`, { method: 'POST' }),
  toggleBlockUser: (userId) => request(`/users/${userId}/block`, { method: 'POST' }),
  getBlockedUsers: () => request('/users/me/blocked'),
  getSuggestedUsers: () => request('/users/suggested'),

  // Notifications
  getNotifications: () => request('/notifications'),
  getUnreadNotificationsCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),

  // Communities
  getCommunities: () => request('/communities'),
  createCommunity: (body) => request('/communities', { method: 'POST', body: JSON.stringify(body) }),
  joinCommunity: (id) => request(`/communities/${id}/join`, { method: 'POST' }),
  leaveCommunity: (id) => request(`/communities/${id}/leave`, { method: 'POST' }),
  getCommunityPosts: (slug) => request(`/communities/${slug}/posts`),

  // Collaborative Stitch Studio
  getStitchProjects: () => request('/stitch/projects'),
  createStitchProject: (body) => request('/stitch/projects', { method: 'POST', body: JSON.stringify(body) }),
  submitContribution: (projectId, body) => request(`/stitch/projects/${projectId}/contributions`, { method: 'POST', body: JSON.stringify(body) }),
  reviewContribution: (contribId, status, feedback = '') => request(`/stitch/contributions/${contribId}/status?status=${status}&feedback=${encodeURIComponent(feedback)}`, { method: 'PUT' }),
  renderStitchedVideo: (projectId) => request(`/stitch/projects/${projectId}/render`, { method: 'POST' }),
  publishStitchedVideo: (projectId, body = {}) => request(`/stitch/projects/${projectId}/publish`, { method: 'POST', body: JSON.stringify(body) }),

  // Moderation Dashboard
  getModerationSummary: () => request('/moderation/summary'),
  getFlaggedPosts: () => request('/moderation/flagged-posts'),
  getReports: (status = 'pending') => request(`/moderation/reports?status=${status}`),
  resolveReport: (id, action, notes = '') => request(`/moderation/reports/${id}/resolve?action=${action}&notes=${encodeURIComponent(notes)}`, { method: 'POST' }),
  takePostModerationAction: (postId, body) => request(`/moderation/posts/${postId}/action`, { method: 'POST', body: JSON.stringify(body) }),
  getBotSignals: () => request('/moderation/bots'),
  getBullyingSignals: () => request('/moderation/bullying'),
  getAuditLogs: () => request('/moderation/audit-logs'),
  submitAppeal: (body) => request('/moderation/appeals', { method: 'POST', body: JSON.stringify(body) }),
  getAppeals: () => request('/moderation/appeals'),
  resolveAppeal: (id, decision, notes = '') => request(`/moderation/appeals/${id}/resolve?decision=${decision}&notes=${encodeURIComponent(notes)}`, { method: 'POST' }),
  getFlaggedComments: () => request('/moderation/flagged-comments'),
  moderateComment: (id, action) => request(`/moderation/comments/${id}/action?action=${action}`, { method: 'POST' }),

  // Screen Time
  sendHeartbeat: (activeSeconds = 60, fastForwardMinutes = 0) => request('/screen-time/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ active_seconds: activeSeconds, fast_forward_minutes: fastForwardMinutes }),
  }),
  getScreenTimeStatus: () => request('/screen-time/status'),
  resetScreenTime: () => request('/screen-time/reset-demo', { method: 'POST' }),

  // Media Upload
  uploadMedia: async (file, category = 'posts') => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/upload/media?media_category=${category}`, {
      method: 'POST',
      body: formData,
    });
  },
};
