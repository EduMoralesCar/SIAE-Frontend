import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  QrCode,
  IdCard,
  ShieldAlert,
  FileSpreadsheet,
  Users,
  Settings,
  ClipboardCheck,
  BookOpen,
  Smartphone,
  Bell,
  LogOut,
  Menu,
  X,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  HeartPulse,
  Clock,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';

const MENU_POR_ROL = {
  ADMIN: [
    { ruta: '/dashboard', texto: 'Resumen', icono: LayoutDashboard },
    { ruta: '/escaner-qr', texto: 'Escáner QR', icono: QrCode },
    { ruta: '/asistencias', texto: 'Asistencias', icono: ClipboardCheck },
    { ruta: '/salud-retiros', texto: 'Salud, Retiros y Permisos', icono: HeartPulse },
    { ruta: '/conducta', texto: 'Incidencias, Actas y Compr.', icono: ShieldAlert },
    { ruta: '/historial', texto: 'Historial y Línea de Tiempo', icono: Clock },
    { ruta: '/carnets', texto: 'Fotochecks QR', icono: IdCard },
    { ruta: '/reportes', texto: 'Reportes', icono: FileSpreadsheet },
    { ruta: '/usuarios', texto: 'Usuarios y Matrículas', icono: Users },
    { ruta: '/configuracion', texto: 'Configuración y Auditoría', icono: Settings },
  ],
  DIRECTOR: [
    { ruta: '/dashboard', texto: 'Dashboard General', icono: LayoutDashboard },
    { ruta: '/asistencias', texto: 'Asistencias y Faltas', icono: ClipboardCheck },
    { ruta: '/salud-retiros', texto: 'Salud, Retiros y Permisos', icono: HeartPulse },
    { ruta: '/conducta', texto: 'Incidencias, Actas y Compr.', icono: ShieldAlert },
    { ruta: '/historial', texto: 'Historial y Línea de Tiempo', icono: Clock },
    { ruta: '/carnets', texto: 'Estudiantes y Fotochecks', icono: IdCard },
    { ruta: '/reportes', texto: 'Reportes', icono: FileSpreadsheet },
    { ruta: '/usuarios', texto: 'Personal y Matrículas', icono: Users },
    { ruta: '/configuracion', texto: 'Auditoría General', icono: Settings },
  ],
  TUTOR: [
    { ruta: '/dashboard', texto: 'Seguimiento Tutoría', icono: LayoutDashboard },
    { ruta: '/asistencias', texto: 'Asistencia y Faltas', icono: ClipboardCheck },
    { ruta: '/salud-retiros', texto: 'Salud, Retiros y Permisos', icono: HeartPulse },
    { ruta: '/conducta', texto: 'Incidencias, Actas y Compr.', icono: ShieldAlert },
    { ruta: '/historial', texto: 'Historial y Línea de Tiempo', icono: Clock },
    { ruta: '/actividades', texto: 'Actividades y Notas', icono: BookOpen },
    { ruta: '/escaner-qr', texto: 'Asistencia de Aula', icono: QrCode },
    { ruta: '/reportes', texto: 'Reportes de Tutoría', icono: FileSpreadsheet },
  ],
  DOCENTE: [
    { ruta: '/actividades', texto: 'Actividades y Notas', icono: BookOpen },
    { ruta: '/escaner-qr', texto: 'Asistencia de Aula', icono: QrCode },
    { ruta: '/asistencias', texto: 'Asistencias y Faltas', icono: ClipboardCheck },
    { ruta: '/salud-retiros', texto: 'Situaciones de Salud', icono: HeartPulse },
    { ruta: '/conducta', texto: 'Incidencias y Citaciones', icono: ShieldAlert },
    { ruta: '/historial', texto: 'Historial del Estudiante', icono: Clock },
    { ruta: '/reportes', texto: 'Reportes', icono: FileSpreadsheet },
    { ruta: '/dashboard', texto: 'Resumen', icono: LayoutDashboard },
  ],
  AUXILIAR: [
    { ruta: '/escaner-qr', texto: 'Escáner QR', icono: QrCode },
    { ruta: '/asistencias', texto: 'Asistencias', icono: ClipboardCheck },
    { ruta: '/salud-retiros', texto: 'Salud y Retiros', icono: HeartPulse },
    { ruta: '/conducta', texto: 'Incidencias', icono: ShieldAlert },
    { ruta: '/historial', texto: 'Historial del Estudiante', icono: Clock },
    { ruta: '/carnets', texto: 'Fotochecks QR', icono: IdCard },
    { ruta: '/reportes', texto: 'Reportes', icono: FileSpreadsheet },
    { ruta: '/dashboard', texto: 'Resumen', icono: LayoutDashboard },
  ],
  PADRE: [
    { ruta: '/portal-padre', texto: 'Portal de Padres', icono: Smartphone },
    { ruta: '/historial', texto: 'Línea de Tiempo e Historial', icono: Clock },
  ],
  ESTUDIANTE: [
    { ruta: '/mi-carnet', texto: 'Mi Fotocheck QR', icono: IdCard },
  ],
};

export default function Layout({ children }) {
  const { usuario, cerrarSesion } = useAuth();
  const { esOscuro, alternarTema } = useTheme();
  const navigate = useNavigate();
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [panelNotif, setPanelNotif] = useState(false);

  const cargarNotificaciones = async () => {
    try {
      const { data } = await api.get('/notificaciones');
      if (data.ok) {
        setNotificaciones(data.notificaciones || []);
        setNoLeidas(data.noLeidas || 0);
      }
    } catch {
      // Ignorar
    }
  };

  useEffect(() => {
    cargarNotificaciones();
    const timer = setInterval(cargarNotificaciones, 20000);
    return () => clearInterval(timer);
  }, [usuario?.id]);

  const handleMarcarLeidas = async () => {
    try {
      await api.patch('/notificaciones/leidas');
      setNoLeidas(0);
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));
    } catch {
      // Ignorar
    }
  };

  const handleLogout = () => {
    cerrarSesion();
    navigate('/login');
  };

  const itemsMenu = MENU_POR_ROL[usuario?.rol] || [];

  return (
    <div className="h-screen overflow-hidden flex bg-slate-50 text-slate-900">
      {/* Backdrop en móvil */}
      {menuMovilAbierto && (
        <div
          onClick={() => setMenuMovilAbierto(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      )}

      {/* Barra lateral fija (altura 100vh, nunca se pierde al hacer scroll y se puede ocultar/mostrar) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 h-screen bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-200 lg:static ${
          menuMovilAbierto ? 'translate-x-0 w-60' : '-translate-x-full w-60'
        } ${
          sidebarVisible
            ? 'lg:translate-x-0 lg:w-60'
            : 'lg:-translate-x-full lg:w-0 lg:border-r-0 lg:overflow-hidden'
        }`}
      >
        <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="siae-brand-mark w-8 h-8 rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <GraduationCap className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">SIAE</span>
          </div>

          <button
            type="button"
            onClick={() => setMenuMovilAbierto(false)}
            className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {itemsMenu.map((item) => {
            const Icono = item.icono;
            return (
              <NavLink
                key={item.ruta}
                to={item.ruta}
                onClick={() => setMenuMovilAbierto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icono className="w-4 h-4 shrink-0" />
                <span>{item.texto}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-900 truncate">
              {usuario?.nombres} {usuario?.apellidos}
            </p>
            <p className="text-[11px] text-slate-500 uppercase">{usuario?.rol}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Columna derecha con su propio scroll interno */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMenuMovilAbierto(true)}
              className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
              title="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="hidden lg:inline-flex items-center justify-center p-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              title={sidebarVisible ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}
            >
              {sidebarVisible ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>

            {!sidebarVisible && (
              <div className="hidden lg:flex items-center gap-2 mr-1">
                <div className="siae-brand-mark w-6 h-6 rounded-md flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="font-bold text-sm text-slate-900">SIAE</span>
              </div>
            )}

            <span className="text-xs font-medium text-slate-500">
              Gestión y Seguimiento Escolar QR
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botón Sol / Luna para alternar entre Modo Claro y Modo Oscuro */}
            <button
              type="button"
              onClick={alternarTema}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition"
              title={esOscuro ? 'Cambiar a modo claro (Sol)' : 'Cambiar a modo oscuro (Luna)'}
            >
              {esOscuro ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Oscuro</span>
                </>
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setPanelNotif(!panelNotif);
                  if (noLeidas > 0) handleMarcarLeidas();
                }}
                className="relative p-2 rounded-md hover:bg-slate-100 text-slate-600 transition"
                title="Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {noLeidas > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600" />
                )}
              </button>

              {panelNotif && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50">
                  <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">Notificaciones</span>
                    <button
                      type="button"
                      onClick={() => setPanelNotif(false)}
                      className="text-slate-400 hover:text-slate-700 text-xs"
                    >
                      Cerrar
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notificaciones.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-500">Sin notificaciones</p>
                    ) : (
                      notificaciones.map((n) => (
                        <div key={n.id} className="p-3 hover:bg-slate-50">
                          <p className="text-xs font-medium text-slate-900">{n.titulo}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.mensaje}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl w-full mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
