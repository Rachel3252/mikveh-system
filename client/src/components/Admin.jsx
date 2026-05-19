import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Settings, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../lib/config';

export function Admin({ roomsCount, onRoomsCountChange }) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [newCount, setNewCount] = useState(roomsCount);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNewCount(roomsCount);
  }, [roomsCount]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/rooms-count`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ roomsCount: newCount }),
      });

      if (response.ok) {
        onRoomsCountChange(newCount);
      } else {
        const body = await response.json().catch(() => null);
        console.error('Failed to update rooms count', body);
        alert(t('admin.saveError'));
      }
    } catch (error) {
      console.error('Error updating rooms count:', error);
      alert(t('admin.saveError'));
    }
    setIsSaving(false);
  };

  return (
    <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/90 p-8 shadow-soft backdrop-blur-sm">
      <div className="mb-6 flex items-center gap-4">
        <Settings className="h-8 w-8 text-slate-400" />
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
            {t('admin.title')}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {t('admin.subtitle')}
          </h2>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t('admin.roomsCount')}
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={newCount}
            onChange={(e) => setNewCount(parseInt(e.target.value) || 1)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <p className="mt-2 text-sm text-slate-400">
            {t('admin.roomsCountHelp')}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={isSaving || newCount === roomsCount}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition ${
            isSaving || newCount === roomsCount
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          <Save className="h-5 w-5" />
          {isSaving ? t('admin.saving') : t('admin.save')}
        </motion.button>
      </div>
    </div>
  );
}