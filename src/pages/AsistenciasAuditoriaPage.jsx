import React, { useEffect, useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useActualizacionEnVivo } from '../context/SocketContext';
import SelectorEstudiante from '../components/SelectorEstudiante';

export default function AsistenciasAuditoriaPage() {
  const { usuario } = useAuth();
  const puedeEliminar = usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR';
  const [asistencias, setAsistencias] = useState([]);
  const [auditorias, setAuditorias] = useState([]);
  const [grados, setGrados] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [gradoSeccionId, setGradoSeccionId] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [cargando, setCargando] = useState(true);

  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
  const [modoManualNuevo, setModoManualNuevo] = useState(false);
  const [estudianteManualId, setEstudianteManualId] = useState('');
  const [fechaManual, setFechaManual] = useState(new Date().toISOString().slice(0, 10));
  const [estadoNuevo, setEstadoNuevo] = useState('JUSTIFICADO');
  const [motivoCambio, setMotivoCambio] = useState('');
  const [evidenciaUrl, setEvidenciaUrl] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const [resAsis, resAud, resGrados, resEst] = await Promise.all([
        api.get('/asistencias', {
          params: {
            fecha: fechaFiltro || undefined,
            grado_seccion_id: gradoSeccionId || undefined,
            estado: estadoFiltro || undefined,
          },
        }),
        api.get('/auditoria'),
        api.get('/grados-secciones'),
        api.get('/estudiantes'),
      ]);
      if (resAsis.data?.asistencias) setAsistencias(resAsis.data.asistencias);
      if (resAud.data?.auditorias) setAuditorias(resAud.data.auditorias);
      if (resGrados.data?.grados) setGrados(resGrados.data.grados);
      if (resEst.data?.estudiantes) {
        setEstudiantes(resEst.data.estudiantes);
        if (!estudianteManualId && resEst.data.estudiantes.length > 0) {
          setEstudianteManualId(String(resEst.data.estudiantes[0].id));
        }
      }
    } catch {
      // Ignorar
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos(false);
  }, [fechaFiltro, gradoSeccionId, estadoFiltro]);

  useActualizacionEnVivo(['asistencia', 'permisos', 'retiros'], () => cargarDatos(true));

  const abrirModalJustificar = (reg) => {
    setModoManualNuevo(false);
    setRegistroSeleccionado(reg);
    setEstadoNuevo('JUSTIFICADO');
    setMotivoCambio(reg.motivo_justificacion || '');
    setEvidenciaUrl(reg.evidencia_url || '');
  };

  const abrirModalManualNuevo = () => {
    setRegistroSeleccionado(null);
    setModoManualNuevo(true);
    setEstadoNuevo('JUSTIFICADO');
    setMotivoCambio('');
    setEvidenciaUrl('');
  };

  const cerrarModal = () => {
    setRegistroSeleccionado(null);
    setModoManualNuevo(false);
  };

  const handleGuardarJustificacion = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (modoManualNuevo) {
        await api.post('/asistencias/justificar', {
          estudiante_id: Number(estudianteManualId),
          fecha: fechaManual,
          estado_nuevo: estadoNuevo,
          motivo_cambio: motivoCambio,
          evidencia_url: evidenciaUrl || null,
        });
      } else if (registroSeleccionado) {
        await api.put(`/asistencias/${registroSeleccionado.id}`, {
          estado_nuevo: estadoNuevo,
          motivo_cambio: motivoCambio,
          evidencia_url: evidenciaUrl || null,
        });
      }
      cerrarModal();
      await cargarDatos();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al registrar la justificación.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarRegistro = async (reg) => {
    const nombreEst = `${reg.estudiante?.usuario?.apellidos || ''}, ${reg.estudiante?.usuario?.nombres || ''}`.trim();
    const motivo = window.prompt(
      `¿Eliminar el registro de asistencia del ${reg.fecha} (${reg.estado}) de ${nombreEst}?\n\nIngresa el motivo de eliminación (quedará registrado en auditoría):`,
      'Registro duplicado o cargado por error'
    );
    if (motivo === null) return;
    try {
      await api.delete(`/asistencias/${reg.id}`, {
        params: { motivo: motivo.trim() || 'Eliminación administrativa de registro' },
      });
      await cargarDatos();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'No se pudo eliminar el registro de asistencia.');
    }
  };

  const badgeEstado = (estado) => {
    if (estado === 'PRESENTE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (estado === 'TARDANZA') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (estado === 'FALTA') return 'bg-red-50 text-red-700 border-red-200';
    if (estado === 'PERMISO' || estado === 'JUSTIFICADO')
      return 'bg-sky-50 text-sky-700 border-sky-200';
    if (estado === 'RETIRADO') return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Asistencias y justificaciones</h1>
          <p className="text-xs text-slate-500">Registro diario y auditoría de modificaciones</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs"
          />
          <select
            value={gradoSeccionId}
            onChange={(e) => setGradoSeccionId(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs"
          >
            <option value="">Todas las secciones</option>
            {grados.map((g) => (
              <option key={g.id} value={g.id}>
                {g.grado}° &ldquo;{g.seccion}&rdquo;
              </option>
            ))}
          </select>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs"
          >
            <option value="">Todos los estados</option>
            <option value="FALTA">Falta</option>
            <option value="TARDANZA">Tardanza</option>
            <option value="JUSTIFICADO">Falta justificada</option>
            <option value="PERMISO">Permiso</option>
            <option value="RETIRADO">Retirado</option>
            <option value="PRESENTE">Presente</option>
          </select>

          <button
            type="button"
            onClick={abrirModalManualNuevo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registro manual</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
            Registros ({asistencias.length})
          </h2>
        </div>

        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="py-2.5 px-4 font-medium">Fecha</th>
                <th className="py-2.5 px-4 font-medium">Estudiante</th>
                <th className="py-2.5 px-3 font-medium">Sección</th>
                <th className="py-2.5 px-3 font-medium">Horario</th>
                <th className="py-2.5 px-3 font-medium">Estado</th>
                <th className="py-2.5 px-4 font-medium">Observación</th>
                <th className="py-2.5 px-4 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : (
                asistencias.slice(0, 120).map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-slate-600">{reg.fecha}</td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">
                        {reg.estudiante?.usuario?.apellidos}, {reg.estudiante?.usuario?.nombres}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        DNI {reg.estudiante?.usuario?.dni}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {reg.estudiante?.grado_seccion?.grado}° &ldquo;
                      {reg.estudiante?.grado_seccion?.seccion}&rdquo;
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {reg.hora_entrada || '--:--'} / {reg.hora_salida || '--:--'}
                      {reg.minutos_tardanza > 0 && (
                        <span className="ml-1 text-[10px] text-amber-700">
                          (+{reg.minutos_tardanza}m)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border ${badgeEstado(
                          reg.estado
                        )}`}
                      >
                        {reg.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">
                      {reg.motivo_justificacion || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => abrirModalJustificar(reg)}
                          className="px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium transition"
                        >
                          Modificar
                        </button>
                        {puedeEliminar && (
                          <button
                            type="button"
                            onClick={() => handleEliminarRegistro(reg)}
                            title="Eliminar registro (auditado)"
                            className="p-1.5 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
            Registro de auditoría ({auditorias.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-medium">Fecha de cambio</th>
                <th className="py-2.5 px-4 font-medium">Fecha asistencia</th>
                <th className="py-2.5 px-4 font-medium">Estudiante</th>
                <th className="py-2.5 px-4 font-medium">Cambio</th>
                <th className="py-2.5 px-4 font-medium">Responsable</th>
                <th className="py-2.5 px-4 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditorias.map((aud) => (
                <tr key={aud.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono text-slate-500">
                    {new Date(aud.fecha_hora_cambio).toLocaleString('es-PE')}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-700">{aud.asistencia?.fecha}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">
                    {aud.asistencia?.estudiante?.usuario?.apellidos},{' '}
                    {aud.asistencia?.estudiante?.usuario?.nombres}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">
                    {aud.estado_anterior} &rarr; {aud.estado_nuevo}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {aud.modificado_por?.nombres} {aud.modificado_por?.apellidos}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    <p>{aud.motivo_cambio}</p>
                    {aud.evidencia_url && (
                      <a
                        href={aud.evidencia_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-slate-900 underline mt-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Evidencia</span>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(registroSeleccionado || modoManualNuevo) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-lg shadow-lg border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                {modoManualNuevo ? 'Registro manual de asistencia' : 'Modificar asistencia'}
              </h3>
              {registroSeleccionado && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {registroSeleccionado.estudiante?.usuario?.nombres}{' '}
                  {registroSeleccionado.estudiante?.usuario?.apellidos} (
                  {registroSeleccionado.fecha})
                </p>
              )}
            </div>

            <form onSubmit={handleGuardarJustificacion} className="p-5 space-y-4">
              {modoManualNuevo && (
                <>
                  <SelectorEstudiante
                    estudiantes={estudiantes}
                    value={estudianteManualId}
                    onChange={(val) => setEstudianteManualId(val)}
                  />

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={fechaManual}
                      onChange={(e) => setFechaManual(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                <select
                  value={estadoNuevo}
                  onChange={(e) => setEstadoNuevo(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                >
                  <option value="JUSTIFICADO">Falta justificada</option>
                  <option value="PERMISO">Permiso</option>
                  <option value="RETIRADO">Retirado</option>
                  <option value="PRESENTE">Presente</option>
                  <option value="TARDANZA">Tardanza</option>
                  <option value="FALTA">Falta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Motivo o documento de sustento
                </label>
                <textarea
                  rows={3}
                  value={motivoCambio}
                  onChange={(e) => setMotivoCambio(e.target.value)}
                  placeholder="Indique el motivo..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Enlace de evidencia (opcional)
                </label>
                <input
                  type="text"
                  value={evidenciaUrl}
                  onChange={(e) => setEvidenciaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
