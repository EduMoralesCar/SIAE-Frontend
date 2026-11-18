import React, { useEffect, useState } from 'react';
import { Search, FileText, RefreshCw, History, X, ShieldCheck, ShieldOff } from 'lucide-react';
import api from '../api/client';
import CarnetQRCard from '../components/CarnetQRCard';
import { descargarCarnetsMasivosPDF } from '../utils/exportadores';

export default function CarnetsPage() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [grados, setGrados] = useState([]);
  const [gradoSeccionId, setGradoSeccionId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  const [modalRegenerar, setModalRegenerar] = useState(null);
  const [motivoRevocacion, setMotivoRevocacion] = useState('Pérdida de fotocheck reportada por apoderado');
  const [procesandoQR, setProcesandoQR] = useState(false);

  const [modalHistorial, setModalHistorial] = useState(null);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resEst, resGrados] = await Promise.all([
        api.get('/estudiantes', {
          params: {
            grado_seccion_id: gradoSeccionId || undefined,
            busqueda: busqueda || undefined,
          },
        }),
        api.get('/grados-secciones'),
      ]);
      if (resEst.data?.estudiantes) setEstudiantes(resEst.data.estudiantes);
      if (resGrados.data?.grados) setGrados(resGrados.data.grados);
    } catch {
      // Ignorar
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [gradoSeccionId]);

  const handleBuscar = (e) => {
    e.preventDefault();
    cargarDatos();
  };

  const handleExportarLotePDF = () => {
    const seccionObj = grados.find((g) => String(g.id) === String(gradoSeccionId));
    const etiqueta = seccionObj
      ? `${seccionObj.grado}Sec_${seccionObj.seccion}`
      : 'Todas_las_Secciones';
    descargarCarnetsMasivosPDF(estudiantes, etiqueta);
  };

  const confirmarRegenerarQR = async (e) => {
    e.preventDefault();
    if (!modalRegenerar) return;
    setProcesandoQR(true);
    try {
      const { data } = await api.post(`/estudiantes/${modalRegenerar.id}/regenerar-qr`, {
        motivo: motivoRevocacion,
      });
      if (data.ok) {
        setEstudiantes((prev) =>
          prev.map((est) => (est.id === modalRegenerar.id ? data.estudiante : est))
        );
        setModalRegenerar(null);
      }
    } catch (err) {
      alert(err.response?.data?.mensaje || 'No se pudo regenerar el código QR.');
    } finally {
      setProcesandoQR(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Fotochecks y códigos QR</h1>
          <p className="text-xs text-slate-500">
            Emisión individual o masiva, invalidación por pérdida de fotocheck y reemplazo de código QR
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportarLotePDF}
          disabled={estudiantes.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium transition self-start sm:self-auto"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Descargar PDF masivo ({estudiantes.length})</span>
        </button>
      </div>

      <form
        onSubmit={handleBuscar}
        className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-3"
      >
        <select
          value={gradoSeccionId}
          onChange={(e) => setGradoSeccionId(e.target.value)}
          className="px-3 py-2 rounded-md border border-slate-300 text-xs"
        >
          <option value="">Todas las secciones</option>
          {grados
            .filter((g) => g.anio_escolar === 2026)
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.grado}° &ldquo;{g.seccion}&rdquo; Secundaria ({g._count?.estudiantes || 0})
              </option>
            ))}
        </select>

        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, DNI o token QR (STU-...)..."
            className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 text-xs"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
        >
          Buscar
        </button>
      </form>

      {cargando ? (
        <div className="py-12 text-center text-slate-500 text-sm">Cargando fotochecks...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {estudiantes.map((est) => {
            const totalRevocados =
              est.codigos_qr?.filter((c) => c.estado === 'REVOCADO').length || 0;
            return (
              <div
                key={est.id}
                className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col items-center"
              >
                <CarnetQRCard estudiante={est} mostrarBotones={true} />

                <div className="mt-2 flex items-center gap-2 w-full max-w-[270px]">
                  <button
                    type="button"
                    onClick={() => {
                      setModalRegenerar(est);
                      setMotivoRevocacion('Pérdida de fotocheck reportada por apoderado');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition"
                    title="Desactivar QR anterior y generar uno nuevo por pérdida de fotocheck"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Pérdida / Nuevo QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalHistorial(est)}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-medium transition"
                    title="Ver historial de códigos QR del estudiante"
                  >
                    <History className="w-3 h-3" />
                    <span>{totalRevocados > 0 ? `${totalRevocados} anulado(s)` : 'Historial'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Pérdida de fotocheck y regeneración de QR (Sección 20) */}
      {modalRegenerar && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-lg max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Reportar pérdida de fotocheck y regenerar QR
              </h2>
              <button
                type="button"
                onClick={() => setModalRegenerar(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p className="font-medium text-slate-900">
                {modalRegenerar.usuario?.apellidos}, {modalRegenerar.usuario?.nombres}
              </p>
              <p className="text-slate-500">
                QR actual que será desactivado:{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {modalRegenerar.codigo_qr_unico}
                </span>
              </p>
            </div>

            <form onSubmit={confirmarRegenerarQR} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Motivo de desactivación del QR anterior
                </label>
                <input
                  type="text"
                  value={motivoRevocacion}
                  onChange={(e) => setMotivoRevocacion(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  El código QR anterior quedará revocado permanentemente y ya no permitirá registrar
                  asistencia.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalRegenerar(null)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoQR}
                  className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
                >
                  {procesandoQR ? 'Generando...' : 'Desactivar anterior y emitir nuevo QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Historial de Códigos QR del estudiante */}
      {modalHistorial && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-lg max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Historial de códigos QR del estudiante
                </h2>
                <p className="text-xs text-slate-500">
                  {modalHistorial.usuario?.apellidos}, {modalHistorial.usuario?.nombres}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalHistorial(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto border border-slate-200 rounded-md">
              {(!modalHistorial.codigos_qr || modalHistorial.codigos_qr.length === 0) ? (
                <div className="p-4 text-xs text-slate-500 text-center">
                  Código activo: <span className="font-mono">{modalHistorial.codigo_qr_unico}</span>
                </div>
              ) : (
                modalHistorial.codigos_qr.map((qr) => (
                  <div key={qr.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {qr.estado === 'ACTIVO' ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ShieldOff className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-mono font-semibold text-slate-900">{qr.token}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            qr.estado === 'ACTIVO'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {qr.estado}
                        </span>
                      </div>
                      {qr.motivo_revocacion && (
                        <p className="text-[11px] text-slate-500 pl-6">
                          Motivo de baja: {qr.motivo_revocacion}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-slate-400 shrink-0">
                      <p>Emitido: {new Date(qr.created_at).toLocaleDateString('es-PE')}</p>
                      {qr.revoked_at && (
                        <p className="text-red-500">
                          Revocado: {new Date(qr.revoked_at).toLocaleDateString('es-PE')}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setModalHistorial(null)}
                className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
