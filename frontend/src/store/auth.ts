import { create } from 'zustand'
import { api, setToken as setApiToken, getToken } from '../lib/api'

interface User {
  id: string
  email: string
  isAdmin: boolean
  displayName?: string
  profile?: any
  rating?: any
  enforcement?: any
}

interface AuthStore {
  user: User | null
  loading: boolean
  initialized: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  setToken: (token: string) => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  setToken: (token: string) => {
    setApiToken(token)
  },

  fetchMe: async () => {
    try {
      const me = await api.me()
      set({ user: { ...me, displayName: me.profile?.displayName }, initialized: true })
    } catch {
      setApiToken(null)
      set({ user: null, initialized: true })
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const res = await api.login(email, password)
      setApiToken(res.token)
      const me = await api.me()
      set({ user: { ...me, displayName: me.profile?.displayName }, loading: false })
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },

  register: async (email, password, displayName) => {
    set({ loading: true })
    try {
      const res = await api.register(email, password, displayName)
      setApiToken(res.token)
      const me = await api.me()
      set({ user: { ...me, displayName: me.profile?.displayName }, loading: false })
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },

  logout: () => {
    setApiToken(null)
    set({ user: null })
  },

  refresh: async () => {
    if (!getToken()) { set({ initialized: true }); return }
    try {
      const me = await api.me()
      set({ user: { ...me, displayName: me.profile?.displayName }, initialized: true })
    } catch {
      setApiToken(null)
      set({ user: null, initialized: true })
    }
  }
}))

// Alias for backward compatibility
export const useAuth = useAuthStore
