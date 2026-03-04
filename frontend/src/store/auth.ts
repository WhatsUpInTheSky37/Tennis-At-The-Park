import { create } from 'zustand'
import { api, setToken, getToken } from '../lib/api'

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
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const res = await api.login(email, password)
      setToken(res.token)
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
      setToken(res.token)
      const me = await api.me()
      set({ user: { ...me, displayName: me.profile?.displayName }, loading: false })
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },

  logout: () => {
    setToken(null)
    set({ user: null })
  },

  refresh: async () => {
    if (!getToken()) { set({ initialized: true }); return }
    try {
      const me = await api.me()
      set({ user: { ...me, displayName: me.profile?.displayName }, initialized: true })
    } catch {
      setToken(null)
      set({ user: null, initialized: true })
    }
  }
}))
