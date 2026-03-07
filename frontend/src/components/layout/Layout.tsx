import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

const navItems = [
  { to: '/dashboard', icon: HomeIcon, label: 'Home' },
  { to: '/find', icon: SearchIcon, label: 'Find' },
  { to: '/plan', icon: CalendarIcon, label: 'Plan' },
  { to: '/record', icon: RecordIcon, label: 'Record' },
  { to: '/leaderboard', icon: TrophyIcon, label: 'Rank' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <>
      <nav className="top-nav">
        <NavLink to="/dashboard" className="logo" style={{ textDecoration: 'none' }}>
          <span className="ball">🎾</span>
          <span>ULTIMATE TENNIS</span>
        </NavLink>
        <div className="nav-links desktop-only">
          {navItems.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {label}
            </NavLink>
          ))}
          <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            {user?.profile?.displayName || 'Profile'}
          </NavLink>
          {user?.isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Admin
            </NavLink>
          )}
          <button className="btn btn-sm btn-ghost" onClick={() => { logout(); navigate('/'); }}
            style={{ color: 'rgba(255,255,255,0.7)' }}>
            Sign out
          </button>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <nav className="bottom-nav mobile-only">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Icon />
            {label}
          </NavLink>
        ))}
        <NavLink to="/profile" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <UserIcon />
          Profile
        </NavLink>
      </nav>
    </>
  );
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
}
function CalendarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
}
function RecordIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9 12h6M12 9v6"/></svg>;
}
function TrophyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>;
}
function UserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}

export function PageContainer({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="container" style={style}>{children}</div>;
}

export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: boolean }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--court-mid, #2d5a27) 0%, var(--court-light, #3a7a32) 100%)',
      padding: '24px 16px',
    }}>
      <PageContainer>
        {back && <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.7 }}>← Back</div>}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 6vw, 44px)', letterSpacing: '0.04em', lineHeight: 1 }}>
          {title}
        </h1>
        {subtitle && <p style={{ color: 'var(--text-dim, rgba(255,255,255,0.7))', fontSize: 15, marginTop: 8 }}>{subtitle}</p>}
      </PageContainer>
    </div>
  );
}

export function PublicCourtDisclaimer() {
  return (
    <div style={{
      background: 'var(--surface-2, #1a1a2e)',
      border: '1px solid var(--court-line, #4a4a6a)',
      borderRadius: 'var(--radius, 8px)',
      padding: '12px 16px',
      fontSize: 14,
      color: 'var(--text-dim, #aaa)',
    }}>
      <strong>Public Courts Disclaimer:</strong> These are public courts — we do not reserve or control court access. Arrive early and follow posted rotation rules.
    </div>
  );
}
