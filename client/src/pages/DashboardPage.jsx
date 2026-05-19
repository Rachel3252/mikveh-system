import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from '../components/Dashboard';
import { WaterBackground } from '../components/WaterBackground';
import { useTranslation } from 'react-i18next';
import { API_URL, SOCKET_URL } from '../lib/config';

function getRoomNotification(prevRooms, nextRooms) {
  const previous = prevRooms.reduce((map, room) => {
    map[room.id] = room.status;
    return map;
  }, {});

  for (const next of nextRooms) {
    const previousStatus = previous[next.id];
    if (previousStatus && previousStatus !== next.status) {
      if (next.status === 'help') {
        return { key: 'notifications.roomHelp', params: { roomId: next.id }, status: 'help' };
      }
      if (next.status === 'ready') {
        return { key: 'notifications.roomReady', params: { roomId: next.id }, status: 'ready' };
      }
    }
  }

  return null;
}

export function DashboardPage() {
  const { authFetch, token } = useAuth();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [speechVoice, setSpeechVoice] = useState(null);
  const socketRef = useRef(null);
  const prevRoomsRef = useRef([]);

  const speakMessage = (message) => {
    if (isMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'he-IL';
    utterance.rate = 1;
    utterance.pitch = 1;
    if (speechVoice) {
      utterance.voice = speechVoice;
    }

    synth.speak(utterance);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const voices = synth.getVoices();
      const hebrewVoice = voices.find((voice) => voice.lang.startsWith('he'));
      setSpeechVoice(hebrewVoice || voices[0] || null);
    };

    loadVoices();
    synth.addEventListener('voiceschanged', loadVoices);

    return () => {
      synth.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    const loadRooms = async () => {
      setLoading(true);
      try {
        const response = await authFetch('/api/rooms');
        if (!response.ok) {
          throw new Error(t('dashboard.loading'));
        }
        const data = await response.json();
        prevRoomsRef.current = data;
        setRooms(data);
      } catch (err) {
        setError(err.message || t('dashboard.socketError'));
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, [token, authFetch, t]);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setError(null);
    });

    socket.on('connect_error', (connectError) => {
      setError(connectError.message || t('dashboard.socketError'));
    });

    socket.on('roomsUpdate', (data) => {
      if (!Array.isArray(data)) return;

      const notificationPayload = getRoomNotification(prevRoomsRef.current, data);
      if (notificationPayload) {
        setNotification(notificationPayload);

        const speechText =
          notificationPayload.status === 'help'
            ? `טובלת בחדר ${notificationPayload.params.roomId} צריכה עזרה`
            : `טובלת בחדר ${notificationPayload.params.roomId} מוכנה`;

        speakMessage(speechText);
        toast[notificationPayload.status === 'help' ? 'error' : 'success'](
          t(notificationPayload.key, notificationPayload.params)
        );
      }

      prevRoomsRef.current = data;
      setRooms(data);
    });

    socket.connect();

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('roomsUpdate');
      socket.disconnect();
    };
  }, [token, t]);

  useEffect(() => {
    if (!notification) return undefined;

    const timeout = window.setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [notification]);

  const resetRoom = async (roomId) => {
    try {
      const response = await authFetch(`/api/rooms/${roomId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(t('dashboard.resetError'));
      }

      setRooms((prevRooms) => {
        const updatedRooms = prevRooms.map((room) =>
          room.id === roomId
            ? { ...room, status: 'idle', lastUpdated: new Date() }
            : room
        );
        prevRoomsRef.current = updatedRooms;
        return updatedRooms;
      });

      if (socketRef.current?.connected) {
        socketRef.current.emit('resetRoom', { roomId });
      }

      toast.success(t('dashboard.resetSuccess', { roomNumber: roomId }));
    } catch (err) {
      toast.error(err.message || t('dashboard.resetError'));
    }
  };

  return (
    <div className="space-y-8">
      <WaterBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {notification ? (
            <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-5 py-4 text-slate-900 shadow-sm">
              {t(notification.key, notification.params)}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-5 py-4 text-slate-900 shadow-sm">
              {t('dashboard.subtitle')}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMuted((value) => !value)}
            className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-200"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {isMuted ? t('dashboard.unmute') : t('dashboard.mute')}
          </button>
        </div>

        {loading && (
          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-8 text-slate-700 shadow-sm">
            {t('dashboard.loading')}
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-900 shadow-sm">
            {error}
          </div>
        )}

        <Dashboard rooms={rooms} onResetRoom={resetRoom} />
      </div>
    </div>
  );
}
