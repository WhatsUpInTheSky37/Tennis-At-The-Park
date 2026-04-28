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
