import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await login(username.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }

    setSaving(false);
  };

  return (
    <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/90 p-8 shadow-soft backdrop-blur-sm">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{t('auth.loginTitle')}</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">{t('auth.loginSubtitle')}</h2>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">{t('auth.username')}</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            placeholder="admin"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">{t('auth.password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-rose-400">{error}</p>}

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={saving}
          className={`w-full rounded-2xl px-6 py-3 text-sm font-semibold transition ${
            saving ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          {saving ? t('auth.loggingIn') : t('auth.loginButton')}
        </motion.button>
      </form>
    </div>
  );
}
