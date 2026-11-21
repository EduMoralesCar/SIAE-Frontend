import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { limpiarCacheCliente } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      // Limpiar llaves heredadas de localStorage para garantizar aislamiento real por pestaña
      localStorage.removeItem('siae_token');
      localStorage.removeItem('siae_usuario');
      return sessionStorage.getItem('siae_token') || null;
    } catch {
      return null;
    }
  });

  const [usuario, setUsuario] = useState(() => {
    try {
      const saved = sessionStorage.getItem('siae_usuario');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [cargando, setCargando] = useState(false);

  // Mostrar el rol activo en el título de la pestaña del navegador para distinguir perfiles fácilmente
  useEffect(() => {
    if (usuario?.rol) {
      document.title = `SIAE · ${usuario.rol} (${usuario.nombres?.split(' ')[0] || ''})`;
    } else {
      document.title = 'SIAE — Gestión y Seguimiento Escolar QR';
    }
  }, [usuario?.rol, usuario?.nombres]);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('siae_token');
    if (savedToken && !usuario) {
      api
        .get('/auth/perfil')
        .then((res) => {
          if (res.data?.usuario) {
            setUsuario(res.data.usuario);
            sessionStorage.setItem('siae_usuario', JSON.stringify(res.data.usuario));
          }
        })
        .catch(() => {
          sessionStorage.removeItem('siae_token');
          sessionStorage.removeItem('siae_usuario');
          setToken(null);
          setUsuario(null);
        });
    }
  }, []);

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

  const cerrarSesion = () => {
    limpiarCacheCliente();
    sessionStorage.removeItem('siae_token');
    sessionStorage.removeItem('siae_usuario');
    setToken(null);
    setUsuario(null);
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
