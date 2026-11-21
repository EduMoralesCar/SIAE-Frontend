import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL, limpiarCacheCliente } from '../api/client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { usuario, token } = useAuth();
  const socketRef = useRef(null);
  const listenersRef = useRef(new Set());
  const notifListenersRef = useRef(new Set());

  const [conectado, setConectado] = useState(false);
  const [presencia, setPresencia] = useState({
    totalConexiones: 0,
    perfilesActivos: 0,
    rolesConectados: [],
  });
  const [ultimoEvento, setUltimoEvento] = useState(null);
  const [toasts, setToasts] = useState([]);

  const descartarToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const agregarToast = useCallback(
    (payload) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [{ id, ...payload }, ...prev].slice(0, 4));
      setTimeout(() => {
        descartarToast(id);
      }, 6500);
    },
    [descartarToast]
  );

  useEffect(() => {
    if (!usuario || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConectado(false);
      setPresencia({ totalConexiones: 0, perfilesActivos: 0, rolesConectados: [] });
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConectado(true);
      socket.emit('siae:solicitar-presencia');
    });

    socket.on('disconnect', () => {
      setConectado(false);
    });

    socket.on('siae:presencia', (estado) => {
      if (estado) setPresencia(estado);
    });

    socket.on('siae:actualizacion', (evento) => {
      limpiarCacheCliente();
      setUltimoEvento(evento);
      for (const listener of listenersRef.current) {
        try {
          listener(evento);
        } catch {
          // Ignorar errores individuales de listeners
        }
      }
    });

    socket.on('siae:notificacion', (notif) => {
      limpiarCacheCliente();
      agregarToast({
        titulo: notif.titulo || 'Nueva notificación',
        mensaje: notif.mensaje || '',
        tipo: notif.tipo || 'INFO',
      });
      for (const listener of notifListenersRef.current) {
        try {
          listener(notif);
        } catch {
          // Ignorar
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConectado(false);
    };
  }, [usuario?.id, token, agregarToast]);

  const suscribirActualizacion = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const suscribirNotificacion = useCallback((listener) => {
    notifListenersRef.current.add(listener);
    return () => {
      notifListenersRef.current.delete(listener);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        conectado,
        presencia,
        ultimoEvento,
        toasts,
        descartarToast,
        suscribirActualizacion,
        suscribirNotificacion,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

/**
 * Hook declarativo para refrescar silenciosamente cualquier vista ante cambios en tiempo real.
 * @param {string[]} modulos - Lista de módulos ('asistencia', 'salud', 'conducta', etc.) o ['*']
 * @param {Function} onRefresh - Función de recarga silenciosa
 */
export function useActualizacionEnVivo(modulos = ['*'], onRefresh) {
  const ctx = useSocket();
  const callbackRef = useRef(onRefresh);
  const timerRef = useRef(null);

  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  const modulosKey = Array.isArray(modulos) ? modulos.join(',') : '*';

  useEffect(() => {
    if (!ctx?.suscribirActualizacion) return undefined;
    const lista = modulosKey.split(',');

    const unsubscribe = ctx.suscribirActualizacion((evento) => {
      if (lista.includes('*') || lista.includes(evento?.modulo)) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          callbackRef.current?.(evento);
        }, 160);
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ctx, modulosKey]);
}
