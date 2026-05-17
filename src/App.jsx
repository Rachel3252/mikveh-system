import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ToastProvider';
import { RoomScreen } from './components/RoomScreen';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { LanguageSwitcher } from './components/LanguageSwitcher';

function RequireAuth({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function PageHeader() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const showNav = location.pathname !== '/login';

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{t('app.subtitle')}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t('app.title')}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <LanguageSwitcher />
        {showNav && user && (
          <div className="flex flex-wrap items-center gap-3">
            <Link className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500" to="/dashboard">
              {t('nav.dashboard')}
            </Link>
            {user.role === 'admin' && (
              <Link className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500" to="/admin">
                {t('nav.admin')}
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-2xl border border-slate-700 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/20"
            >
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem('mikveh-lang');
    if (stored) {
      document.documentElement.lang = stored;
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden bg-soft-gradient py-10 px-4 sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <PageHeader />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth allowedRoles={['admin', 'staff']}>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth allowedRoles={['admin']}>
                  <AdminPage />
                </RequireAuth>
              }
            />
            <Route
              path="/room/:roomId"
              element={
                <RequireAuth allowedRoles={['admin', 'staff']}>
                  <RoomScreen />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-4 text-sm text-slate-300 shadow-soft"
            >
              {t('app.footerNote')}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <AppShell />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}
