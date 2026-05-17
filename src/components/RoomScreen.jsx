import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Pause, Play, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { WaterBackground } from './WaterBackground';
import '../styles/room-screen.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MUSIC_URL = '/audio/calm.mp3';

function fadeAudio(audio, targetVolume, duration = 400) {
  if (!audio) return;
  const startVolume = audio.volume;
  const startTime = Date.now();

  const fade = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    audio.volume = startVolume + (targetVolume - startVolume) * progress;

    if (progress < 1) {
      requestAnimationFrame(fade);
    }
  };

  fade();
}

export function RoomScreen() {
  const { t, i18n } = useTranslation();
  const { roomId } = useParams();
  const { authFetch, token } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const socketRef = useRef(null);
  const audioRef = useRef(null);
  const roomNumber = Number(roomId);

  // Initialize audio once for the component lifecycle
  useEffect(() => {
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = 0;
    audio.preload = 'metadata';
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Load room data
  useEffect(() => {
    if (!token || Number.isNaN(roomNumber)) return;

    const loadRoom = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await authFetch(`/api/rooms/${roomNumber}`);
        if (!response.ok) {
          throw new Error(t('room.loadError'));
        }
        const data = await response.json();
        setRoom(data);
      } catch (err) {
        setError(err.message || t('room.loadError'));
        toast.error(err.message || t('room.loadError'));
      } finally {
        setLoading(false);
      }
    };

    loadRoom();
  }, [authFetch, roomNumber, t, token]);

  // Setup Socket.io
  useEffect(() => {
    if (!token || Number.isNaN(roomNumber)) return;

    const socket = io(API_URL, {
      auth: { token },
      autoConnect: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Room socket connected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err);
      setError(err.message || t('room.socketError'));
    });

    socket.on('roomUpdated', (updatedRoom) => {
      if (updatedRoom.id === roomNumber) {
        setRoom(updatedRoom);
      }
    });

    socket.connect();

    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [token, roomNumber, t]);

  const handleStatusChange = async (newStatus) => {
    if (!room || isSaving) return;

    setIsSaving(true);
    try {
      const response = await authFetch(`/api/rooms/${roomNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(t('room.updateError'));
      }

      const updatedRoom = await response.json();
      setRoom(updatedRoom);

      // Emit socket event for real-time updates
      if (socketRef.current?.connected) {
        socketRef.current.emit('roomStatusChanged', {
          roomId: roomNumber,
          status: newStatus,
          timestamp: new Date(),
        });
      }

      // Show success toast
      const statusMessages = {
        ready: t('room.readyNotification'),
        help: t('room.needsHelpNotification'),
        idle: t('room.idleNotification'),
      };

      toast.success(statusMessages[newStatus] || t('room.updateSuccess'));
    } catch (err) {
      toast.error(err.message || t('room.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMusic = async () => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying) {
      fadeAudio(audio, 0, 400);
      window.setTimeout(() => {
        audio.pause();
      }, 450);
      setIsPlaying(false);
      toast.success(t('room.musicStopped'));
      return;
    }

    audio.volume = 0;
    audio.currentTime = 0;

    try {
      await audio.play();
      fadeAudio(audio, 0.3, 400);
      setIsPlaying(true);
      toast.success(t('room.musicPlaying'));
    } catch (err) {
      setIsPlaying(false);
      toast(t('room.tapToPlayMusic'), {
        description: t('room.browserBlocked'),
        icon: '🎵',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-400/20 to-pink-400/20 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 rounded-full border-2 border-fuchsia-400 border-t-transparent"
            />
          </div>
          <p className="text-slate-300">{t('room.loading')}</p>
        </motion.div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <AlertCircle className="mx-auto h-16 w-16 text-rose-400 mb-4" />
          <p className="text-slate-300 mb-4">{error || t('room.loadError')}</p>
        </motion.div>
      </div>
    );
  }

  const isRTL = i18n.dir() === 'rtl';

  return (
    <div className="relative min-h-screen overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <WaterBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Room Header Card */}
          <motion.div
            className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-slate-50/5 backdrop-blur-xl px-8 py-6 text-center shadow-lg"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-sm uppercase tracking-widest text-slate-400 mb-2">{t('room.title')}</p>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-fuchsia-200 via-pink-200 to-rose-200 bg-clip-text text-transparent mb-4">
              {t('room.number', { number: room.id })}
            </h1>

            {/* Status Display */}
            <motion.div
              layout
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-sm ${
                room.status === 'ready'
                  ? 'bg-gradient-to-r from-amber-400/20 to-amber-300/20 text-amber-200 border border-amber-400/30'
                  : room.status === 'help'
                    ? 'bg-gradient-to-r from-rose-400/20 to-pink-300/20 text-rose-200 border border-rose-400/30'
                    : 'bg-gradient-to-r from-slate-400/20 to-slate-300/20 text-slate-300 border border-slate-400/30'
              }`}
            >
              {room.status === 'ready' && <CheckCircle className="h-4 w-4" />}
              {room.status === 'help' && <AlertCircle className="h-4 w-4" />}
              <span>{t(`room.status.${room.status}`)}</span>
            </motion.div>
          </motion.div>

          {/* Main Action Buttons */}
          <div className="space-y-4 mb-8">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStatusChange('ready')}
              disabled={isSaving || room.status === 'ready'}
              className={`w-full rounded-3xl px-8 py-6 font-bold text-lg transition-all duration-200 shadow-lg ${
                room.status === 'ready'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-amber-500/30'
                  : 'bg-gradient-to-r from-amber-400/80 to-amber-500/80 hover:from-amber-400 hover:to-amber-500 text-white hover:shadow-xl hover:shadow-amber-500/40 active:scale-95'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {t('room.imReady')}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStatusChange('help')}
              disabled={isSaving || room.status === 'help'}
              className={`w-full rounded-3xl px-8 py-6 font-bold text-lg transition-all duration-200 shadow-lg ${
                room.status === 'help'
                  ? 'bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-rose-500/30'
                  : 'bg-gradient-to-r from-rose-400/80 to-pink-500/80 hover:from-rose-400 hover:to-pink-500 text-white hover:shadow-xl hover:shadow-rose-500/40 active:scale-95'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {t('room.needsHelp')}
            </motion.button>
          </div>

          {/* Music Control */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleMusic}
            className={`w-full rounded-3xl px-6 py-4 font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
              isPlaying
                ? 'bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 text-pink-200 border border-pink-400/30 hover:from-fuchsia-500/30 hover:to-pink-500/30'
                : 'bg-gradient-to-r from-slate-600/40 to-slate-700/40 text-slate-300 border border-slate-500/30 hover:from-slate-600/60 hover:to-slate-700/60'
            }`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Music className="h-5 w-5" />
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                <span>{t('room.musicPlaying')}</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>{t('room.musicPaused')}</span>
              </>
            )}
          </motion.button>

          {/* Updated Time Display */}
          <motion.div
            className="mt-8 text-center text-xs text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {t('room.lastUpdated', {
              time: new Date(room.lastUpdated || Date.now()).toLocaleTimeString(
                i18n.language === 'he' ? 'he-IL' : i18n.language === 'es' ? 'es-ES' : i18n.language === 'fr' ? 'fr-FR' : 'en-US'
              ),
            })}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
