import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const saved = localStorage.getItem('siae_usuario');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('siae_token');
    if (token && !usuario) {
      api
        .get('/auth/perfil')
        .then((res) => {
          if (res.data?.usuario) {
            setUsuario(res.data.usuario);
            localStorage.setItem('siae_usuario', JSON.stringify(res.data.usuario));
          }
        })
        .catch(() => {
          localStorage.removeItem('siae_token');
          localStorage.removeItem('siae_usuario');
          setUsuario(null);
        });
    }
  }, []);

  const iniciarSesion = async (identificador, password) => {
    setCargando(true);
    try {
      const { data } = await api.post('/auth/login', { identificador, password });
      localStorage.setItem('siae_token', data.token);
      localStorage.setItem('siae_usuario', JSON.stringify(data.usuario));
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
    localStorage.removeItem('siae_token');
    localStorage.removeItem('siae_usuario');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
