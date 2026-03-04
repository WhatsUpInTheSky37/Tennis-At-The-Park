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
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
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

  // Admin
  adminGetReports: () => request<any[]>('/admin/reports'),
  adminResolveReport: (id: string, status: string) => request<any>(`/admin/reports/${id}/resolve`, { method: 'POST', body: JSON.stringify({ status }) }),
  adminWarnUser: (id: string, notes: string) => request<any>(`/admin/users/${id}/warn`, { method: 'POST', body: JSON.stringify({ notes }) }),
  adminSuspendUser: (id: string, suspended: boolean) => request<any>(`/admin/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ suspended }) }),
  adminGetDisputes: () => request<any[]>('/admin/disputes'),
  adminResolveDispute: (id: string, status: string) => request<any>(`/admin/disputes/${id}/resolve`, { method: 'POST', body: JSON.stringify({ status }) }),
}
