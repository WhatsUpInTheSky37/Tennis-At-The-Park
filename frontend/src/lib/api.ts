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
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
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
  respondToInvite: (inviteId: string, status: string) => request<any>(`/sessions/invites/${inviteId}/respond`, { method: 'POST', body: JSON.stringify({ status }) }),
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

  // Leaderboards
  getLeaderboards: () => request<any>('/leaderboards'),
  getStats: (userId: string) => request<any>(`/leaderboards/stats/${userId}`),

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

  // Articles
  getArticles: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ articles: any[]; total: number }>(`/articles${q}`)
  },
  getLatestArticles: () => request<any[]>('/articles/latest'),
  getArticleBySlug: (slug: string) => request<any>(`/articles/by-slug/${slug}`),
  adminGetAllArticles: () => request<any[]>('/articles/admin/all'),
  adminGetArticle: (id: string) => request<any>(`/articles/admin/${id}`),
  adminCreateArticle: (data: any) => request<any>('/articles', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateArticle: (id: string, data: any) => request<any>(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminToggleArticlePublish: (id: string) => request<any>(`/articles/${id}/publish`, { method: 'POST', body: JSON.stringify({}) }),
  adminDeleteArticle: (id: string) => request<any>(`/articles/${id}`, { method: 'DELETE' }),

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
  adminResolveDispute: (id: string, status: string) => request<any>(`/admin/disputes/${id}/resolve`, { method: 'POST', body: JSON.stringify({ status }) }),
  adminGetUsers: (search?: string) => {
    const q = search ? '?search=' + encodeURIComponent(search) : ''
    return request<any[]>(`/admin/users${q}`)
  },
  adminGetUser: (id: string) => request<any>(`/admin/users/${id}`),
  adminToggleAdmin: (id: string) => request<any>(`/admin/users/${id}/toggle-admin`, { method: 'POST', body: JSON.stringify({}) }),
  adminDeleteUser: (id: string) => request<any>(`/admin/users/${id}`, { method: 'DELETE' }),

  // Generic HTTP methods for direct path access
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, data?: any) => request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T = any>(path: string, data?: any) => request<T>(path, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T = any>(path: string) => request<T>(path, { method: 'DELETE' }),
}
