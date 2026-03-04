import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../api/client'

interface User {
  id: string
  email: string
  isAdmin: boolean
  profile?: {
    displayName: string
    skillLevel: number
    handedness: string
    bio?: string
    photoUrl?: string
    lookingToPlay: boolean
  }
  rating?: {
    elo: number
    matchesPlayed: number
    wins: number
    losses: number
  }
  enforcement?: {
    warningCount: number
    suspended: boolean
    cooldownUntil?: string
  }
}

interface Location {
  id: string
  name: string
  lighted: boolean
  courtCount: number
  address?: string
}

interface AppState {
  user: User | null
  token: string | null
  locations: Location[]
  pendingInvites: number
  isOnline: boolean
  afterDarkHour: number

  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setLocations: (locs: Location[]) => void
  setPendingInvites: (count: number) => void
  setOnline: (online: boolean) => void
  setAfterDarkHour: (hour: number) => void
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  loadMe: () => Promise<void>
  loadLocations: () => Promise<void>
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      locations: [],
      pendingInvites: 0,
      isOnline: navigator.onLine,
      afterDarkHour: 20,

      setUser: (user) => set({ user }),
      setToken: (token) => {
        if (token) localStorage.setItem('ut_token', token)
        else localStorage.removeItem('ut_token')
        set({ token })
      },
      setLocations: (locations) => set({ locations }),
      setPendingInvites: (pendingInvites) => set({ pendingInvites }),
      setOnline: (isOnline) => set({ isOnline }),
      setAfterDarkHour: (afterDarkHour) => set({ afterDarkHour }),

      login: async (email, password) => {
        const res = await api.login({ email, password })
        get().setToken(res.token)
        set({ user: res.user })
      },

      register: async (data) => {
        const res = await api.register(data)
        get().setToken(res.token)
        set({ user: res.user })
      },

      logout: () => {
        localStorage.removeItem('ut_token')
        set({ user: null, token: null })
      },

      loadMe: async () => {
        try {
          const res = await api.me()
          set({ user: res })
        } catch {
          get().logout()
        }
      },

      loadLocations: async () => {
        try {
          const locs = await api.getLocations()
          set({ locations: locs })
          localStorage.setItem('ut_locations', JSON.stringify(locs))
        } catch {
          const cached = localStorage.getItem('ut_locations')
          if (cached) set({ locations: JSON.parse(cached) })
        }
      },
    }),
    {
      name: 'ut-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        afterDarkHour: state.afterDarkHour,
      }),
    },
  ),
)
