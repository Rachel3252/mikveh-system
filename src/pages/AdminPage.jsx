import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Admin } from '../components/Admin';
import { useTranslation } from 'react-i18next';

export function AdminPage() {
  const { authFetch } = useAuth();
  const { t } = useTranslation();
  const [roomsCount, setRoomsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const response = await authFetch('/api/config');
        if (!response.ok) {
          throw new Error('Unable to load settings.');
        }
        const data = await response.json();
        setRoomsCount(data.roomsCount);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [authFetch]);

  return (
    <div className="space-y-8">
      {loading && <div className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-8 text-slate-300">{t('admin.loading')}</div>}
      {error && <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-8 text-rose-100">{error}</div>}
      {!loading && !error && <Admin roomsCount={roomsCount} onRoomsCountChange={setRoomsCount} authFetch={authFetch} />}
    </div>
  );
}
