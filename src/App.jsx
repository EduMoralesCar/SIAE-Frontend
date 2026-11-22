import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, esTokenValido } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EscanerQRPage from './pages/EscanerQRPage';
import CarnetsPage from './pages/CarnetsPage';
import AsistenciasAuditoriaPage from './pages/AsistenciasAuditoriaPage';
import ConductaPage from './pages/ConductaPage';
import ActividadesDocentePage from './pages/ActividadesDocentePage';
import ReportesPage from './pages/ReportesPage';
import PortalPadrePage from './pages/PortalPadrePage';
import PortalEstudiantePage from './pages/PortalEstudiantePage';
import UsuariosConfigPage from './pages/UsuariosConfigPage';
import SaludRetirosPermisosPage from './pages/SaludRetirosPermisosPage';
import ExpedienteEstudiantePage from './pages/ExpedienteEstudiantePage';

function rutaInicialPorRol(rol) {
  if (rol === 'PADRE') return '/portal-padre';
  if (rol === 'ESTUDIANTE') return '/mi-carnet';
  if (rol === 'AUXILIAR') return '/escaner-qr';
  if (rol === 'DOCENTE') return '/actividades';
  return '/dashboard';
}

function RutaProtegida({ children, rolesPermitidos = null }) {
  const { usuario, token, cerrarSesion } = useAuth();

  if (!usuario || !token) {
    return <Navigate to="/login" replace />;
  }

  if (!esTokenValido(token)) {
    cerrarSesion();
    return <Navigate to="/login?expirada=1" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to={rutaInicialPorRol(usuario.rol)} replace />;
  }

  return <Layout>{children}</Layout>;
}

function RedireccionInicial() {
  const { usuario, token } = useAuth();
  if (!usuario || !token || !esTokenValido(token)) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={rutaInicialPorRol(usuario.rol)} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<RedireccionInicial />} />

              <Route
                path="/dashboard"
                element={
                  <RutaProtegida rolesPermitidos={['ADMIN', 'DIRECTOR', 'TUTOR', 'DOCENTE', 'AUXILIAR']}>
                    <DashboardPage />
                  </RutaProtegida>
                }
              />
              <Route
                path="/escaner-qr"
                element={
                  <RutaProtegida rolesPermitidos={['ADMIN', 'DIRECTOR', 'TUTOR', 'DOCENTE', 'AUXILIAR']}>
                    <EscanerQRPage />
                  </RutaProtegida>
                }
              />
              <Route
                path="/carnets"
                element={
                  <RutaProtegida rolesPermitidos={['ADMIN', 'DIRECTOR', 'AUXILIAR']}>
                    <CarnetsPage />
                  </RutaProtegida>
                }
              />
              <Route
                path="/asistencias"
                element={
                  <RutaProtegida rolesPermitidos={['ADMIN', 'DIRECTOR', 'TUTOR', 'DOCENTE', 'AUXILIAR']}>
                    <AsistenciasAuditoriaPage />
                  </RutaProtegida>
                }
              />
              <Route
                path="/salud-retiros"
                element={
                  <RutaProtegida rolesPermitidos={['ADMIN', 'DIRECTOR', 'TUTOR', 'DOCENTE', 'AUXILIAR']}>
                    <SaludRetirosPermisosPage />
                  </RutaProtegida>
                }
              />
              <Route
                path="/conducta"
                element={
                  <RutaProtegida rolesPermitidos={['ADMIN', 'DIRECTOR', 'TUTOR', 'DOCENTE', 'AUXILIAR']}>
                    <ConductaPage />
                  </RutaProtegida>
                }
              />
              <Route
                path="/historial"
                element={
                  <RutaProtegida
                    rolesPermitidos={['ADMIN', 'DIRECTOR', 'TUTOR', 'DOCENTE', 'AUXILIAR', 'PADRE']}
                  >
                    <ExpedienteEstudiantePage />
                  </RutaProtegida>
                }
              />
              <Route
                path="/actividades"
                element={
                  <RutaProtegida rolesPermitidos={['ADMIN', 'DIRECTOR', 'TUTOR', 'DOCENTE']}>
                    <ActividadesDocentePage />
                  </RutaProtegida>
                }
              />
              <Route
                path="/reportes"
                element={
                  <RutaProtegida rolesPermitidos={['ADMIN', 'DIRECTOR', 'TUTOR', 'DOCENTE', 'AUXILIAR']}>
                    <ReportesPage />
                  </RutaProtegida>
                }
              />
              <Route
                path="/portal-padre"
                element={
                  <RutaProtegida rolesPermitidos={['PADRE']}>
                    <PortalPadrePage />
                  </RutaProtegida>
                }
              />
              <Route
                path="/mi-carnet"
                element={
                  <RutaProtegida rolesPermitidos={['ESTUDIANTE']}>
                    <PortalEstudiantePage />
                  </RutaProtegida>
                }
              />
              <Route
                path="/usuarios"
                element={
                  <RutaProtegida rolesPermitidos={['ADMIN', 'DIRECTOR']}>
                    <UsuariosConfigPage tabInicial="usuarios" />
                  </RutaProtegida>
                }
              />
              <Route
                path="/configuracion"
                element={
                  <RutaProtegida rolesPermitidos={['ADMIN', 'DIRECTOR']}>
                    <UsuariosConfigPage tabInicial="configuracion" />
                  </RutaProtegida>
                }
              />

              <Route path="*" element={<RedireccionInicial />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
