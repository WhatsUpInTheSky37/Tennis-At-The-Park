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
import ChallengeEvents from './pages/ChallengeEvents'
import ChallengeEventDetail from './pages/ChallengeEventDetail'
import ChallengeEventTV from './pages/ChallengeEventTV'
import Calendar from './pages/Calendar'
import Forum from './pages/Forum'
import ForumPost from './pages/ForumPost'
import Inbox from './pages/Inbox'
import Conversation from './pages/Conversation'
import Notifications from './pages/Notifications'
import Articles from './pages/Articles'
import ArticleDetail from './pages/ArticleDetail'
import AdminArticles from './pages/AdminArticles'
import AdminArticleEdit from './pages/AdminArticleEdit'

// Components
import TopNav from './components/TopNav'
import BottomNav from './components/BottomNav'
import MobileHeader from './components/MobileHeader'
import OfflineBanner from './components/OfflineBanner'

function AppShell() {
  const { user, initialized, refresh } = useAuth()
  const location = useLocation()
  const isLanding = location.pathname === '/'
  const isAuth = location.pathname === '/auth'
  const isTv = /^\/challenge-events\/[^/]+\/tv$/.test(location.pathname)

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => { api.me().catch(() => {}) }, 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  // Full-screen TV scoreboard — rendered standalone (no nav/shell, no auth required).
  if (isTv) {
    return (
      <Routes>
        <Route path="/challenge-events/:id/tv" element={<ChallengeEventTV />} />
      </Routes>
    )
  }

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
      <MobileHeader />
      <TopNav />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
          <Route path="/activity" element={user ? <Activity /> : <Navigate to="/auth" />} />
          <Route path="/sessions" element={<Navigate to="/activity" />} />
          <Route path="/matches" element={<Navigate to="/activity?tab=results" />} />
          <Route path="/sessions/new" element={user ? <CreateSession /> : <Navigate to="/auth" />} />
          <Route path="/sessions/:id" element={user ? <SessionDetail /> : <Navigate to="/auth" />} />
          <Route path="/matches/record" element={user ? <RecordMatch /> : <Navigate to="/auth" />} />
          <Route path="/challenges" element={user ? <Challenges /> : <Navigate to="/auth" />} />
          <Route path="/challenge-events" element={user ? <ChallengeEvents /> : <Navigate to="/auth" />} />
          <Route path="/challenge-events/:id" element={user ? <ChallengeEventDetail /> : <Navigate to="/auth" />} />
          <Route path="/calendar" element={user ? <Calendar /> : <Navigate to="/auth" />} />
          <Route path="/leaderboards" element={user ? <Leaderboards /> : <Navigate to="/auth" />} />
          <Route path="/players" element={user ? <FindPlayers /> : <Navigate to="/auth" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
          <Route path="/profile/:userId" element={user ? <Profile /> : <Navigate to="/auth" />} />
          <Route path="/forum" element={user ? <Forum /> : <Navigate to="/auth" />} />
          <Route path="/forum/:id" element={user ? <ForumPost /> : <Navigate to="/auth" />} />
          <Route path="/messages" element={user ? <Inbox /> : <Navigate to="/auth" />} />
          <Route path="/messages/:userId" element={user ? <Conversation /> : <Navigate to="/auth" />} />
          <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/auth" />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:slug" element={<ArticleDetail />} />
          <Route path="/admin/articles" element={user?.isAdmin ? <AdminArticles /> : <Navigate to="/dashboard" />} />
          <Route path="/admin/articles/new" element={user?.isAdmin ? <AdminArticleEdit /> : <Navigate to="/dashboard" />} />
          <Route path="/admin/articles/:id/edit" element={user?.isAdmin ? <AdminArticleEdit /> : <Navigate to="/dashboard" />} />
          <Route path="/rules" element={user ? <Rules /> : <Navigate to="/auth" />} />
          <Route path="/admin" element={user?.isAdmin ? <Admin /> : <Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/auth"} />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <img src="/tennis-at-the-park.png" alt="Tennis at the Park" style={{ width: '55%', maxWidth: 320, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }} />
        <div>Tennis at the Park created by Will Farrar</div>
        <div style={{ marginTop: 6, fontSize: '0.75rem' }}>
          Copyright 2026 · Will Farrar · Find me at{' '}
          <a href="https://www.willfarrar.net" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>www.willfarrar.net</a>
        </div>
        <p style={{ marginTop: 12, fontSize: '0.7rem', lineHeight: 1.5, maxWidth: 640, color: 'var(--text3)' }}>
          <strong>Disclaimer:</strong> Tennis at the Park is an independent community group and is
          not affiliated with, endorsed by, sponsored by, or otherwise associated with the City of
          Salisbury, Wicomico County, their respective Departments of Parks and Recreation, or any
          other governmental entity. All play takes place on public tennis courts on a first-come,
          first-served basis in accordance with the posted rules and policies of the applicable park.
          This platform is provided solely to help players coordinate informal meetups and does not
          reserve, control, manage, or guarantee access to any court or facility.
        </p>
      </footer>
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
