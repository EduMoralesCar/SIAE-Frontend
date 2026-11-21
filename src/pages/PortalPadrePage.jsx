import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Calendar,
  FileCheck2,
  HeartPulse,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Paperclip,
} from 'lucide-react';
import api from '../api/client';
import { useActualizacionEnVivo } from '../context/SocketContext';
import CarnetQRCard from '../components/CarnetQRCard';
import SemaforoBadge from '../components/SemaforoBadge';
import GraficaAnilloAsistencia from '../components/GraficaAnilloAsistencia';
import { exportarActaPDF } from '../utils/exportadores';

function convertirArchivoABase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        nombre_original: file.name,
        mime_type: file.type || 'application/pdf',
        tamano_bytes: file.size,
        contenido_base64: reader.result,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PortalPadrePage() {
  const [hijos, setHijos] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [hijoActivoIdx, setHijoActivoIdx] = useState(0);
  const [tabActiva, setTabActiva] = useState('asistencia'); // 'asistencia' | 'permisos' | 'salud_retiros' | 'seguimiento'
  const [vistaAsistencia, setVistaAsistencia] = useState('calendario');
  const [cargando, setCargando] = useState(true);

  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  // Formulario Solicitud de Permiso (Sección 23)
  const [formPermiso, setFormPermiso] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    tipo: 'SALUD',
    descripcion: '',
  });
  const [archivoPermiso, setArchivoPermiso] = useState(null);
  const [enviandoPermiso, setEnviandoPermiso] = useState(false);

  // Formulario Autorización de Recojo por Tercero (Sección 29 y 30)
  const [formAutorizacion, setFormAutorizacion] = useState({
    persona_autorizada: '',
    parentesco: 'Tío',
    dni_persona: '',
    telefono_persona: '',
    tipo_autorizacion: 'UN_SOLO_USO',
    valido_desde: new Date().toISOString().slice(0, 10),
    valido_hasta: new Date().toISOString().slice(0, 10),
    hora_aproximada: '12:30',
    observaciones: '',
  });
  const [archivoAutorizacion, setArchivoAutorizacion] = useState(null);
  const [enviandoAutorizacion, setEnviandoAutorizacion] = useState(false);

  const cargarPortal = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const { data } = await api.get('/portal/padre');
      if (data.ok) {
        setHijos(data.hijos || []);
        setNotificaciones(data.notificaciones || []);
      }
    } catch {
      // Ignorar
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  useEffect(() => {
    cargarPortal(false);
  }, []);

  useActualizacionEnVivo(
    [
      'asistencia',
      'salud',
      'retiros',
      'permisos',
      'autorizaciones',
      'conducta',
      'citaciones',
      'reuniones',
      'actas',
      'compromisos',
      'academico',
      'carnets',
      'reportes',
    ],
    () => cargarPortal(true)
  );

  if (cargando) {
    return <div className="py-12 text-center text-slate-500 text-sm">Cargando portal...</div>;
  }

  const hijo = hijos[hijoActivoIdx] || null;

  if (!hijo) {
    return (
      <div className="p-6 bg-white rounded-lg border border-slate-200 text-center text-xs text-slate-600">
        No se encontraron estudiantes asociados a esta cuenta.
      </div>
    );
  }

  const hoy = hijo.asistenciaHoy;
  const resumen = hijo.resumenAsistencia || {};
  const asistenciasGenerales = (hijo.asistencias || []).filter(
    (a) => a.tipo_registro === 'GENERAL'
  );
  const situacionesSalud = hijo.situaciones_salud || [];
  const saludPendienteConfirmar = situacionesSalud.filter((s) => !s.confirmado_padre);

  // Calendario mensual
  const [anioStr, mesStr] = (hijo.fechaHoy || '2026-10-21').split('-');
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const primerDiaSemana = new Date(anio, mes - 1, 1).getDay();
  const offsetLunes = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

  const mapAsistenciaPorFecha = {};
  for (const a of asistenciasGenerales) {
    mapAsistenciaPorFecha[a.fecha] = a;
  }

  const celdasCalendario = [];
  for (let i = 0; i < offsetLunes; i++) {
    celdasCalendario.push(null);
  }
  for (let d = 1; d <= diasEnMes; d++) {
    const fechaIso = `${anioStr}-${mesStr}-${String(d).padStart(2, '0')}`;
    celdasCalendario.push({
      dia: d,
      fecha: fechaIso,
      registro: mapAsistenciaPorFecha[fechaIso] || null,
    });
  }

  const estiloDiaCalendario = (reg) => {
    if (!reg) return 'bg-slate-50 text-slate-400 border-slate-200';
    if (reg.estado === 'PRESENTE') return 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
    if (reg.estado === 'TARDANZA') return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
    if (reg.estado === 'FALTA') return 'bg-red-50 text-red-800 border-red-200 font-semibold';
    if (reg.estado === 'RETIRADO') return 'bg-purple-50 text-purple-800 border-purple-200 font-semibold';
    return 'bg-sky-50 text-sky-800 border-sky-200 font-semibold';
  };

  // Acciones del Padre
  const handleEnviarPermiso = async (e) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');
    setEnviandoPermiso(true);
    try {
      let evidenciaPayload = null;
      if (archivoPermiso) {
        evidenciaPayload = await convertirArchivoABase64(archivoPermiso);
      }
      const { data } = await api.post('/permisos', {
        estudiante_id: hijo.id,
        fecha: formPermiso.fecha,
        tipo: formPermiso.tipo,
        descripcion: formPermiso.descripcion,
        evidencia: evidenciaPayload,
      });
      setMensajeExito(data.mensaje);
      setFormPermiso((prev) => ({ ...prev, descripcion: '' }));
      setArchivoPermiso(null);
      await cargarPortal(true);
    } catch (err) {
      setMensajeError(err.response?.data?.mensaje || 'No se pudo enviar la solicitud de permiso.');
    } finally {
      setEnviandoPermiso(false);
    }
  };

  const handleConfirmarRecepcionSalud = async (saludId) => {
    setMensajeExito('');
    setMensajeError('');
    try {
      const { data } = await api.patch(`/salud/${saludId}/confirmar`);
      setMensajeExito(data.mensaje);
      await cargarPortal(true);
    } catch (err) {
      setMensajeError(err.response?.data?.mensaje || 'Error al confirmar la notificación.');
    }
  };

  const handleResponderCitacion = async (citId, respuesta) => {
    setMensajeExito('');
    setMensajeError('');
    let comentario = '';
    if (respuesta !== 'CONFIRMO_ASISTENCIA') {
      comentario =
        window.prompt('Indique el motivo o fecha sugerida para reprogramación:', '') || '';
    }
    try {
      const { data } = await api.patch(`/citaciones/${citId}/responder`, {
        respuesta_padre: respuesta,
        comentario_padre: comentario,
      });
      setMensajeExito(data.mensaje);
      await cargarPortal(true);
    } catch (err) {
      setMensajeError(err.response?.data?.mensaje || 'Error al responder la citación.');
    }
  };

  const handleAceptarActa = async (actaId) => {
    setMensajeExito('');
    setMensajeError('');
    try {
      const { data } = await api.patch(`/actas/${actaId}/aceptar`);
      setMensajeExito(data.mensaje);
      await cargarPortal(true);
    } catch (err) {
      setMensajeError(err.response?.data?.mensaje || 'Error al registrar conformidad del acta.');
    }
  };

  const handleCrearAutorizacionRecojo = async (e) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');
    setEnviandoAutorizacion(true);
    try {
      let evidenciaPayload = null;
      if (archivoAutorizacion) {
        evidenciaPayload = await convertirArchivoABase64(archivoAutorizacion);
      }
      const { data } = await api.post('/autorizaciones-recojo', {
        estudiante_id: hijo.id,
        ...formAutorizacion,
        evidencia: evidenciaPayload,
      });
      setMensajeExito(data.mensaje);
      setFormAutorizacion((prev) => ({
        ...prev,
        persona_autorizada: '',
        dni_persona: '',
        telefono_persona: '',
        observaciones: '',
      }));
      setArchivoAutorizacion(null);
      await cargarPortal(true);
    } catch (err) {
      setMensajeError(
        err.response?.data?.mensaje || 'No se pudo registrar la autorización de recojo.'
      );
    } finally {
      setEnviandoAutorizacion(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {hijo.usuario?.nombres} {hijo.usuario?.apellidos}
          </h1>
          <p className="text-xs text-slate-500">
            {hijo.grado_seccion?.grado}° &ldquo;{hijo.grado_seccion?.seccion}&rdquo; Secundaria ·
            Tutor(a): {hijo.grado_seccion?.tutor_docente?.nombres}{' '}
            {hijo.grado_seccion?.tutor_docente?.apellidos} · Código QR: {hijo.codigo_qr_unico}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hijos.length > 1 &&
            hijos.map((h, idx) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setHijoActivoIdx(idx)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                  idx === hijoActivoIdx
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {h.usuario?.nombres.split(' ')[0]} ({h.grado_seccion?.grado}°)
              </button>
            ))}

          <button
            type="button"
            onClick={() => cargarPortal(false)}
            className="p-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-600"
            title="Actualizar en tiempo real"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Alerta prioritaria si existe una situación de salud pendiente de confirmar (Sección 26 y 27) */}
      {saludPendienteConfirmar.map((sit) => (
        <div
          key={sit.id}
          className="p-4 rounded-lg bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-bold uppercase tracking-wide">
              Aviso de situación de salud ({sit.fecha} · {sit.hora})
            </p>
            <p>
              <strong>{sit.tipo_situacion}:</strong> {sit.descripcion}
            </p>
            <p className="text-[11px] opacity-80">
              Acción institucional: {sit.accion_realizada} · Responsable:{' '}
              {sit.registrado_por?.nombres} {sit.registrado_por?.apellidos}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleConfirmarRecepcionSalud(sit.id)}
            className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0 transition"
          >
            RECIBÍ LA NOTIFICACIÓN
          </button>
        </div>
      ))}

      {mensajeExito && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{mensajeExito}</span>
          <button
            type="button"
            onClick={() => setMensajeExito('')}
            className="font-semibold text-emerald-700"
          >
            ✕
          </button>
        </div>
      )}

      {mensajeError && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <span>{mensajeError}</span>
          <button
            type="button"
            onClick={() => setMensajeError('')}
            className="font-semibold text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Estado de hoy en tiempo real */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-slate-500 uppercase">
            Estado del día ({hijo.fechaHoy})
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">
            {!hoy
              ? 'Sin marcación de entrada hoy'
              : hoy.estado === 'PRESENTE'
                ? `En el colegio — Ingresó a las ${hoy.hora_entrada}`
                : hoy.estado === 'TARDANZA'
                  ? `En el colegio — Ingresó con tardanza a las ${hoy.hora_entrada} (+${hoy.minutos_tardanza} min)`
                  : hoy.estado === 'RETIRADO'
                    ? `Retirado de la jornada a las ${hoy.hora_salida} (${hoy.motivo_justificacion || 'Retiro registrado'})`
                    : hoy.estado === 'PERMISO'
                      ? `Con permiso aprobado (${hoy.motivo_justificacion || 'Permiso'})`
                      : hoy.estado === 'FALTA'
                        ? 'Falta injustificada registrada hoy'
                        : `Falta justificada (${hoy.motivo_justificacion})`}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingreso: {hoy?.hora_entrada || '--:--'} · Salida:{' '}
            {hoy?.hora_salida ? `Se retiró a las ${hoy.hora_salida}` : 'En jornada escolar'}
          </p>
        </div>

        <SemaforoBadge puntaje={hijo.puntaje_conducta} mostrarBarra={true} />
      </div>

      {/* Pestañas del Panel del Padre (Sección 57) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTabActiva('asistencia')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tabActiva === 'asistencia'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Asistencia y Fotocheck</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('permisos')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tabActiva === 'permisos'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Solicitar Permiso ({(hijo.solicitudes_permiso || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('salud_retiros')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tabActiva === 'salud_retiros'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>
            Salud, Autorización de Recojo y Retiros ({(hijo.autorizaciones_recojo || []).length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('seguimiento')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tabActiva === 'seguimiento'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>
            Incidencias, Citaciones, Actas y Compromisos ({(hijo.citaciones || []).length})
          </span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: ASISTENCIA, ACTIVIDADES Y FOTOCHECK QR                         */}
      {/* ===================================================================== */}
      {tabActiva === 'asistencia' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                  Asistencia ({resumen.porcentajeAsistencia}%)
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setVistaAsistencia('calendario')}
                    className={`px-2.5 py-1 rounded text-xs font-medium ${
                      vistaAsistencia === 'calendario'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Calendario
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaAsistencia('lista')}
                    className={`px-2.5 py-1 rounded text-xs font-medium ${
                      vistaAsistencia === 'lista'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Lista
                  </button>
                </div>
              </div>

              <GraficaAnilloAsistencia resumen={resumen} />

              <div className="grid grid-cols-5 gap-2 text-center mb-4">
                <div className="p-2 rounded-md border border-slate-200">
                  <p className="text-base font-semibold text-emerald-700">{resumen.presentes}</p>
                  <p className="text-[10px] text-slate-500">Presentes</p>
                </div>
                <div className="p-2 rounded-md border border-slate-200">
                  <p className="text-base font-semibold text-amber-600">{resumen.tardanzas}</p>
                  <p className="text-[10px] text-slate-500">Tardanzas</p>
                </div>
                <div className="p-2 rounded-md border border-slate-200">
                  <p className="text-base font-semibold text-red-600">{resumen.faltas}</p>
                  <p className="text-[10px] text-slate-500">Faltas</p>
                </div>
                <div className="p-2 rounded-md border border-slate-200">
                  <p className="text-base font-semibold text-sky-700">{resumen.justificados}</p>
                  <p className="text-[10px] text-slate-500">Justif./Perm.</p>
                </div>
                <div className="p-2 rounded-md border border-slate-200">
                  <p className="text-base font-semibold text-purple-700">{resumen.retirados || 0}</p>
                  <p className="text-[10px] text-slate-500">Retiros</p>
                </div>
              </div>

              {vistaAsistencia === 'calendario' ? (
                <div>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-slate-400 uppercase mb-1.5">
                    <div>Lun</div>
                    <div>Mar</div>
                    <div>Mié</div>
                    <div>Jue</div>
                    <div>Vie</div>
                    <div>Sáb</div>
                    <div>Dom</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {celdasCalendario.map((celda, i) =>
                      !celda ? (
                        <div key={`empty-${i}`} className="h-10 rounded border border-transparent" />
                      ) : (
                        <div
                          key={celda.fecha}
                          title={
                            celda.registro
                              ? `${celda.fecha}: ${celda.registro.estado} (${celda.registro.hora_entrada || '--:--'})`
                              : celda.fecha
                          }
                          className={`h-10 rounded border flex flex-col items-center justify-center text-xs ${estiloDiaCalendario(
                            celda.registro
                          )}`}
                        >
                          <span>{celda.dia}</span>
                          {celda.registro && (
                            <span className="text-[9px] leading-none mt-0.5">
                              {celda.registro.estado.slice(0, 4)}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {asistenciasGenerales.slice(0, 20).map((a) => (
                    <div key={a.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-slate-700 mr-2">{a.fecha}</span>
                        <span className="text-slate-500">
                          {a.hora_entrada || '--:--'} / {a.hora_salida || '--:--'}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-slate-700">{a.estado}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3">
                Actividades y calificaciones
              </h3>

              <div className="divide-y divide-slate-100">
                {(hijo.calificaciones || []).map((cal) => (
                  <div
                    key={cal.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="text-[11px] text-slate-500">
                        {cal.actividad?.curso_nombre} · Entrega: {cal.actividad?.fecha_entrega}
                      </span>
                      <p className="font-medium text-slate-900">{cal.actividad?.titulo_actividad}</p>
                      {cal.observacion && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{cal.observacion}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          cal.estado_entrega === 'ENTREGADO'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : cal.estado_entrega === 'PENDIENTE'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {cal.estado_entrega}
                      </span>
                      <p className="font-semibold text-slate-900 mt-1">
                        Nota: {cal.nota !== null ? cal.nota : '--'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col items-center">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3 self-start">
                Fotocheck escolar QR
              </h3>
              <CarnetQRCard estudiante={hijo} mostrarBotones={true} />
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3">
                Notificaciones ({notificaciones.length})
              </h3>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {notificaciones.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin notificaciones recientes.</p>
                ) : (
                  notificaciones.map((n) => (
                    <div key={n.id} className="py-2.5 text-xs">
                      <p className="font-medium text-slate-900">{n.titulo}</p>
                      <p className="text-slate-500 mt-0.5">{n.mensaje}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: SOLICITUDES DE PERMISO Y EVIDENCIA (Secciones 23 y 24)         */}
      {/* ===================================================================== */}
      {tabActiva === 'permisos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3">
              Nueva solicitud de permiso para {hijo.usuario?.nombres}
            </h3>

            <form onSubmit={handleEnviarPermiso} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fecha del permiso
                  </label>
                  <input
                    type="date"
                    value={formPermiso.fecha}
                    onChange={(e) => setFormPermiso({ ...formPermiso, fecha: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={formPermiso.tipo}
                    onChange={(e) => setFormPermiso({ ...formPermiso, tipo: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  >
                    <option value="SALUD">Salud</option>
                    <option value="CITA_MEDICA">Cita médica</option>
                    <option value="MOTIVO_FAMILIAR">Motivo familiar</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Descripción detallada
                </label>
                <textarea
                  rows={3}
                  placeholder="Explique el motivo del permiso..."
                  value={formPermiso.descripcion}
                  onChange={(e) => setFormPermiso({ ...formPermiso, descripcion: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Adjuntar evidencia (constancia médica, receta o documento PDF/imagen)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setArchivoPermiso(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600"
                />
              </div>

              <button
                type="submit"
                disabled={enviandoPermiso}
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
              >
                {enviandoPermiso ? 'Enviando solicitud...' : 'Enviar solicitud de permiso'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Historial de solicitudes de permiso ({(hijo.solicitudes_permiso || []).length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {(hijo.solicitudes_permiso || []).length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-400">
                  No ha registrado solicitudes de permiso.
                </p>
              ) : (
                hijo.solicitudes_permiso.map((p) => (
                  <div key={p.id} className="p-4 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800">{p.fecha}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold">
                          {p.tipo}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          p.estado === 'APROBADO'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.estado === 'RECHAZADO'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {p.estado}
                      </span>
                    </div>

                    <p className="text-slate-700">{p.descripcion}</p>

                    {p.respuesta_revision && (
                      <p className="text-[11px] text-slate-500">
                        Respuesta de la institución: {p.respuesta_revision}
                      </p>
                    )}

                    {p.evidencias?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {p.evidencias.map((ev) => (
                          <span
                            key={ev.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-600"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{ev.archivo?.nombre_original}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SALUD, AUTORIZACIÓN DE RECOJO POR TERCERO Y RETIROS            */}
      {/* ===================================================================== */}
      {tabActiva === 'salud_retiros' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-1">
              Autorizar a otra persona para recoger a {hijo.usuario?.nombres}
            </h3>
            <p className="text-[11px] text-slate-500 mb-4">
              Si usted no puede acudir, registre los datos del familiar o apoderado autorizado para que sea verificado en portería
            </p>

            <form onSubmit={handleCrearAutorizacionRecojo} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombres y apellidos de la persona autorizada
                </label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez García"
                  value={formAutorizacion.persona_autorizada}
                  onChange={(e) =>
                    setFormAutorizacion({
                      ...formAutorizacion,
                      persona_autorizada: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Parentesco / Relación
                  </label>
                  <input
                    type="text"
                    placeholder="Tío, Abuela, Hermano..."
                    value={formAutorizacion.parentesco}
                    onChange={(e) =>
                      setFormAutorizacion({ ...formAutorizacion, parentesco: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    DNI de la persona
                  </label>
                  <input
                    type="text"
                    placeholder="8 dígitos"
                    value={formAutorizacion.dni_persona}
                    onChange={(e) =>
                      setFormAutorizacion({ ...formAutorizacion, dni_persona: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="999888777"
                    value={formAutorizacion.telefono_persona}
                    onChange={(e) =>
                      setFormAutorizacion({
                        ...formAutorizacion,
                        telefono_persona: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tipo de autorización
                  </label>
                  <select
                    value={formAutorizacion.tipo_autorizacion}
                    onChange={(e) =>
                      setFormAutorizacion({
                        ...formAutorizacion,
                        tipo_autorizacion: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  >
                    <option value="UN_SOLO_USO">De un solo uso</option>
                    <option value="FECHA_ESPECIFICA">Fecha específica</option>
                    <option value="TEMPORAL">Temporal</option>
                    <option value="PERMANENTE">Permanente (todo el año)</option>
                    <option value="EMERGENCIA">Emergencia</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fecha desde
                  </label>
                  <input
                    type="date"
                    value={formAutorizacion.valido_desde}
                    onChange={(e) =>
                      setFormAutorizacion({ ...formAutorizacion, valido_desde: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fecha hasta
                  </label>
                  <input
                    type="date"
                    value={formAutorizacion.valido_hasta}
                    onChange={(e) =>
                      setFormAutorizacion({ ...formAutorizacion, valido_hasta: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Evidencia o documento de autorización (opcional)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setArchivoAutorizacion(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600"
                />
              </div>

              <button
                type="submit"
                disabled={enviandoAutorizacion}
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
              >
                {enviandoAutorizacion ? 'Registrando...' : 'Registrar autorización de recojo'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {/* Situaciones de Salud del Estudiante */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                  Situaciones de salud durante la jornada ({situacionesSalud.length})
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {situacionesSalud.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-400">
                    Sin situaciones de salud registradas.
                  </p>
                ) : (
                  situacionesSalud.map((sit) => (
                    <div key={sit.id} className="p-4 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {sit.tipo_situacion} — {sit.fecha} ({sit.hora})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold">
                          {sit.estado}
                        </span>
                      </div>
                      <p className="text-slate-700">{sit.descripcion}</p>
                      <p className="text-[11px] text-slate-500">
                        Acción: {sit.accion_realizada}
                      </p>
                      <div className="pt-1 flex items-center justify-between">
                        {sit.confirmado_padre ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              Confirmado el{' '}
                              {new Date(sit.fecha_confirmacion_padre).toLocaleString('es-PE')}
                            </span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConfirmarRecepcionSalud(sit.id)}
                            className="px-3 py-1 rounded bg-slate-900 text-white text-[11px] font-medium"
                          >
                            RECIBÍ LA NOTIFICACIÓN
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Personas Autorizadas e Historial de Retiros */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                  Personas autorizadas para recojo ({(hijo.autorizaciones_recojo || []).length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {(hijo.autorizaciones_recojo || []).map((aut) => (
                  <div
                    key={aut.id}
                    className="p-3.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {aut.persona_autorizada} ({aut.parentesco})
                      </p>
                      <p className="text-[11px] text-slate-500">
                        DNI {aut.dni_persona} · {aut.tipo_autorizacion} ({aut.valido_desde} al{' '}
                        {aut.valido_hasta})
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        aut.estado === 'APROBADO'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {aut.estado}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                  Historial de retiros ({(hijo.retiros || []).length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {(hijo.retiros || []).length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-400">
                    Sin retiros registrados durante la jornada.
                  </p>
                ) : (
                  hijo.retiros.map((ret) => (
                    <div key={ret.id} className="p-3.5 text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {ret.fecha} — Salida: {ret.hora_salida}
                        </span>
                        <span className="text-slate-500">{ret.motivo}</span>
                      </div>
                      <p className="text-slate-600">
                        Recogido por: <strong>{ret.recogido_por_nombre}</strong> ({ret.parentesco},{' '}
                        {ret.documento_verificado} {ret.recogido_por_dni})
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: INCIDENCIAS, CITACIONES, ACTAS Y COMPROMISOS                   */}
      {/* ===================================================================== */}
      {tabActiva === 'seguimiento' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                  Citaciones a Padre de Familia ({(hijo.citaciones || []).length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {(hijo.citaciones || []).length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-400">
                    No tiene citaciones programadas.
                  </p>
                ) : (
                  hijo.citaciones.map((cit) => (
                    <div key={cit.id} className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {cit.fecha_programada} a las {cit.hora_programada}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            cit.estado === 'CONFIRMADA' || cit.estado === 'ATENDIDA'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {cit.estado}
                        </span>
                      </div>
                      <p className="text-slate-700">{cit.motivo}</p>
                      <p className="text-[11px] text-slate-500">
                        Lugar: {cit.lugar} · Atenderá: {cit.responsable?.nombres}{' '}
                        {cit.responsable?.apellidos} ({cit.rol_responsable})
                      </p>

                      {cit.respuesta_padre && (
                        <p className="text-[11px] text-emerald-700 font-medium">
                          Respuesta enviada: {cit.respuesta_padre.replace(/_/g, ' ')}
                          {cit.comentario_padre ? ` (${cit.comentario_padre})` : ''}
                        </p>
                      )}

                      {cit.estado !== 'ATENDIDA' && (
                        <div className="pt-1.5 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleResponderCitacion(cit.id, 'CONFIRMO_ASISTENCIA')}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium"
                          >
                            Confirmo asistencia
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleResponderCitacion(cit.id, 'SOLICITO_REPROGRAMACION')
                            }
                            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium"
                          >
                            Solicito reprogramación
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResponderCitacion(cit.id, 'NO_PUEDO_ASISTIR')}
                            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium"
                          >
                            No puedo asistir
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                  Incidencias registradas ({(hijo.incidencias || []).length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {(hijo.incidencias || []).map((inc) => (
                  <div key={inc.id} className="p-4 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {inc.codigo || `#${inc.id}`} · {inc.naturaleza || inc.tipo} ({inc.gravedad})
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                        {inc.estado}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800">{inc.categoria}</p>
                    <p className="text-slate-600">{inc.descripcion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                  Actas institucionales ({(hijo.actas || []).length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {(hijo.actas || []).length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-400">Sin actas registradas.</p>
                ) : (
                  hijo.actas.map((acta) => (
                    <div key={acta.id} className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {acta.codigo} — Acta de {acta.tipo}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            acta.aceptado_padre
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {acta.aceptado_padre ? 'Aceptada / Firmada' : 'Pendiente de firma'}
                        </span>
                      </div>
                      <p className="font-medium text-slate-800">{acta.motivo}</p>
                      <p className="text-slate-600">{acta.contenido}</p>

                      <div className="pt-1.5 flex items-center justify-end gap-2">
                        {!acta.aceptado_padre && (
                          <button
                            type="button"
                            onClick={() => handleAceptarActa(acta.id)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium"
                          >
                            Confirmar aceptación / Toma de conocimiento
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            exportarActaPDF({
                              ...acta,
                              estudiante: {
                                usuario: hijo.usuario,
                                grado_seccion: hijo.grado_seccion,
                              },
                            })
                          }
                          className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium"
                        >
                          Descargar PDF
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                  Compromisos y seguimiento ({(hijo.compromisos || []).length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {(hijo.compromisos || []).length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-400">
                    Sin compromisos registrados.
                  </p>
                ) : (
                  hijo.compromisos.map((cmp) => (
                    <div key={cmp.id} className="p-4 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {cmp.codigo} · Seguimiento: {cmp.fecha_seguimiento}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold">
                          {cmp.estado}
                        </span>
                      </div>
                      <p className="text-slate-700">{cmp.descripcion}</p>
                      <p className="text-[11px] text-slate-500">
                        Responsable: {cmp.responsable_compromiso}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
