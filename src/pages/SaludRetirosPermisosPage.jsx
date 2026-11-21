import React, { useEffect, useState } from 'react';
import {
  HeartPulse,
  UserCheck,
  ShieldCheck,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Paperclip,
  Download,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useActualizacionEnVivo } from '../context/SocketContext';
import SelectorEstudiante from '../components/SelectorEstudiante';

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

export default function SaludRetirosPermisosPage() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState('salud');

  const [estudiantes, setEstudiantes] = useState([]);
  const [situacionesSalud, setSituacionesSalud] = useState([]);
  const [retiros, setRetiros] = useState([]);
  const [autorizaciones, setAutorizaciones] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Formulario 1: Situación de salud (Sección 25)
  const [formSalud, setFormSalud] = useState({
    estudiante_id: '',
    tipo_situacion: 'MALESTAR',
    descripcion: '',
    accion_realizada: 'Atención en tópico escolar y comunicación al padre o apoderado.',
    requiere_recojo: true,
  });

  // Formulario 2: Retiro del estudiante (Sección 28 y 31)
  const [formRetiro, setFormRetiro] = useState({
    estudiante_id: '',
    motivo: 'Situación de salud',
    modalidad_recojo: 'PADRE_TITULAR',
    autorizacion_id: '',
    situacion_salud_id: '',
    recogido_por_nombre: '',
    recogido_por_dni: '',
    parentesco: 'Padre',
    documento_verificado: 'DNI',
    observaciones: '',
  });

  // Formulario 3: Autorización de tercero (Sección 30)
  const [formAutorizacion, setFormAutorizacion] = useState({
    estudiante_id: '',
    persona_autorizada: '',
    parentesco: 'Tío',
    dni_persona: '',
    telefono_persona: '',
    tipo_autorizacion: 'UN_SOLO_USO',
    valido_desde: new Date().toISOString().slice(0, 10),
    valido_hasta: new Date().toISOString().slice(0, 10),
    hora_aproximada: '12:00',
    observaciones: '',
  });
  const [archivoAutorizacion, setArchivoAutorizacion] = useState(null);

  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  const cargarDatos = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const resEst = await api.get('/estudiantes');
      const lista = resEst.data?.estudiantes || [];
      if (lista.length > 0) {
        setEstudiantes(lista);
        const primero = lista[0];
        setFormSalud((prev) => ({
          ...prev,
          estudiante_id: prev.estudiante_id || String(primero.id),
        }));
        setFormAutorizacion((prev) => ({
          ...prev,
          estudiante_id: prev.estudiante_id || String(primero.id),
        }));
      }

      if (tab === 'salud') {
        const resSal = await api.get('/salud');
        if (resSal.data?.situaciones) setSituacionesSalud(resSal.data.situaciones);
      } else if (tab === 'retiros') {
        const [resRet, resAut] = await Promise.all([
          api.get('/retiros'),
          api.get('/autorizaciones-recojo'),
        ]);
        if (resRet.data?.retiros) setRetiros(resRet.data.retiros);
        if (resAut.data?.autorizaciones) {
          setAutorizaciones(resAut.data.autorizaciones);
          if (!formRetiro.estudiante_id && lista.length > 0) {
            seleccionarEstudianteParaRetiro(
              String(lista[0].id),
              lista,
              resAut.data.autorizaciones
            );
          }
        }
      } else if (tab === 'autorizaciones') {
        const resAut = await api.get('/autorizaciones-recojo');
        if (resAut.data?.autorizaciones) setAutorizaciones(resAut.data.autorizaciones);
      } else if (tab === 'permisos') {
        const resPer = await api.get('/permisos');
        if (resPer.data?.permisos) setPermisos(resPer.data.permisos);
      }
    } catch {
      // Ignorar
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos(false);
  }, [tab]);

  useActualizacionEnVivo(['salud', 'retiros', 'permisos', 'autorizaciones', 'asistencia'], () =>
    cargarDatos(true)
  );

  const seleccionarEstudianteParaRetiro = (estId, listaEst = estudiantes, listaAut = autorizaciones) => {
    const est = listaEst.find((e) => String(e.id) === String(estId));
    const primerPadre = est?.padres?.[0]?.padre;
    const parentescoPadre = est?.padres?.[0]?.parentesco || 'Padre';

    setFormRetiro((prev) => ({
      ...prev,
      estudiante_id: String(estId),
      modalidad_recojo: 'PADRE_TITULAR',
      autorizacion_id: '',
      recogido_por_nombre: primerPadre ? `${primerPadre.nombres} ${primerPadre.apellidos}` : '',
      recogido_por_dni: primerPadre ? primerPadre.dni : '',
      parentesco: parentescoPadre === 'MADRE' ? 'Madre' : 'Padre',
    }));
  };

  const handleRegistrarSalud = async (e) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');
    try {
      const { data } = await api.post('/salud', formSalud);
      setMensajeExito(data.mensaje);
      setFormSalud((prev) => ({ ...prev, descripcion: '' }));
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.response?.data?.mensaje || 'Error al registrar situación de salud.');
    }
  };

  const handleConfirmarSalud = async (id) => {
    try {
      await api.patch(`/salud/${id}/confirmar`);
      await cargarDatos();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al confirmar recepción.');
    }
  };

  const prepararRetiroDesdeSalud = (sit) => {
    setTab('retiros');
    const est = estudiantes.find((e) => e.id === sit.estudiante_id);
    const primerPadre = est?.padres?.[0]?.padre;
    setFormRetiro({
      estudiante_id: String(sit.estudiante_id),
      motivo: `Situación de salud (${sit.tipo_situacion})`,
      modalidad_recojo: 'PADRE_TITULAR',
      autorizacion_id: '',
      situacion_salud_id: String(sit.id),
      recogido_por_nombre: primerPadre ? `${primerPadre.nombres} ${primerPadre.apellidos}` : '',
      recogido_por_dni: primerPadre ? primerPadre.dni : '',
      parentesco: 'Padre',
      documento_verificado: 'DNI',
      observaciones: `Retiro derivado de atención en tópico a las ${sit.hora}.`,
    });
  };

  const handleRegistrarRetiro = async (e) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');
    try {
      const { data } = await api.post('/retiros', formRetiro);
      setMensajeExito(data.mensaje);
      setFormRetiro((prev) => ({
        ...prev,
        situacion_salud_id: '',
        observaciones: '',
      }));
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.response?.data?.mensaje || 'Error al registrar retiro del estudiante.');
    }
  };

  const handleCrearAutorizacion = async (e) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');
    try {
      let evidenciaPayload = null;
      if (archivoAutorizacion) {
        evidenciaPayload = await convertirArchivoABase64(archivoAutorizacion);
      }
      const { data } = await api.post('/autorizaciones-recojo', {
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
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.response?.data?.mensaje || 'Error al registrar autorización de recojo.');
    }
  };

  const handleRevisarPermiso = async (id, nuevoEstado) => {
    const comentario = window.prompt(
      `Observación para marcar la solicitud como ${nuevoEstado}:`,
      nuevoEstado === 'APROBADO'
        ? 'Permiso aprobado conforme a evidencia presentada.'
        : 'Solicitud observada por falta de sustento.'
    );
    if (comentario === null) return;

    try {
      const { data } = await api.patch(`/permisos/${id}/revisar`, {
        estado: nuevoEstado,
        respuesta_revision: comentario,
      });
      setMensajeExito(data.mensaje);
      await cargarDatos();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'No se pudo procesar la solicitud.');
    }
  };

  const estudianteSeleccionadoRetiro = estudiantes.find(
    (e) => String(e.id) === String(formRetiro.estudiante_id)
  );
  const autorizacionesActivasEstudiante = autorizaciones.filter(
    (a) =>
      String(a.estudiante_id) === String(formRetiro.estudiante_id) && a.estado === 'APROBADO'
  );

  const puedeAprobarPermisos = ['ADMIN', 'DIRECTOR', 'TUTOR'].includes(usuario?.rol);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Salud en jornada, retiros, autorizaciones de recojo y permisos
          </h1>
          <p className="text-xs text-slate-500">
            Registro de malestares, confirmación del padre, verificación de identidad para retiro y aprobación de permisos
          </p>
        </div>
      </div>

      {mensajeExito && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{mensajeExito}</span>
          <button
            type="button"
            onClick={() => setMensajeExito('')}
            className="text-emerald-700 font-semibold"
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
            className="text-red-700 font-semibold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pestañas de navegación del módulo */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTab('salud')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'salud'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>Situaciones de Salud ({situacionesSalud.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('retiros')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'retiros'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Retiro de Estudiantes ({retiros.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('autorizaciones')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'autorizaciones'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Autorizaciones de Recojo ({autorizaciones.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('permisos')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'permisos'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>
            Solicitudes de Permiso ({permisos.filter((p) => p.estado === 'PENDIENTE').length} pend.)
          </span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SITUACIONES DE SALUD DURANTE LA JORNADA (Secciones 25, 26, 27) */}
      {/* ===================================================================== */}
      {tab === 'salud' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-5 rounded-lg border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-4">
              Registrar situación de salud
            </h2>

            <form onSubmit={handleRegistrarSalud} className="space-y-3">
              <SelectorEstudiante
                estudiantes={estudiantes}
                value={formSalud.estudiante_id}
                onChange={(val) => setFormSalud({ ...formSalud, estudiante_id: val })}
              />

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tipo de situación
                </label>
                <select
                  value={formSalud.tipo_situacion}
                  onChange={(e) => setFormSalud({ ...formSalud, tipo_situacion: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                >
                  <option value="MALESTAR">Malestar general</option>
                  <option value="FIEBRE">Fiebre</option>
                  <option value="DOLOR">Dolor agudo (cefalea / estomacal)</option>
                  <option value="ACCIDENTE">Accidente / lesión en plantel</option>
                  <option value="SINTOMAS">Síntomas respiratorios / otros</option>
                  <option value="OTRO">Otra situación que requiere atención</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Descripción de lo ocurrido
                </label>
                <textarea
                  rows={3}
                  value={formSalud.descripcion}
                  onChange={(e) => setFormSalud({ ...formSalud, descripcion: e.target.value })}
                  placeholder="Ej. El estudiante presentó malestar y fiebre de 38 °C durante la jornada..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Acción realizada
                </label>
                <input
                  type="text"
                  value={formSalud.accion_realizada}
                  onChange={(e) => setFormSalud({ ...formSalud, accion_realizada: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={formSalud.requiere_recojo}
                  onChange={(e) =>
                    setFormSalud({ ...formSalud, requiere_recojo: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
                <span>Requiere retiro del estudiante (notificar recojo al padre)</span>
              </label>

              <button
                type="submit"
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
              >
                Registrar y notificar al padre
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Situaciones de salud registradas ({situacionesSalud.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
              {cargando ? (
                <p className="p-8 text-center text-xs text-slate-400">Cargando...</p>
              ) : situacionesSalud.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-400">
                  No hay situaciones de salud registradas.
                </p>
              ) : (
                situacionesSalud.map((sit) => (
                  <div key={sit.id} className="p-4 hover:bg-slate-50 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900">
                          {sit.estudiante?.usuario?.apellidos}, {sit.estudiante?.usuario?.nombres}
                        </span>
                        <span className="ml-2 text-slate-500">
                          ({sit.estudiante?.grado_seccion?.grado}° &ldquo;
                          {sit.estudiante?.grado_seccion?.seccion}&rdquo;)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-500">
                          {sit.fecha} · {sit.hora}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            sit.estado === 'RETIRADO'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : sit.estado === 'PADRE_CONFIRMADO'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {sit.estado}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-700">
                      <span className="font-semibold">[{sit.tipo_situacion}]</span>{' '}
                      {sit.descripcion}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Acción: {sit.accion_realizada} · Registrado por:{' '}
                      {sit.registrado_por?.nombres} {sit.registrado_por?.apellidos}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                      <div>
                        {sit.confirmado_padre ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              Padre confirmó recepción el{' '}
                              {new Date(sit.fecha_confirmacion_padre).toLocaleString('es-PE')}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pendiente de confirmación de lectura del padre</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!sit.confirmado_padre && (
                          <button
                            type="button"
                            onClick={() => handleConfirmarSalud(sit.id)}
                            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700"
                          >
                            Registrar confirmación telefónica
                          </button>
                        )}
                        {sit.estado !== 'RETIRADO' && (
                          <button
                            type="button"
                            onClick={() => prepararRetiroDesdeSalud(sit)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium"
                          >
                            Proceder al retiro
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: RETIRO DE ESTUDIANTES Y VERIFICACIÓN (Secciones 28, 31, 34)    */}
      {/* ===================================================================== */}
      {tab === 'retiros' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200 space-y-4">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Verificación y registro de retiro
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                El sistema valida que el estudiante solo sea entregado a sus padres o a una persona con autorización vigente
              </p>
            </div>

            <form onSubmit={handleRegistrarRetiro} className="space-y-3">
              <SelectorEstudiante
                estudiantes={estudiantes}
                value={formRetiro.estudiante_id}
                onChange={(val) => seleccionarEstudianteParaRetiro(val)}
              />

              {/* Panel de Personas Autorizadas para este Estudiante */}
              {estudianteSeleccionadoRetiro && (
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <p className="font-semibold text-slate-800">
                    Personas autorizadas para recoger a{' '}
                    {estudianteSeleccionadoRetiro.usuario?.nombres}:
                  </p>

                  {/* Padres titulares */}
                  <div className="space-y-1">
                    {estudianteSeleccionadoRetiro.padres?.map((rel) => (
                      <button
                        key={rel.id}
                        type="button"
                        onClick={() =>
                          setFormRetiro((prev) => ({
                            ...prev,
                            modalidad_recojo: 'PADRE_TITULAR',
                            autorizacion_id: '',
                            recogido_por_nombre: `${rel.padre.nombres} ${rel.padre.apellidos}`,
                            recogido_por_dni: rel.padre.dni,
                            parentesco: rel.parentesco === 'MADRE' ? 'Madre' : 'Padre',
                          }))
                        }
                        className="w-full text-left px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:border-slate-400 flex items-center justify-between"
                      >
                        <span>
                          <strong className="text-slate-900">
                            {rel.padre.nombres} {rel.padre.apellidos}
                          </strong>{' '}
                          ({rel.parentesco})
                        </span>
                        <span className="font-mono text-[11px] text-slate-600">
                          DNI {rel.padre.dni}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Terceros con autorización aprobada */}
                  {autorizacionesActivasEstudiante.length > 0 ? (
                    <div className="space-y-1 pt-1 border-t border-slate-200">
                      <p className="text-[11px] text-slate-500">
                        Terceros autorizados por el padre/apoderado:
                      </p>
                      {autorizacionesActivasEstudiante.map((aut) => (
                        <button
                          key={aut.id}
                          type="button"
                          onClick={() =>
                            setFormRetiro((prev) => ({
                              ...prev,
                              modalidad_recojo: 'TERCERO_AUTORIZADO',
                              autorizacion_id: String(aut.id),
                              recogido_por_nombre: aut.persona_autorizada,
                              recogido_por_dni: aut.dni_persona,
                              parentesco: aut.parentesco,
                            }))
                          }
                          className={`w-full text-left px-2.5 py-1.5 rounded border flex items-center justify-between ${
                            String(formRetiro.autorizacion_id) === String(aut.id)
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-emerald-200 bg-emerald-50/60 hover:border-emerald-400 text-slate-900'
                          }`}
                        >
                          <span>
                            <strong>{aut.persona_autorizada}</strong> ({aut.parentesco} ·{' '}
                            {aut.tipo_autorizacion})
                          </span>
                          <span className="font-mono text-[11px]">DNI {aut.dni_persona}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 pt-1">
                      Sin autorizaciones de terceros activas.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Motivo del retiro
                  </label>
                  <input
                    type="text"
                    value={formRetiro.motivo}
                    onChange={(e) => setFormRetiro({ ...formRetiro, motivo: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Documento verificado
                  </label>
                  <select
                    value={formRetiro.documento_verificado}
                    onChange={(e) =>
                      setFormRetiro({ ...formRetiro, documento_verificado: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  >
                    <option value="DNI">DNI físico verificado</option>
                    <option value="CE">Carné de Extranjería</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre completo de quien recoge
                </label>
                <input
                  type="text"
                  value={formRetiro.recogido_por_nombre}
                  onChange={(e) =>
                    setFormRetiro({ ...formRetiro, recogido_por_nombre: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    N.° Documento (DNI)
                  </label>
                  <input
                    type="text"
                    value={formRetiro.recogido_por_dni}
                    onChange={(e) =>
                      setFormRetiro({ ...formRetiro, recogido_por_dni: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Relación / Parentesco
                  </label>
                  <input
                    type="text"
                    value={formRetiro.parentesco}
                    onChange={(e) => setFormRetiro({ ...formRetiro, parentesco: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  />
                </div>
              </div>

              <input
                type="text"
                placeholder="Observaciones adicionales de salida..."
                value={formRetiro.observaciones}
                onChange={(e) => setFormRetiro({ ...formRetiro, observaciones: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
              />

              <button
                type="submit"
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
              >
                Verificar identidad y registrar retiro del estudiante
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Historial de retiros de estudiantes ({retiros.length})
              </h2>
            </div>

            <div className="overflow-x-auto max-h-[540px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Fecha y Hora</th>
                    <th className="py-2.5 px-3 font-medium">Estudiante</th>
                    <th className="py-2.5 px-3 font-medium">Persona que recogió</th>
                    <th className="py-2.5 px-3 font-medium">Motivo</th>
                    <th className="py-2.5 px-4 font-medium">Entregado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {retiros.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Sin retiros registrados.
                      </td>
                    </tr>
                  ) : (
                    retiros.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {r.fecha} · <strong>{r.hora_salida}</strong>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900">
                            {r.estudiante?.usuario?.apellidos}, {r.estudiante?.usuario?.nombres}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {r.estudiante?.grado_seccion?.grado}° &ldquo;
                            {r.estudiante?.grado_seccion?.seccion}&rdquo;
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900">{r.recogido_por_nombre}</div>
                          <div className="text-[11px] text-slate-500">
                            {r.parentesco} · {r.documento_verificado} {r.recogido_por_dni}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{r.motivo}</td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {r.registrado_por?.nombres} {r.registrado_por?.apellidos}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: AUTORIZACIONES DE RECOJO POR TERCEROS (Secciones 29, 30, 33)   */}
      {/* ===================================================================== */}
      {tab === 'autorizaciones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-5 rounded-lg border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-4">
              Registrar autorización de tercero
            </h2>

            <form onSubmit={handleCrearAutorizacion} className="space-y-3">
              <SelectorEstudiante
                estudiantes={estudiantes}
                value={formAutorizacion.estudiante_id}
                onChange={(val) =>
                  setFormAutorizacion({ ...formAutorizacion, estudiante_id: val })
                }
              />

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Persona autorizada (Nombres y apellidos)
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">Relación</label>
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">DNI</label>
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
                    <option value="TEMPORAL">Temporal (rango de fechas)</option>
                    <option value="PERMANENTE">Permanente (año escolar)</option>
                    <option value="EMERGENCIA">De emergencia</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Válido desde
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
                    Válido hasta
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
                  Evidencia de autorización (PDF o imagen, opcional)
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
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                Guardar autorización de recojo
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Padrón de personas autorizadas para recojo ({autorizaciones.length})
              </h2>
            </div>

            <div className="overflow-x-auto max-h-[540px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Estudiante</th>
                    <th className="py-2.5 px-3 font-medium">Persona Autorizada</th>
                    <th className="py-2.5 px-3 font-medium">Tipo y Vigencia</th>
                    <th className="py-2.5 px-3 font-medium">Autorizado por</th>
                    <th className="py-2.5 px-4 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {autorizaciones.map((aut) => (
                    <tr key={aut.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">
                          {aut.estudiante?.usuario?.apellidos}, {aut.estudiante?.usuario?.nombres}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {aut.estudiante?.grado_seccion?.grado}° &ldquo;
                          {aut.estudiante?.grado_seccion?.seccion}&rdquo;
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">{aut.persona_autorizada}</div>
                        <div className="text-[11px] text-slate-500">
                          {aut.parentesco} · DNI <span className="font-mono">{aut.dni_persona}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-800">{aut.tipo_autorizacion}</span>
                        <span className="block text-[11px] font-mono text-slate-500">
                          {aut.valido_desde} al {aut.valido_hasta}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {aut.autorizado_por?.nombres} {aut.autorizado_por?.apellidos}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            aut.estado === 'APROBADO'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : aut.estado === 'UTILIZADA'
                                ? 'bg-slate-100 text-slate-700 border-slate-300'
                                : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {aut.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: SOLICITUDES DE PERMISO Y EVIDENCIAS (Secciones 23 y 24)        */}
      {/* ===================================================================== */}
      {tab === 'permisos' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Solicitudes de permiso enviadas por padres ({permisos.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Al aprobarse una solicitud, la asistencia de esa fecha pasa automáticamente a estado PERMISO
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {permisos.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">
                No hay solicitudes de permiso registradas.
              </p>
            ) : (
              permisos.map((p) => (
                <div
                  key={p.id}
                  className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {p.estudiante?.usuario?.apellidos}, {p.estudiante?.usuario?.nombres}
                      </span>
                      <span className="text-slate-500">
                        ({p.estudiante?.grado_seccion?.grado}° &ldquo;
                        {p.estudiante?.grado_seccion?.seccion}&rdquo;)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-semibold">
                        {p.tipo}
                      </span>
                      <span className="font-mono text-slate-600">Fecha: {p.fecha}</span>
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

                    <p className="text-[11px] text-slate-500">
                      Solicitado por: {p.solicitado_por?.nombres} {p.solicitado_por?.apellidos}
                      {p.revisado_por &&
                        ` · Revisado por: ${p.revisado_por.nombres} ${p.revisado_por.apellidos} (${p.respuesta_revision || ''})`}
                    </p>

                    {p.evidencias?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {p.evidencias.map((ev) => (
                          <span
                            key={ev.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{ev.archivo?.nombre_original}</span>
                            {ev.archivo?.contenido_base64 && (
                              <a
                                href={ev.archivo.contenido_base64}
                                download={ev.archivo.nombre_original}
                                className="text-slate-900 font-semibold underline ml-1 inline-flex items-center gap-0.5"
                              >
                                <Download className="w-3 h-3" />
                                <span>Descargar</span>
                              </a>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {puedeAprobarPermisos && p.estado === 'PENDIENTE' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRevisarPermiso(p.id, 'APROBADO')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aprobar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevisarPermiso(p.id, 'RECHAZADO')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
