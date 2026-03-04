import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './store/auth'

// Pages
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Sessions from './pages/Sessions'
import SessionDetail from './pages/SessionDetail'
import CreateSession from './pages/CreateSession'
import Matches from './pages/Matches'
import RecordMatch from './pages/RecordMatch'
import Leaderboards from './pages/Leaderboards'
import Profile from './pages/Profile'
import FindPlayers from './pages/FindPlayers'
import Rules from './pages/Rules'
import Admin from './pages/Admin'
import AuthPage from './pages/Auth'

// Components
import TopNav from './components/TopNav'
import BottomNav from './components/BottomNav'
import OfflineBanner from './components/OfflineBanner'

function AppShell() {
  const { user, initialized, refresh } = useAuth()
  const location = useLocation()
  const isLanding = location.pathname === '/'
  const isAuth = location.pathname === '/auth'

  useEffect(() => { refresh() }, [])

  if (!initialized) {
    return (
      <div className="loading-screen" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span>Loading...</span>
      </div>
    )
  }

  if (isLanding || isAuth) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    )
  }

  return (
    <div className="app-shell">
      <OfflineBanner />
      <TopNav />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/sessions/new" element={user ? <CreateSession /> : <Navigate to="/auth" />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/record" element={user ? <RecordMatch /> : <Navigate to="/auth" />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/players" element={<FindPlayers />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/admin" element={user?.isAdmin ? <Admin /> : <Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
