import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './store/auth'
import { api } from './lib/api'

// Pages
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Activity from './pages/Activity'
import SessionDetail from './pages/SessionDetail'
import CreateSession from './pages/CreateSession'
import RecordMatch from './pages/RecordMatch'
import Leaderboards from './pages/Leaderboards'
import Profile from './pages/Profile'
import FindPlayers from './pages/FindPlayers'
import Rules from './pages/Rules'
import Admin from './pages/Admin'
import AuthPage from './pages/Auth'
import Challenges from './pages/Challenges'
import Calendar from './pages/Calendar'
import Forum from './pages/Forum'
import ForumPost from './pages/ForumPost'
import Inbox from './pages/Inbox'
import Conversation from './pages/Conversation'

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

  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => { api.me().catch(() => {}) }, 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

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
          <Route path="/activity" element={<Activity />} />
          <Route path="/sessions" element={<Navigate to="/activity" />} />
          <Route path="/matches" element={<Navigate to="/activity?tab=results" />} />
          <Route path="/sessions/new" element={user ? <CreateSession /> : <Navigate to="/auth" />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/matches/record" element={user ? <RecordMatch /> : <Navigate to="/auth" />} />
          <Route path="/challenges" element={user ? <Challenges /> : <Navigate to="/auth" />} />
          <Route path="/calendar" element={user ? <Calendar /> : <Navigate to="/auth" />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/players" element={<FindPlayers />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/forum/:id" element={<ForumPost />} />
          <Route path="/messages" element={user ? <Inbox /> : <Navigate to="/auth" />} />
          <Route path="/messages/:userId" element={user ? <Conversation /> : <Navigate to="/auth" />} />
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
