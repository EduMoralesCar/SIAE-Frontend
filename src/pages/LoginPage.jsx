import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, GraduationCap, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ACCESOS_PRUEBA = [
  { etiqueta: 'Administrador', email: 'admin@siae.edu.pe' },
  { etiqueta: 'Director', email: 'director@siae.edu.pe' },
  { etiqueta: 'Tutor', email: 'tutor1@siae.edu.pe' },
  { etiqueta: 'Docente', email: 'docente1@siae.edu.pe' },
  { etiqueta: 'Auxiliar', email: 'auxiliar1@siae.edu.pe' },
  { etiqueta: 'Padre', email: 'padre1@siae.edu.pe' },
  { etiqueta: 'Estudiante', email: 'alumno1@siae.edu.pe' },
];

export default function LoginPage() {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { iniciarSesion, cargando } = useAuth();
  const { esOscuro, alternarTema } = useTheme();
  const navigate = useNavigate();

  const redirigirPorRol = (rol) => {
    if (rol === 'ADMIN' || rol === 'DIRECTOR') navigate('/dashboard');
    else if (rol === 'AUXILIAR') navigate('/escaner-qr');
    else if (rol === 'DOCENTE' || rol === 'TUTOR') navigate('/actividades');
    else if (rol === 'PADRE') navigate('/portal-padre');
    else if (rol === 'ESTUDIANTE') navigate('/mi-carnet');
    else navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await iniciarSesion(identificador, password);
    if (res.ok) {
      redirigirPorRol(res.usuario.rol);
    } else {
      setError(res.mensaje);
    }
  };

  const seleccionarCuenta = (email) => {
    setIdentificador(email);
    setPassword('123456');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 relative">
      {/* Selector Sol / Luna en la esquina superior derecha */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={alternarTema}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium transition"
          title={esOscuro ? 'Modo claro (Sol)' : 'Modo oscuro (Luna)'}
        >
          {esOscuro ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo claro</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5" />
              <span>Modo oscuro</span>
            </>
          )}
        </button>
      </div>

      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="siae-brand-mark w-8 h-8 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">SIAE</span>
          </div>
          <h1 className="text-base font-semibold text-slate-900">Iniciar sesión</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sistema Integral de Gestión y Seguimiento Escolar QR
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Correo electrónico o DNI
            </label>
            <input
              type="text"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="usuario@siae.edu.pe"
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-2 px-4 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-sm transition"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 mb-2">Acceso rápido de prueba:</p>
          <div className="flex flex-wrap gap-1.5">
            {ACCESOS_PRUEBA.map((item) => (
              <button
                key={item.email}
                type="button"
                onClick={() => seleccionarCuenta(item.email)}
                className="px-2 py-1 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[11px] text-slate-600 transition"
              >
                {item.etiqueta}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
