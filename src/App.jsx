import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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

function RutaProtegida({ children }) {
  const { usuario } = useAuth();
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

function RedireccionInicial() {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol === 'PADRE') return <Navigate to="/portal-padre" replace />;
  if (usuario.rol === 'ESTUDIANTE') return <Navigate to="/mi-carnet" replace />;
  if (usuario.rol === 'AUXILIAR') return <Navigate to="/escaner-qr" replace />;
  if (usuario.rol === 'DOCENTE') return <Navigate to="/actividades" replace />;
  if (usuario.rol === 'TUTOR' || usuario.rol === 'DIRECTOR' || usuario.rol === 'ADMIN')
    return <Navigate to="/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RedireccionInicial />} />

          <Route
            path="/dashboard"
            element={
              <RutaProtegida>
                <DashboardPage />
              </RutaProtegida>
            }
          />
          <Route
            path="/escaner-qr"
            element={
              <RutaProtegida>
                <EscanerQRPage />
              </RutaProtegida>
            }
          />
          <Route
            path="/carnets"
            element={
              <RutaProtegida>
                <CarnetsPage />
              </RutaProtegida>
            }
          />
          <Route
            path="/asistencias"
            element={
              <RutaProtegida>
                <AsistenciasAuditoriaPage />
              </RutaProtegida>
            }
          />
          <Route
            path="/salud-retiros"
            element={
              <RutaProtegida>
                <SaludRetirosPermisosPage />
              </RutaProtegida>
            }
          />
          <Route
            path="/conducta"
            element={
              <RutaProtegida>
                <ConductaPage />
              </RutaProtegida>
            }
          />
          <Route
            path="/historial"
            element={
              <RutaProtegida>
                <ExpedienteEstudiantePage />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades"
            element={
              <RutaProtegida>
                <ActividadesDocentePage />
              </RutaProtegida>
            }
          />
          <Route
            path="/reportes"
            element={
              <RutaProtegida>
                <ReportesPage />
              </RutaProtegida>
            }
          />
          <Route
            path="/portal-padre"
            element={
              <RutaProtegida>
                <PortalPadrePage />
              </RutaProtegida>
            }
          />
          <Route
            path="/mi-carnet"
            element={
              <RutaProtegida>
                <PortalEstudiantePage />
              </RutaProtegida>
            }
          />
          <Route
            path="/usuarios"
            element={
              <RutaProtegida>
                <UsuariosConfigPage tabInicial="usuarios" />
              </RutaProtegida>
            }
          />
          <Route
            path="/configuracion"
            element={
              <RutaProtegida>
                <UsuariosConfigPage tabInicial="configuracion" />
              </RutaProtegida>
            }
          />

          <Route path="*" element={<RedireccionInicial />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
  );
}
