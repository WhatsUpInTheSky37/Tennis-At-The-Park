const BASE = import.meta.env.VITE_API_URL || '/api'

let token: string | null = localStorage.getItem('ut_token')

export function setToken(t: string | null) {
  token = t
  if (t) localStorage.setItem('ut_token', t)
  else localStorage.removeItem('ut_token')
}

export function getToken() { return token }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  }
  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  
  if (res.status === 204) return undefined as T
  const data = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(data))
  return data
}

// Build a human-readable message from an error response. The backend may send
// a string (`{ error: 'message' }`) or a Zod `flatten()` object
// (`{ error: { formErrors, fieldErrors } }`); the latter must not be rendered
// as "[object Object]".
function extractErrorMessage(data: any): string {
  const err = data?.error
  if (typeof err === 'string' && err) return err
  if (err && typeof err === 'object') {
    const form: string[] = Array.isArray(err.formErrors) ? err.formErrors : []
    const fields: string[] = err.fieldErrors && typeof err.fieldErrors === 'object'
      ? Object.entries(err.fieldErrors).flatMap(([field, msgs]) =>
          (Array.isArray(msgs) ? msgs : []).map(m => `${field}: ${m}`))
      : []
    const msg = [...form, ...fields].join('; ')
    if (msg) return msg
  }
  return data?.message || 'Request failed'
}

export const api = {
  // Auth
  register: (email: string, password: string, displayName: string) =>
    request<any>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) }),
  login: (email: string, password: string) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<any>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<any>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  resetPassword: (email: string, newPassword: string) =>
    request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, newPassword }) }),

  // Profiles
  getMyProfile: () => request<any>('/profiles/me'),
  updateMyProfile: (data: any) => request<any>('/profiles/me', { method: 'PUT', body: JSON.stringify(data) }),
  getProfile: (userId: string) => request<any>(`/profiles/${userId}`),
  getNotificationPrefs: () => request<any>('/profiles/me/notifications'),
  updateNotificationPrefs: (data: Partial<{ emailNotifications: boolean }>) =>
    request<any>('/profiles/me/notifications', { method: 'PUT', body: JSON.stringify(data) }),

  // Locations
  getLocations: () => request<any[]>('/locations'),

  // Players
  getPlayers: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/players${q}`)
  },

  // Sessions
  getSessions: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/sessions${q}`)
  },
  getSession: (id: string) => request<any>(`/sessions/${id}`),
  createSession: (data: any) => request<any>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (id: string, data: any) => request<any>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelSession: (id: string) => request<any>(`/sessions/${id}`, { method: 'DELETE' }),
  joinSession: (id: string) => request<any>(`/sessions/${id}/join`, { method: 'POST', body: JSON.stringify({}) }),
  leaveSession: (id: string) => request<any>(`/sessions/${id}/leave`, { method: 'POST', body: JSON.stringify({}) }),
  inviteToSession: (id: string, toUser: string) => request<any>(`/sessions/${id}/invite`, { method: 'POST', body: JSON.stringify({ toUser }) }),
  respondToInvite: (inviteId: string, status: 'accepted' | 'declined') => request<any>(`/sessions/invites/${inviteId}/respond`, { method: 'POST', body: JSON.stringify({ status }) }),
  cancelInvite: (inviteId: string) => request<any>(`/sessions/invites/${inviteId}`, { method: 'DELETE' }),
  getMyPendingInvites: () => request<any[]>('/sessions/my-invites'),
  getMessages: (sessionId: string) => request<any[]>(`/sessions/${sessionId}/messages`),
  sendMessage: (sessionId: string, body: string) => request<any>(`/sessions/${sessionId}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),

  // Matches
  getMatches: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/matches${q}`)
  },
  getMatch: (id: string) => request<any>(`/matches/${id}`),
  createMatch: (data: any) => request<any>('/matches', { method: 'POST', body: JSON.stringify(data) }),
  confirmMatch: (id: string) => request<any>(`/matches/${id}/confirm`, { method: 'POST', body: JSON.stringify({}) }),
  disputeMatch: (id: string, reason: string, details: string) => request<any>(`/matches/${id}/dispute`, { method: 'POST', body: JSON.stringify({ reason, details }) }),
  deleteMatch: (id: string) => request<void>(`/matches/${id}`, { method: 'DELETE' }),
  editMatch: (id: string, data: { notes?: string; playedAt?: string; locationId?: string; scoreJson?: number[][]; winner?: 'team1' | 'team2' }) =>
    request<any>(`/matches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Leaderboards
  getLeaderboards: () => request<any>('/leaderboards'),
  getStats: (userId: string) => request<any>(`/leaderboards/stats/${userId}`),
  getEventPointsLeaderboard: (limit?: number) =>
    request<{ userId: string; displayName: string; photoUrl: string | null; eventPoints: number }[]>(
      `/leaderboards/event-points${limit ? `?limit=${limit}` : ''}`),

  // Reports
  createReport: (data: any) => request<any>('/reports', { method: 'POST', body: JSON.stringify(data) }),

  // Challenges
  getChallenges: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/challenges${q}`)
  },
  getChallenge: (id: string) => request<any>(`/challenges/${id}`),
  createChallenge: (data: any) => request<any>('/challenges', { method: 'POST', body: JSON.stringify(data) }),
  acceptChallenge: (id: string) => request<any>(`/challenges/${id}/accept`, { method: 'POST', body: JSON.stringify({}) }),
  declineChallenge: (id: string, reason?: string) => request<any>(`/challenges/${id}/decline`, { method: 'POST', body: JSON.stringify({ reason }) }),
  cancelChallenge: (id: string) => request<any>(`/challenges/${id}/cancel`, { method: 'POST', body: JSON.stringify({}) }),
  getPendingChallengeCount: () => request<{ count: number }>('/challenges/pending-count'),
  getCalendarEvents: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any>(`/challenges/calendar/events${q}`)
  },

  // Challenge Events (Saturday Summer Challenge)
  getChallengeEvents: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/challenge-events${q}`)
  },
  getChallengeEvent: (id: string) => request<any>(`/challenge-events/${id}`),
  getChallengeWins: (userId: string) => request<any[]>(`/challenge-events/wins/${userId}`),
  createChallengeEvent: (data: any) => request<any>('/challenge-events', { method: 'POST', body: JSON.stringify(data) }),
  updateChallengeEvent: (id: string, data: any) => request<any>(`/challenge-events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  joinChallengeEvent: (id: string) => request<any>(`/challenge-events/${id}/join`, { method: 'POST', body: JSON.stringify({}) }),
  leaveChallengeEvent: (id: string) => request<any>(`/challenge-events/${id}/leave`, { method: 'POST', body: JSON.stringify({}) }),
  addChallengeEventPlayer: (id: string, userId: string) => request<any>(`/challenge-events/${id}/participants`, { method: 'POST', body: JSON.stringify({ userId }) }),
  removeChallengeEventPlayer: (id: string, userId: string) => request<any>(`/challenge-events/${id}/participants/${userId}`, { method: 'DELETE' }),
  setChallengePair: (id: string, userIdA: string, userIdB: string) =>
    request<any>(`/challenge-events/${id}/pairs`, { method: 'POST', body: JSON.stringify({ userIdA, userIdB }) }),
  clearChallengePair: (id: string, userId: string) =>
    request<any>(`/challenge-events/${id}/pairs/${userId}`, { method: 'DELETE' }),
  startChallengeEvent: (id: string) => request<any>(`/challenge-events/${id}/start`, { method: 'POST', body: JSON.stringify({}) }),
  scoreChallengeGame: (id: string, court: number, scoreA: number, scoreB: number, sets?: { a: number; b: number }[]) =>
    request<any>(`/challenge-events/${id}/games/score`, {
      method: 'POST',
      body: JSON.stringify(sets && sets.length ? { court, sets } : { court, scoreA, scoreB })
    }),
  nextChallengeRound: (id: string, force?: boolean) => request<any>(`/challenge-events/${id}/next-round`, { method: 'POST', body: JSON.stringify({ force: !!force }) }),
  completeChallengeEvent: (id: string) => request<any>(`/challenge-events/${id}/complete`, { method: 'POST', body: JSON.stringify({}) }),
  deleteChallengeEvent: (id: string) => request<void>(`/challenge-events/${id}`, { method: 'DELETE' }),

  // Forum
  getForumCategories: () => request<any[]>('/forum/categories'),
  getForumPosts: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ posts: any[]; total: number }>(`/forum${q}`)
  },
  getRecentForumPosts: () => request<any[]>('/forum/recent'),
  getForumPost: (id: string) => request<any>(`/forum/${id}`),
  createForumPost: (data: { subject: string; body: string; categoryId?: string | null }) =>
    request<any>('/forum', { method: 'POST', body: JSON.stringify(data) }),
  createForumReply: (postId: string, body: string) =>
    request<any>(`/forum/${postId}/replies`, { method: 'POST', body: JSON.stringify({ body }) }),
  editForumPost: (id: string, data: { subject: string; body: string; categoryId?: string | null }) =>
    request<any>(`/forum/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteForumPost: (id: string) =>
    request<any>(`/forum/${id}`, { method: 'DELETE' }),
  editForumReply: (replyId: string, body: string) =>
    request<any>(`/forum/replies/${replyId}`, { method: 'PUT', body: JSON.stringify({ body }) }),
  deleteForumReply: (replyId: string) =>
    request<any>(`/forum/replies/${replyId}`, { method: 'DELETE' }),
  pinForumPost: (id: string) =>
    request<any>(`/forum/${id}/pin`, { method: 'POST', body: JSON.stringify({}) }),
  reactToForumPost: (id: string, emoji: string) =>
    request<any>(`/forum/${id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }),
  reactToForumReply: (replyId: string, emoji: string) =>
    request<any>(`/forum/replies/${replyId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }),
  reportForumPost: (id: string, category: string, details: string) =>
    request<any>(`/forum/${id}/report`, { method: 'POST', body: JSON.stringify({ category, details }) }),
  reportForumReply: (replyId: string, category: string, details: string) =>
    request<any>(`/forum/replies/${replyId}/report`, { method: 'POST', body: JSON.stringify({ category, details }) }),

  // Uploads
  // Event photo gallery
  getEventGallery: () => request<{ id: string; name: string; date: string; format: string; location: { name: string } | null; cover: string | null; photoCount: number }[]>('/challenge-events/gallery'),
  getEventPhotos: (eventId: string) => request<any[]>(`/challenge-events/${eventId}/photos`),
  uploadEventPhoto: async (eventId: string, blob: Blob, filename: string, width?: number, height?: number): Promise<{ id: string; url: string }> => {
    const fd = new FormData()
    fd.append('file', blob, filename)
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const qs = new URLSearchParams()
    if (width) qs.set('w', String(width))
    if (height) qs.set('h', String(height))
    const res = await fetch(`${BASE}/challenge-events/${eventId}/photos${qs.toString() ? `?${qs}` : ''}`, { method: 'POST', headers, body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    return data
  },
  updateEventPhotoCaption: (eventId: string, photoId: string, caption: string) =>
    request<{ ok: boolean; caption: string | null }>(`/challenge-events/${eventId}/photos/${photoId}`, { method: 'PATCH', body: JSON.stringify({ caption }) }),
  deleteEventPhoto: (eventId: string, photoId: string) => request<{ ok: boolean }>(`/challenge-events/${eventId}/photos/${photoId}`, { method: 'DELETE' }),

  uploadArticleImage: async (file: File): Promise<{ url: string; filename: string }> => {
    const fd = new FormData()
    fd.append('file', file)
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE}/uploads/articles/image`, { method: 'POST', headers, body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    return data
  },

  // Articles
  getArticles: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ articles: any[]; total: number }>(`/articles${q}`)
  },
  getLatestArticles: () => request<any[]>('/articles/latest'),
  getArticleBySlug: (slug: string) => request<any>(`/articles/by-slug/${slug}`),
  incrementArticleView: (id: string) => request<{ viewCount: number }>(`/articles/${id}/view`, { method: 'POST', body: JSON.stringify({}) }),
  toggleArticleLike: (id: string) => request<{ liked: boolean; count: number }>(`/articles/${id}/like`, { method: 'POST', body: JSON.stringify({}) }),
  adminGetAllArticles: () => request<any[]>('/articles/admin/all'),
  adminGetArticle: (id: string) => request<any>(`/articles/admin/${id}`),
  adminCreateArticle: (data: any) => request<any>('/articles', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateArticle: (id: string, data: any) => request<any>(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminToggleArticlePublish: (id: string) => request<any>(`/articles/${id}/publish`, { method: 'POST', body: JSON.stringify({}) }),
  adminDeleteArticle: (id: string) => request<any>(`/articles/${id}`, { method: 'DELETE' }),

  // Article Comments
  getArticleComments: (articleId: string) => request<any[]>(`/articles/${articleId}/comments`),
  createArticleComment: (articleId: string, body: string, parentId?: string | null) =>
    request<any>(`/articles/${articleId}/comments`, { method: 'POST', body: JSON.stringify({ body, parentId: parentId || null }) }),
  editArticleComment: (commentId: string, body: string) =>
    request<any>(`/articles/comments/${commentId}`, { method: 'PUT', body: JSON.stringify({ body }) }),
  deleteArticleComment: (commentId: string) =>
    request<any>(`/articles/comments/${commentId}`, { method: 'DELETE' }),
  adminToggleHideArticleComment: (commentId: string) =>
    request<any>(`/articles/comments/${commentId}/hide`, { method: 'POST', body: JSON.stringify({}) }),
  reportArticleComment: (commentId: string, category: string, details: string) =>
    request<any>(`/articles/comments/${commentId}/report`, { method: 'POST', body: JSON.stringify({ category, details }) }),

  // Notifications
  getNotifications: () => request<any[]>('/notifications'),
  getUnreadNotificationCount: () => request<{ count: number }>('/notifications/unread-count'),
  markNotificationRead: (id: string) =>
    request<any>(`/notifications/${id}/read`, { method: 'POST', body: JSON.stringify({}) }),
  markAllNotificationsRead: () =>
    request<any>('/notifications/read-all', { method: 'POST', body: JSON.stringify({}) }),

  // Direct Messages
  getInbox: (page?: number) => request<{ messages: any[]; total: number; unreadCount: number }>(`/dm/inbox?page=${page || 1}`),
  getSentMessages: (page?: number) => request<{ messages: any[]; total: number }>(`/dm/sent?page=${page || 1}`),
  getConversation: (otherUserId: string) => request<any[]>(`/dm/conversation/${otherUserId}`),
  sendDm: (toId: string, subject: string, body: string) =>
    request<any>('/dm', { method: 'POST', body: JSON.stringify({ toId, subject, body }) }),
  markDmRead: (id: string) => request<any>(`/dm/${id}/read`, { method: 'POST', body: JSON.stringify({}) }),
  deleteDm: (id: string) => request<any>(`/dm/${id}`, { method: 'DELETE' }),
  getUnreadDmCount: () => request<{ count: number }>('/dm/unread-count'),

  // Admin
  adminGetReports: () => request<any[]>('/admin/reports'),
  adminResolveReport: (id: string, status: string) => request<any>(`/admin/reports/${id}/resolve`, { method: 'POST', body: JSON.stringify({ status }) }),
  adminWarnUser: (id: string, notes: string) => request<any>(`/admin/users/${id}/warn`, { method: 'POST', body: JSON.stringify({ notes }) }),
  adminSuspendUser: (id: string, suspended: boolean) => request<any>(`/admin/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ suspended }) }),
  adminGetDisputes: () => request<any[]>('/admin/disputes'),
  adminResetStats: (deleteMatches: boolean, deleteEvents: boolean) =>
    request<{ ok: boolean; ratingsReset: number; matchesDeleted: number; eventsDeleted: number }>('/admin/reset-stats', { method: 'POST', body: JSON.stringify({ deleteMatches, deleteEvents }) }),
  adminResolveDispute: (id: string, status: string) => request<any>(`/admin/disputes/${id}/resolve`, { method: 'POST', body: JSON.stringify({ status }) }),
  adminGetUsers: (search?: string) => {
    const q = search ? '?search=' + encodeURIComponent(search) : ''
    return request<any[]>(`/admin/users${q}`)
  },
  adminGetUser: (id: string) => request<any>(`/admin/users/${id}`),
  adminCreateUser: (email: string, displayName: string) =>
    request<{ id: string; email: string; displayName: string }>('/admin/users', { method: 'POST', body: JSON.stringify({ email, displayName }) }),
  adminBulkCreateUsers: (users: { email: string; displayName: string }[]) =>
    request<{ invited: number; skipped: number; failed: number; results: { email: string; displayName: string; status: 'invited' | 'skipped' | 'error'; error?: string }[] }>(
      '/admin/users/bulk', { method: 'POST', body: JSON.stringify({ users }) }),
  adminToggleAdmin: (id: string) => request<any>(`/admin/users/${id}/toggle-admin`, { method: 'POST', body: JSON.stringify({}) }),
  adminDeleteUser: (id: string) => request<any>(`/admin/users/${id}`, { method: 'DELETE' }),
  adminSendMessage: (data: {
    recipientType: 'all' | 'user'; userId?: string; subject: string; message: string;
    sendEmail: boolean; createNotification: boolean; respectOptOut: boolean;
  }) => request<{ ok: boolean; recipients: number; emailsSent: number; emailsSkipped: number; notificationsCreated: number }>(
    '/admin/send-message', { method: 'POST', body: JSON.stringify(data) }),
  adminResendWelcome: (id: string) => request<{ ok: boolean }>(`/admin/users/${id}/resend-welcome`, { method: 'POST', body: JSON.stringify({}) }),

  // Generic HTTP methods for direct path access
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, data?: any) => request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T = any>(path: string, data?: any) => request<T>(path, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T = any>(path: string) => request<T>(path, { method: 'DELETE' }),
}
