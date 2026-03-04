const BASE = import.meta.env.VITE_API_URL || '/api'

function getToken(): string | null {
  return localStorage.getItem('ut_token')
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw { status: res.status, ...err }
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  // Auth
  register: (data: any) => request<any>('POST', '/auth/register', data, false),
  login: (data: any) => request<any>('POST', '/auth/login', data, false),
  me: () => request<any>('GET', '/auth/me'),

  // Profiles
  getMyProfile: () => request<any>('GET', '/profiles/me'),
  updateProfile: (data: any) => request<any>('PUT', '/profiles/me', data),
  getProfile: (userId: string) => request<any>('GET', `/profiles/${userId}`),

  // Locations
  getLocations: () => request<any[]>('GET', '/locations', undefined, false),

  // Players
  getPlayers: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>('GET', `/players${q}`)
  },

  // Sessions
  getSessions: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>('GET', `/sessions${q}`, undefined, false)
  },
  getSession: (id: string) => request<any>('GET', `/sessions/${id}`),
  createSession: (data: any) => request<any>('POST', '/sessions', data),
  updateSession: (id: string, data: any) => request<any>('PUT', `/sessions/${id}`, data),
  cancelSession: (id: string) => request<any>('DELETE', `/sessions/${id}`),
  joinSession: (id: string) => request<any>('POST', `/sessions/${id}/join`),
  inviteToSession: (id: string, toUserId: string) =>
    request<any>('POST', `/sessions/${id}/invite`, { toUserId }),
  getMessages: (sessionId: string) => request<any[]>('GET', `/sessions/${sessionId}/messages`),
  sendMessage: (sessionId: string, body: string) =>
    request<any>('POST', `/sessions/${sessionId}/messages`, { body }),

  // Invites
  getInvites: () => request<any[]>('GET', '/invites'),
  respondInvite: (id: string, accept: boolean) =>
    request<any>('POST', `/invites/${id}/respond`, { accept }),

  // Matches
  getMatches: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>('GET', `/matches${q}`)
  },
  getMatch: (id: string) => request<any>('GET', `/matches/${id}`),
  createMatch: (data: any) => request<any>('POST', '/matches', data),
  confirmMatch: (id: string) => request<any>('POST', `/matches/${id}/confirm`),
  disputeMatch: (id: string, data: any) => request<any>('POST', `/matches/${id}/dispute`, data),

  // Leaderboards
  getLeaderboards: () => request<any>('GET', '/leaderboards', undefined, false),

  // Reports
  createReport: (data: any) => request<any>('POST', '/reports', data),

  // Admin
  getAdminReports: () => request<any[]>('GET', '/admin/reports'),
  warnUser: (id: string, notes?: string) => request<any>('POST', `/admin/users/${id}/warn`, { notes }),
  suspendUser: (id: string, data?: any) => request<any>('POST', `/admin/users/${id}/suspend`, data),
  resolveDispute: (id: string, data: any) => request<any>('POST', `/admin/disputes/${id}/resolve`, data),
  getAdminUsers: () => request<any[]>('GET', '/admin/users'),
}
