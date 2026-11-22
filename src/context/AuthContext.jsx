import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { limpiarCacheCliente } from '../api/client';

const AuthContext = createContext(null);

export function esTokenValido(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return false;
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    if (!payload?.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      // Limpiar llaves heredadas de localStorage para garantizar aislamiento real por pestaña
      localStorage.removeItem('siae_token');
      localStorage.removeItem('siae_usuario');
      const savedToken = sessionStorage.getItem('siae_token');
      if (savedToken && esTokenValido(savedToken)) {
        return savedToken;
      }
      sessionStorage.removeItem('siae_token');
      sessionStorage.removeItem('siae_usuario');
      return null;
    } catch {
      return null;
    }
  });

  const [usuario, setUsuario] = useState(() => {
    try {
      const savedToken = sessionStorage.getItem('siae_token');
      if (!savedToken || !esTokenValido(savedToken)) return null;
      const saved = sessionStorage.getItem('siae_usuario');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [cargando, setCargando] = useState(false);

  const cerrarSesion = useCallback(() => {
    limpiarCacheCliente();
    sessionStorage.removeItem('siae_token');
    sessionStorage.removeItem('siae_usuario');
    setToken(null);
    setUsuario(null);
  }, []);

  // Mostrar el rol activo en el título de la pestaña del navegador (ej. SIAE · ADMIN)
  useEffect(() => {
    if (usuario?.rol) {
      document.title = `SIAE · ${usuario.rol}`;
    } else {
      document.title = 'SIAE — Gestión y Seguimiento Escolar QR';
    }
  }, [usuario?.rol]);

  // Escuchar evento global de sesión expirada (HTTP 401 del interceptor Axios)
  useEffect(() => {
    const onExpirada = () => {
      cerrarSesion();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login?expirada=1');
      }
    };
    window.addEventListener('siae:sesion-expirada', onExpirada);
    return () => window.removeEventListener('siae:sesion-expirada', onExpirada);
  }, [cerrarSesion]);

  // Verificación periódica de expiración del token JWT en cliente (cada 60s)
  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(() => {
      if (!esTokenValido(token)) {
        cerrarSesion();
        if (window.location.pathname !== '/login') {
          window.location.assign('/login?expirada=1');
        }
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [token, cerrarSesion]);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('siae_token');
    if (savedToken && esTokenValido(savedToken) && !usuario) {
      api
        .get('/auth/perfil')
        .then((res) => {
          if (res.data?.usuario) {
            setUsuario(res.data.usuario);
            sessionStorage.setItem('siae_usuario', JSON.stringify(res.data.usuario));
          }
        })
        .catch(() => {
          cerrarSesion();
        });
    }
  }, [usuario, cerrarSesion]);

  const iniciarSesion = async (identificador, password) => {
    setCargando(true);
    try {
      limpiarCacheCliente();
      const { data } = await api.post('/auth/login', { identificador, password });
      sessionStorage.setItem('siae_token', data.token);
      sessionStorage.setItem('siae_usuario', JSON.stringify(data.usuario));
      setToken(data.token);
      setUsuario(data.usuario);
      return { ok: true, usuario: data.usuario };
    } catch (err) {
      return {
        ok: false,
        mensaje:
          err.response?.data?.mensaje ||
          'No se pudo conectar con el servidor SIAE. Verifique que el Backend esté activo y conectado a Supabase.',
      };
    } finally {
      setCargando(false);
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
