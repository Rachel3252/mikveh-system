import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle, Clock, RotateCcw } from 'lucide-react';

const statusPriority = { help: 1, ready: 2, idle: 3 };

const statusConfig = {
  idle: {
    badge: 'bg-slate-100 border-slate-200 text-slate-900',
    label: 'room.status.idle',
  },
  ready: {
    badge: 'bg-amber-100 border-amber-200 text-slate-900',
    label: 'room.status.ready',
  },
  help: {
    badge: 'bg-rose-100 border-rose-200 text-slate-900',
    label: 'room.status.help',
  },
};

function formatTimeAgo(timestamp) {
  if (!timestamp) return '—';
  const diff = Math.max(Date.now() - new Date(timestamp).getTime(), 0);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m`;
  return `${hours}h`;
}

export function Dashboard({ rooms = [], onResetRoom }) {
  const { t } = useTranslation();

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return a.id - b.id;
    });
  }, [rooms]);

  return (
    <div className="w-full">
      <div className="mb-8 rounded-3xl border border-slate-200/70 bg-slate-50/90 px-8 py-6 shadow-soft backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-500 mb-2">
              {t('dashboard.title')}
            </p>
            <h2 className="text-3xl font-semibold text-slate-900">
              {t('dashboard.subtitle')}
            </h2>
          </div>
          <motion.div
            className="rounded-3xl border border-slate-200/80 bg-white px-5 py-4 text-center shadow-sm"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">
              {t('dashboard.total')}
            </p>
            <p className="text-3xl font-bold text-slate-900">{sortedRooms.length}</p>
          </motion.div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedRooms.map((room, idx) => {
          const config = statusConfig[room.status] || statusConfig.idle;
          return (
            <motion.div
              key={room.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-1">
                    {t('dashboard.room')}
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {t('room.number', { number: room.id })}
                  </p>
                </div>
                <div className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] ${config.badge}`}>
                  {t(config.label)}
                </div>
              </div>

              <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-3 w-3 text-slate-500" />
                <span>{t('dashboard.updated')}: {formatTimeAgo(room.lastUpdated)}</span>
              </div>

              {room.status !== 'idle' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onResetRoom?.(room.id)}
                  className="w-full rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800"
                >
                  <RotateCcw className="inline-block h-4 w-4 align-middle mr-2" />
                  {t('dashboard.reset')}
                </motion.button>
              )}
            </motion.div>
          );
        })}
      </div>

      {sortedRooms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">{t('dashboard.noRooms')}</p>
        </div>
      )}
    </div>
  );
}
