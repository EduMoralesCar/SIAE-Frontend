import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  CalendarClock,
  Users,
  FileSignature,
  ClipboardList,
  FileText,
  CheckCircle2,
  Paperclip,
  Download,
  RefreshCw,
} from 'lucide-react';
import api from '../api/client';
import SemaforoBadge from '../components/SemaforoBadge';
import SelectorEstudiante from '../components/SelectorEstudiante';
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

export default function ConductaPage() {
  const [tab, setTab] = useState('incidencias');

  const [estudiantes, setEstudiantes] = useState([]);
  const [catalogo, setCatalogo] = useState({ DEMERITO: [], MERITO: [] });
  const [incidencias, setIncidencias] = useState([]);
  const [citaciones, setCitaciones] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [actas, setActas] = useState([]);
  const [compromisos, setCompromisos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  // 1. Estado formulario Incidencia (Secciones 35 a 39)
  const [formIncidencia, setFormIncidencia] = useState({
    estudiante_id: '',
    tipo: 'DEMERITO',
    naturaleza: 'CONVIVENCIA',
    gravedad: 'MODERADA',
    categoria: 'Conflicto entre pares durante la jornada',
    puntos_aplicados: -10,
    descripcion: '',
    acciones_tomadas: 'Diálogo reflexivo y registro en expediente de tutoría.',
    requiere_citacion: false,
  });
  const [archivoIncidencia, setArchivoIncidencia] = useState(null);

  // 2. Estado formulario Citación (Secciones 41 a 44)
  const [formCitacion, setFormCitacion] = useState({
    estudiante_id: '',
    incidencia_id: '',
    motivo: '',
    fecha_programada: new Date().toISOString().slice(0, 10),
    hora_programada: '10:00',
    lugar: 'Oficina de Tutoría',
    rol_responsable: 'TUTOR',
  });

  // 3. Estado formulario Reunión (Sección 45)
  const [formReunion, setFormReunion] = useState({
    citacion_id: '',
    estudiante_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    hora: '10:05',
    motivo: '',
    descripcion: '',
    acuerdos: '',
    observaciones: '',
    nombre_padre_participante: '',
    rol_padre_participante: 'Padre de familia',
  });

  // 4. Estado formulario Acta (Secciones 46 y 47)
  const [formActa, setFormActa] = useState({
    estudiante_id: '',
    reunion_id: '',
    tipo: 'COMPROMISO',
    motivo: '',
    contenido: '',
    informacion_comunicada: 'Normas de convivencia institucional y protocolo de seguimiento.',
    observaciones: '',
    compromiso_inicial_desc: '',
    compromiso_inicial_resp: 'Padre de familia',
    compromiso_inicial_fecha: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
  });

  // 5. Estado formulario Compromiso (Sección 48)
  const [formCompromiso, setFormCompromiso] = useState({
    estudiante_id: '',
    acta_id: '',
    descripcion: '',
    responsable_compromiso: 'Padre de familia',
    fecha_seguimiento: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
  });

  const cargarTodo = async () => {
    setCargando(true);
    try {
      const resEst = await api.get('/estudiantes');
      if (resEst.data?.estudiantes) {
        const lista = resEst.data.estudiantes;
        setEstudiantes(lista);
        if (lista.length > 0) {
          const idPrimero = String(lista[0].id);
          const padrePrimero = lista[0].padres?.[0]?.padre;
          setFormIncidencia((p) => ({ ...p, estudiante_id: p.estudiante_id || idPrimero }));
          setFormCitacion((p) => ({ ...p, estudiante_id: p.estudiante_id || idPrimero }));
          setFormReunion((p) => ({
            ...p,
            estudiante_id: p.estudiante_id || idPrimero,
            nombre_padre_participante:
              p.nombre_padre_participante ||
              (padrePrimero
                ? `${padrePrimero.nombres} ${padrePrimero.apellidos}`
                : 'Padre de familia'),
          }));
          setFormActa((p) => ({ ...p, estudiante_id: p.estudiante_id || idPrimero }));
          setFormCompromiso((p) => ({ ...p, estudiante_id: p.estudiante_id || idPrimero }));
        }
      }

      if (tab === 'incidencias') {
        const [resCat, resInc] = await Promise.all([
          api.get('/conducta/catalogo'),
          api.get('/conducta/incidencias'),
        ]);
        if (resCat.data?.catalogo) setCatalogo(resCat.data.catalogo);
        if (resInc.data?.incidencias) setIncidencias(resInc.data.incidencias);
      } else if (tab === 'citaciones') {
        const [resCit, resInc] = await Promise.all([
          api.get('/citaciones'),
          api.get('/conducta/incidencias'),
        ]);
        if (resCit.data?.citaciones) setCitaciones(resCit.data.citaciones);
        if (resInc.data?.incidencias) setIncidencias(resInc.data.incidencias);
      } else if (tab === 'reuniones') {
        const resReu = await api.get('/reuniones');
        if (resReu.data?.reuniones) setReuniones(resReu.data.reuniones);
      } else if (tab === 'actas') {
        const resAct = await api.get('/actas');
        if (resAct.data?.actas) setActas(resAct.data.actas);
      } else if (tab === 'compromisos') {
        const [resCmp, resAct] = await Promise.all([
          api.get('/compromisos'),
          api.get('/actas'),
        ]);
        if (resCmp.data?.compromisos) setCompromisos(resCmp.data.compromisos);
        if (resAct.data?.actas) setActas(resAct.data.actas);
      }
    } catch {
      // Ignorar
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, [tab]);

  // Handlers de Incidencia
  const handleRegistrarIncidencia = async (e) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');
    try {
      let evidenciaPayload = null;
      if (archivoIncidencia) {
        evidenciaPayload = await convertirArchivoABase64(archivoIncidencia);
      }
      const { data } = await api.post('/conducta/incidencias', {
        ...formIncidencia,
        evidencia: evidenciaPayload,
      });
      setMensajeExito(data.mensaje);
      setFormIncidencia((p) => ({ ...p, descripcion: '' }));
      setArchivoIncidencia(null);
      await cargarTodo();
    } catch (err) {
      setMensajeError(err.response?.data?.mensaje || 'Error al registrar incidencia.');
    }
  };

  const handleCerrarIncidencia = async (inc) => {
    const conclusion = window.prompt(
      `Conclusión de cierre para la incidencia ${inc.codigo || `#${inc.id}`}:`,
      'Incidencia atendida satisfactoriamente con acuerdos cumplidos.'
    );
    if (conclusion === null) return;
    try {
      const { data } = await api.patch(`/conducta/incidencias/${inc.id}/cerrar`, {
        comentario_cierre: conclusion,
      });
      setMensajeExito(data.mensaje);
      await cargarTodo();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'No se pudo cerrar la incidencia.');
    }
  };

  const prepararCitacionDesdeIncidencia = (inc) => {
    setTab('citaciones');
    setFormCitacion({
      estudiante_id: String(inc.estudiante_id),
      incidencia_id: String(inc.id),
      motivo: `Atención de incidencia ${inc.codigo || `#${inc.id}`} (${inc.naturaleza} - ${inc.categoria})`,
      fecha_programada: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      hora_programada: '10:00',
      lugar: inc.gravedad === 'GRAVE' || inc.gravedad === 'MUY_GRAVE' ? 'Dirección General' : 'Oficina de Tutoría',
      rol_responsable: inc.gravedad === 'GRAVE' || inc.gravedad === 'MUY_GRAVE' ? 'DIRECTOR' : 'TUTOR',
    });
  };

  // Handlers de Citación
  const handleCrearCitacion = async (e) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');
    try {
      const { data } = await api.post('/citaciones', formCitacion);
      setMensajeExito(data.mensaje);
      setFormCitacion((p) => ({ ...p, motivo: '', incidencia_id: '' }));
      await cargarTodo();
    } catch (err) {
      setMensajeError(err.response?.data?.mensaje || 'Error al generar citación.');
    }
  };

  const handleReprogramarCitacion = async (cit) => {
    const nuevaFecha = window.prompt('Nueva fecha programada (YYYY-MM-DD):', cit.fecha_programada);
    if (!nuevaFecha) return;
    const nuevaHora = window.prompt('Nueva hora programada (HH:mm):', cit.hora_programada);
    if (!nuevaHora) return;
    const nuevoLugar = window.prompt('Lugar de atención:', cit.lugar);
    if (!nuevoLugar) return;

    try {
      const { data } = await api.patch(`/citaciones/${cit.id}/reprogramar`, {
        fecha_programada: nuevaFecha,
        hora_programada: nuevaHora,
        lugar: nuevoLugar,
        motivo_reprogramacion: 'Reprogramación acordada con el padre de familia',
      });
      setMensajeExito(data.mensaje);
      await cargarTodo();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'No se pudo reprogramar la citación.');
    }
  };

  const prepararReunionDesdeCitacion = (cit) => {
    setTab('reuniones');
    const est = estudiantes.find((e) => e.id === cit.estudiante_id);
    const padre = est?.padres?.[0]?.padre;
    setFormReunion({
      citacion_id: String(cit.id),
      estudiante_id: String(cit.estudiante_id),
      fecha: new Date().toISOString().slice(0, 10),
      hora: new Date().toTimeString().slice(0, 5),
      motivo: cit.motivo,
      descripcion: `Se llevó a cabo la reunión programada en ${cit.lugar} para abordar: ${cit.motivo}.`,
      acuerdos:
        '1. El padre de familia realizará seguimiento en casa.\n2. Mantener comunicación permanente con tutoría.',
      observaciones: 'El apoderado asistió puntualmente.',
      nombre_padre_participante: padre ? `${padre.nombres} ${padre.apellidos}` : 'Padre de familia',
      rol_padre_participante: 'Padre de familia',
    });
  };

  // Handlers de Reunión
  const handleRegistrarReunion = async (e) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');
    try {
      const participantes = [];
      if (formReunion.nombre_padre_participante) {
        participantes.push({
          nombre_participante: formReunion.nombre_padre_participante,
          rol_participante: formReunion.rol_padre_participante || 'Padre de familia',
        });
      }
      const { data } = await api.post('/reuniones', {
        ...formReunion,
        participantes,
      });
      setMensajeExito(data.mensaje);
      setFormReunion((p) => ({
        ...p,
        citacion_id: '',
        motivo: '',
        descripcion: '',
        acuerdos: '',
        observaciones: '',
      }));
      await cargarTodo();
    } catch (err) {
      setMensajeError(err.response?.data?.mensaje || 'Error al registrar reunión.');
    }
  };

  const prepararActaDesdeReunion = (reu, tipoActa = 'COMPROMISO') => {
    setTab('actas');
    setFormActa({
      estudiante_id: String(reu.estudiante_id),
      reunion_id: String(reu.id),
      tipo: tipoActa,
      motivo: reu.motivo,
      contenido:
        tipoActa === 'CONOCIMIENTO'
          ? `Se deja constancia de que el padre, madre o apoderado del estudiante ha sido informado sobre la situación registrada: ${reu.descripcion}`
          : `En atención a la reunión realizada, se formalizan los siguientes acuerdos y compromisos: ${reu.acuerdos}`,
      informacion_comunicada: 'Normas de convivencia escolar y reglamento interno de la institución.',
      observaciones: reu.observaciones || '',
      compromiso_inicial_desc: tipoActa === 'COMPROMISO' ? reu.acuerdos : '',
      compromiso_inicial_resp: 'Padre de familia y Estudiante',
      compromiso_inicial_fecha: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
    });
  };

  // Handlers de Acta
  const handleGenerarActa = async (e) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');
    try {
      const compromisos_iniciales = [];
      if (formActa.tipo === 'COMPROMISO' && formActa.compromiso_inicial_desc.trim()) {
        compromisos_iniciales.push({
          descripcion: formActa.compromiso_inicial_desc.trim(),
          responsable_compromiso: formActa.compromiso_inicial_resp,
          fecha_seguimiento: formActa.compromiso_inicial_fecha,
        });
      }

      const { data } = await api.post('/actas', {
        ...formActa,
        compromisos_iniciales,
      });
      setMensajeExito(data.mensaje);
      setFormActa((p) => ({
        ...p,
        reunion_id: '',
        motivo: '',
        contenido: '',
        compromiso_inicial_desc: '',
      }));
      await cargarTodo();
    } catch (err) {
      setMensajeError(err.response?.data?.mensaje || 'Error al generar el acta institucional.');
    }
  };

  const handleAceptarActa = async (actaId) => {
    try {
      const { data } = await api.patch(`/actas/${actaId}/aceptar`);
      setMensajeExito(data.mensaje);
      await cargarTodo();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al registrar conformidad.');
    }
  };

  // Handlers de Compromiso y Seguimiento
  const handleCrearCompromiso = async (e) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');
    try {
      const { data } = await api.post('/compromisos', formCompromiso);
      setMensajeExito(data.mensaje);
      setFormCompromiso((p) => ({ ...p, descripcion: '' }));
      await cargarTodo();
    } catch (err) {
      setMensajeError(err.response?.data?.mensaje || 'Error al crear compromiso.');
    }
  };

  const handleRegistrarSeguimiento = async (cmp) => {
    const resultado = window.prompt(
      `Estado de evaluación del compromiso ${cmp.codigo || `#${cmp.id}`} (EN_SEGUIMIENTO, CUMPLIDO, INCUMPLIDO, CERRADO):`,
      'CUMPLIDO'
    );
    if (!resultado) return;
    const observaciones = window.prompt(
      'Observaciones de la verificación de seguimiento:',
      'Se verificó cumplimiento satisfactorio del compromiso.'
    );
    if (!observaciones) return;

    try {
      const { data } = await api.post(`/compromisos/${cmp.id}/seguimientos`, {
        resultado: resultado.toUpperCase().trim(),
        estado_compromiso: resultado.toUpperCase().trim(),
        observaciones,
      });
      setMensajeExito(data.mensaje);
      await cargarTodo();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al registrar seguimiento.');
    }
  };

  const badgeGravedad = (grav) => {
    if (grav === 'MUY_GRAVE' || grav === 'GRAVE')
      return 'bg-red-50 text-red-700 border-red-200';
    if (grav === 'MODERADA') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Incidencias, citaciones, reuniones, actas y seguimiento de compromisos
          </h1>
          <p className="text-xs text-slate-500">
            Flujo institucional completo de convivencia y seguimiento escolar con trazabilidad
          </p>
        </div>
      </div>

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

      {/* Pestañas del Flujo (Sección 39 y 77) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTab('incidencias')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'incidencias'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>1. Incidencias ({incidencias.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('citaciones')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'citaciones'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5" />
          <span>2. Citaciones a Padres ({citaciones.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('reuniones')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'reuniones'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>3. Reuniones ({reuniones.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('actas')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'actas'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSignature className="w-3.5 h-3.5" />
          <span>4. Actas ({actas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('compromisos')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'compromisos'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>5. Compromisos y Seguimiento ({compromisos.length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: INCIDENCIAS CLASIFICADAS Y EVIDENCIAS (Secciones 35 a 40)       */}
      {/* ===================================================================== */}
      {tab === 'incidencias' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-5 rounded-lg border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-4">
              Registrar incidencia
            </h2>

            <form onSubmit={handleRegistrarIncidencia} className="space-y-3">
              <SelectorEstudiante
                estudiantes={estudiantes}
                value={formIncidencia.estudiante_id}
                onChange={(val) =>
                  setFormIncidencia({ ...formIncidencia, estudiante_id: val })
                }
                mostrarPuntaje={true}
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Naturaleza / Tipo
                  </label>
                  <select
                    value={formIncidencia.naturaleza}
                    onChange={(e) =>
                      setFormIncidencia({ ...formIncidencia, naturaleza: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  >
                    <option value="CONVIVENCIA">Convivencia</option>
                    <option value="CONDUCTA">Conducta</option>
                    <option value="ACADEMICA">Académica</option>
                    <option value="INCUMPLIMIENTO_NORMAS">Incumplimiento de normas</option>
                    <option value="CONFLICTO">Conflicto</option>
                    <option value="DANO_BIENES">Daño de bienes</option>
                    <option value="ACCIDENTE">Accidente</option>
                    <option value="SALUD">Salud</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gravedad</label>
                  <select
                    value={formIncidencia.gravedad}
                    onChange={(e) =>
                      setFormIncidencia({ ...formIncidencia, gravedad: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  >
                    <option value="LEVE">Leve</option>
                    <option value="MODERADA">Moderada</option>
                    <option value="GRAVE">Grave</option>
                    <option value="MUY_GRAVE">Muy grave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Clasificación
                  </label>
                  <select
                    value={formIncidencia.tipo}
                    onChange={(e) => {
                      const nuevoTipo = e.target.value;
                      const primero = catalogo[nuevoTipo]?.[0];
                      setFormIncidencia({
                        ...formIncidencia,
                        tipo: nuevoTipo,
                        categoria: primero ? primero.categoria : formIncidencia.categoria,
                        puntos_aplicados: primero ? primero.puntos : 0,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  >
                    <option value="DEMERITO">Incidencia / Demérito</option>
                    <option value="MERITO">Reconocimiento / Mérito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Impacto puntaje
                  </label>
                  <input
                    type="number"
                    value={formIncidencia.puntos_aplicados}
                    onChange={(e) =>
                      setFormIncidencia({
                        ...formIncidencia,
                        puntos_aplicados: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Motivo o categoría de la situación
                </label>
                <input
                  type="text"
                  value={formIncidencia.categoria}
                  onChange={(e) =>
                    setFormIncidencia({ ...formIncidencia, categoria: e.target.value })
                  }
                  placeholder="Ej. Situación de convivencia durante el recreo"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Descripción detallada del hecho
                </label>
                <textarea
                  rows={3}
                  value={formIncidencia.descripcion}
                  onChange={(e) =>
                    setFormIncidencia({ ...formIncidencia, descripcion: e.target.value })
                  }
                  placeholder="Describa los hechos ocurridos..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Acciones iniciales tomadas
                </label>
                <input
                  type="text"
                  value={formIncidencia.acciones_tomadas}
                  onChange={(e) =>
                    setFormIncidencia({ ...formIncidencia, acciones_tomadas: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Adjuntar evidencia (fotografía, informe o documento PDF)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setArchivoIncidencia(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={formIncidencia.requiere_citacion}
                  onChange={(e) =>
                    setFormIncidencia({ ...formIncidencia, requiere_citacion: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
                <span>Requiere citación al padre o apoderado</span>
              </label>

              <button
                type="submit"
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
              >
                Registrar incidencia y notificar
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Historial de incidencias registradas ({incidencias.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {cargando ? (
                <p className="p-8 text-center text-xs text-slate-400">Cargando...</p>
              ) : (
                incidencias.map((inc) => (
                  <div key={inc.id} className="p-4 hover:bg-slate-50 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {inc.codigo || `INC-${inc.id}`}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {inc.estudiante?.usuario?.apellidos}, {inc.estudiante?.usuario?.nombres}
                        </span>
                        <span className="text-slate-500">
                          ({inc.estudiante?.grado_seccion?.grado}° &ldquo;
                          {inc.estudiante?.grado_seccion?.seccion}&rdquo;)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                          {inc.naturaleza || inc.tipo}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeGravedad(
                            inc.gravedad
                          )}`}
                        >
                          Gravedad: {inc.gravedad || 'MODERADA'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            inc.estado === 'CERRADA'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {inc.estado}
                        </span>
                      </div>
                    </div>

                    <p className="font-medium text-slate-800">{inc.categoria}</p>
                    <p className="text-slate-600">{inc.descripcion}</p>

                    {inc.acciones_tomadas && (
                      <p className="text-[11px] text-slate-500">
                        Acciones tomadas: {inc.acciones_tomadas}
                      </p>
                    )}

                    {inc.evidencias?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {inc.evidencias.map((ev) => (
                          <span
                            key={ev.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700"
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

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">
                        Registrado por: {inc.registrado_por?.nombres} {inc.registrado_por?.apellidos}{' '}
                        · {new Date(inc.fecha_incidente).toLocaleString('es-PE')}
                      </span>

                      <div className="flex items-center gap-2">
                        {inc.estado !== 'CERRADA' && (
                          <>
                            <button
                              type="button"
                              onClick={() => prepararCitacionDesdeIncidencia(inc)}
                              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700"
                            >
                              Generar citación al padre
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCerrarIncidencia(inc)}
                              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium"
                            >
                              Cerrar incidencia
                            </button>
                          </>
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
      {/* TAB 2: CITACIONES A PADRES (Secciones 41 a 44)                         */}
      {/* ===================================================================== */}
      {tab === 'citaciones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-5 rounded-lg border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-4">
              Generar citación a padre o apoderado
            </h2>

            <form onSubmit={handleCrearCitacion} className="space-y-3">
              <SelectorEstudiante
                estudiantes={estudiantes}
                value={formCitacion.estudiante_id}
                onChange={(val) =>
                  setFormCitacion({ ...formCitacion, estudiante_id: val })
                }
              />

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Incidencia vinculada (opcional)
                </label>
                <select
                  value={formCitacion.incidencia_id}
                  onChange={(e) =>
                    setFormCitacion({ ...formCitacion, incidencia_id: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                >
                  <option value="">Citación directa (sin incidencia específica)</option>
                  {incidencias
                    .filter((i) => String(i.estudiante_id) === String(formCitacion.estudiante_id))
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.codigo || `#${i.id}`} — {i.categoria} ({i.gravedad})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Motivo de la citación
                </label>
                <textarea
                  rows={2}
                  value={formCitacion.motivo}
                  onChange={(e) => setFormCitacion({ ...formCitacion, motivo: e.target.value })}
                  placeholder="Indique el motivo de la reunión..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formCitacion.fecha_programada}
                    onChange={(e) =>
                      setFormCitacion({ ...formCitacion, fecha_programada: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={formCitacion.hora_programada}
                    onChange={(e) =>
                      setFormCitacion({ ...formCitacion, hora_programada: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Lugar</label>
                  <input
                    type="text"
                    value={formCitacion.lugar}
                    onChange={(e) => setFormCitacion({ ...formCitacion, lugar: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Atenderá (Cargo)
                  </label>
                  <select
                    value={formCitacion.rol_responsable}
                    onChange={(e) =>
                      setFormCitacion({ ...formCitacion, rol_responsable: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  >
                    <option value="TUTOR">Tutor</option>
                    <option value="DOCENTE">Docente</option>
                    <option value="DIRECTOR">Director</option>
                    <option value="AUXILIAR">Auxiliar</option>
                    <option value="COORDINADOR">Coordinador</option>
                    <option value="PSICOLOGO">Psicólogo / TOE</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                Emitir citación y notificar al padre
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Citaciones programadas ({citaciones.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {citaciones.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-400">
                  No hay citaciones registradas.
                </p>
              ) : (
                citaciones.map((cit) => (
                  <div key={cit.id} className="p-4 hover:bg-slate-50 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900">
                          {cit.estudiante?.usuario?.apellidos}, {cit.estudiante?.usuario?.nombres}
                        </span>
                        <span className="ml-2 text-slate-500">
                          ({cit.estudiante?.grado_seccion?.grado}° &ldquo;
                          {cit.estudiante?.grado_seccion?.seccion}&rdquo;)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800">
                          {cit.fecha_programada} · {cit.hora_programada}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            cit.estado === 'ATENDIDA' || cit.estado === 'CONFIRMADA'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : cit.estado === 'SOLICITA_REPROGRAMACION' ||
                                  cit.estado === 'NO_PUEDE_ASISTIR'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {cit.estado}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-700">{cit.motivo}</p>
                    <p className="text-[11px] text-slate-500">
                      Lugar: <strong>{cit.lugar}</strong> · Atenderá:{' '}
                      {cit.responsable?.nombres} {cit.responsable?.apellidos} ({cit.rol_responsable})
                    </p>

                    {cit.respuesta_padre && (
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Respuesta del padre: {cit.respuesta_padre.replace(/_/g, ' ')}
                        {cit.comentario_padre ? ` — "${cit.comentario_padre}"` : ''} (
                        {new Date(cit.fecha_confirmacion).toLocaleString('es-PE')})
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      {cit.estado !== 'ATENDIDA' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReprogramarCitacion(cit)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Reprogramar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => prepararReunionDesdeCitacion(cit)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium"
                          >
                            Registrar reunión realizada
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: REGISTRO DE REUNIONES CON PADRES (Sección 45)                   */}
      {/* ===================================================================== */}
      {tab === 'reuniones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-4">
              Registrar reunión realizada
            </h2>

            <form onSubmit={handleRegistrarReunion} className="space-y-3">
              <SelectorEstudiante
                estudiantes={estudiantes}
                value={formReunion.estudiante_id}
                onChange={(val) => {
                  const est = estudiantes.find((item) => String(item.id) === String(val));
                  const padre = est?.padres?.[0]?.padre;
                  setFormReunion({
                    ...formReunion,
                    estudiante_id: val,
                    nombre_padre_participante: padre
                      ? `${padre.nombres} ${padre.apellidos}`
                      : formReunion.nombre_padre_participante,
                  });
                }}
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formReunion.fecha}
                    onChange={(e) => setFormReunion({ ...formReunion, fecha: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={formReunion.hora}
                    onChange={(e) => setFormReunion({ ...formReunion, hora: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Padre / Apoderado participante
                </label>
                <input
                  type="text"
                  value={formReunion.nombre_padre_participante}
                  onChange={(e) =>
                    setFormReunion({
                      ...formReunion,
                      nombre_padre_participante: e.target.value,
                    })
                  }
                  placeholder="Nombre del padre o madre asistente"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Motivo de la reunión
                </label>
                <input
                  type="text"
                  value={formReunion.motivo}
                  onChange={(e) => setFormReunion({ ...formReunion, motivo: e.target.value })}
                  placeholder="Ej. Incidencia de convivencia"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Descripción de la reunión
                </label>
                <textarea
                  rows={2}
                  value={formReunion.descripcion}
                  onChange={(e) =>
                    setFormReunion({ ...formReunion, descripcion: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Acuerdos alcanzados
                </label>
                <textarea
                  rows={3}
                  value={formReunion.acuerdos}
                  onChange={(e) => setFormReunion({ ...formReunion, acuerdos: e.target.value })}
                  placeholder="Detalle los acuerdos establecidos con la familia..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <input
                type="text"
                placeholder="Observaciones adicionales..."
                value={formReunion.observaciones}
                onChange={(e) =>
                  setFormReunion({ ...formReunion, observaciones: e.target.value })
                }
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
              />

              <button
                type="submit"
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                Guardar reunión
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Reuniones realizadas ({reuniones.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {reuniones.map((reu) => (
                <div key={reu.id} className="p-4 hover:bg-slate-50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {reu.estudiante?.usuario?.apellidos}, {reu.estudiante?.usuario?.nombres} (
                      {reu.estudiante?.grado_seccion?.grado}° &ldquo;
                      {reu.estudiante?.grado_seccion?.seccion}&rdquo;)
                    </span>
                    <span className="font-mono text-slate-500">
                      {reu.fecha} · {reu.hora}
                    </span>
                  </div>

                  <p className="font-medium text-slate-800">Motivo: {reu.motivo}</p>
                  <p className="text-slate-600">{reu.descripcion}</p>
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <p className="font-semibold text-slate-800 mb-0.5">Acuerdos:</p>
                    <p className="text-slate-700 whitespace-pre-line">{reu.acuerdos}</p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">
                      Atendió: {reu.responsable?.nombres} {reu.responsable?.apellidos} ·
                      Participantes:{' '}
                      {(reu.participantes || []).map((p) => p.nombre_participante).join(', ')}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => prepararActaDesdeReunion(reu, 'CONOCIMIENTO')}
                        className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700"
                      >
                        Generar Acta de Conocimiento
                      </button>
                      <button
                        type="button"
                        onClick={() => prepararActaDesdeReunion(reu, 'COMPROMISO')}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium"
                      >
                        Generar Acta de Compromiso
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: ACTAS DE CONOCIMIENTO Y COMPROMISO (Secciones 46, 47 y 78)      */}
      {/* ===================================================================== */}
      {tab === 'actas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-4">
              Generar acta institucional
            </h2>

            <form onSubmit={handleGenerarActa} className="space-y-3">
              <SelectorEstudiante
                estudiantes={estudiantes}
                value={formActa.estudiante_id}
                onChange={(val) => setFormActa({ ...formActa, estudiante_id: val })}
              />

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tipo de Acta
                </label>
                <select
                  value={formActa.tipo}
                  onChange={(e) => setFormActa({ ...formActa, tipo: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                >
                  <option value="COMPROMISO">Acta de Compromiso</option>
                  <option value="CONOCIMIENTO">Acta de Conocimiento</option>
                  <option value="OTRO">Otro documento institucional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Motivo del Acta
                </label>
                <input
                  type="text"
                  value={formActa.motivo}
                  onChange={(e) => setFormActa({ ...formActa, motivo: e.target.value })}
                  placeholder="Ej. Incidencia registrada / Toma de conocimiento"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contenido y constancia del Acta
                </label>
                <textarea
                  rows={3}
                  value={formActa.contenido}
                  onChange={(e) => setFormActa({ ...formActa, contenido: e.target.value })}
                  placeholder="Se deja constancia de que el padre, madre o apoderado..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Información comunicada
                </label>
                <input
                  type="text"
                  value={formActa.informacion_comunicada}
                  onChange={(e) =>
                    setFormActa({ ...formActa, informacion_comunicada: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                />
              </div>

              {formActa.tipo === 'COMPROMISO' && (
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                  <p className="text-[11px] font-semibold text-slate-800">
                    Compromiso vinculado al Acta (opcional):
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Descripción del compromiso asumido..."
                    value={formActa.compromiso_inicial_desc}
                    onChange={(e) =>
                      setFormActa({ ...formActa, compromiso_inicial_desc: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Responsable"
                      value={formActa.compromiso_inicial_resp}
                      onChange={(e) =>
                        setFormActa({ ...formActa, compromiso_inicial_resp: e.target.value })
                      }
                      className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                    />
                    <input
                      type="date"
                      value={formActa.compromiso_inicial_fecha}
                      onChange={(e) =>
                        setFormActa({ ...formActa, compromiso_inicial_fecha: e.target.value })
                      }
                      className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                Generar y almacenar Acta
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Actas emitidas ({actas.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {actas.map((acta) => (
                <div key={acta.id} className="p-4 hover:bg-slate-50 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{acta.codigo}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold">
                        ACTA DE {acta.tipo}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {acta.estudiante?.usuario?.apellidos}, {acta.estudiante?.usuario?.nombres}
                      </span>
                    </div>

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

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      Emitida por: {acta.creado_por?.nombres} {acta.creado_por?.apellidos} ·{' '}
                      {new Date(acta.created_at).toLocaleDateString('es-PE')}
                    </span>

                    <div className="flex items-center gap-2">
                      {!acta.aceptado_padre && (
                        <button
                          type="button"
                          onClick={() => handleAceptarActa(acta.id)}
                          className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700"
                        >
                          Registrar firma / conformidad
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => exportarActaPDF(acta)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Imprimir PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: COMPROMISOS Y SEGUIMIENTO (Sección 48)                          */}
      {/* ===================================================================== */}
      {tab === 'compromisos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-5 rounded-lg border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-4">
              Registrar compromiso
            </h2>

            <form onSubmit={handleCrearCompromiso} className="space-y-3">
              <SelectorEstudiante
                estudiantes={estudiantes}
                value={formCompromiso.estudiante_id}
                onChange={(val) =>
                  setFormCompromiso({ ...formCompromiso, estudiante_id: val })
                }
              />

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Acta vinculada (opcional)
                </label>
                <select
                  value={formCompromiso.acta_id}
                  onChange={(e) => setFormCompromiso({ ...formCompromiso, acta_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                >
                  <option value="">Compromiso directo</option>
                  {actas
                    .filter((a) => String(a.estudiante_id) === String(formCompromiso.estudiante_id))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.codigo} — {a.motivo}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Descripción del compromiso
                </label>
                <textarea
                  rows={3}
                  value={formCompromiso.descripcion}
                  onChange={(e) =>
                    setFormCompromiso({ ...formCompromiso, descripcion: e.target.value })
                  }
                  placeholder="Ej. Cumplir las normas de convivencia y mantener comunicación quincenal con el tutor..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Responsable
                  </label>
                  <select
                    value={formCompromiso.responsable_compromiso}
                    onChange={(e) =>
                      setFormCompromiso({
                        ...formCompromiso,
                        responsable_compromiso: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  >
                    <option value="Padre de familia">Padre de familia</option>
                    <option value="Estudiante">Estudiante</option>
                    <option value="Padre de familia y Estudiante">Padre y Estudiante</option>
                    <option value="Institución / Tutoría">Institución / Tutoría</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fecha de seguimiento
                  </label>
                  <input
                    type="date"
                    value={formCompromiso.fecha_seguimiento}
                    onChange={(e) =>
                      setFormCompromiso({ ...formCompromiso, fecha_seguimiento: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                Guardar compromiso
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Seguimiento de compromisos ({compromisos.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {compromisos.map((cmp) => (
                <div key={cmp.id} className="p-4 hover:bg-slate-50 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{cmp.codigo}</span>
                      <span className="ml-2 font-semibold text-slate-900">
                        {cmp.estudiante?.usuario?.apellidos}, {cmp.estudiante?.usuario?.nombres}
                      </span>
                      <span className="ml-2 text-slate-500">
                        ({cmp.estudiante?.grado_seccion?.grado}° &ldquo;
                        {cmp.estudiante?.grado_seccion?.seccion}&rdquo;)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600">
                        Seguimiento: {cmp.fecha_seguimiento}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          cmp.estado === 'CUMPLIDO' || cmp.estado === 'CERRADO'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : cmp.estado === 'INCUMPLIDO'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {cmp.estado}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-700">{cmp.descripcion}</p>
                  <p className="text-[11px] text-slate-500">
                    Responsable: <strong>{cmp.responsable_compromiso}</strong>
                    {cmp.acta ? ` · Acta: ${cmp.acta.codigo}` : ''}
                  </p>

                  {cmp.seguimientos?.length > 0 && (
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-700">
                        Historial de revisiones ({cmp.seguimientos.length}):
                      </p>
                      {cmp.seguimientos.map((seg) => (
                        <div key={seg.id} className="text-[11px] text-slate-600 flex justify-between">
                          <span>
                            <strong>[{seg.resultado}]</strong> {seg.observaciones}
                          </span>
                          <span className="font-mono text-slate-400 shrink-0 ml-2">
                            {seg.fecha} ({seg.registrado_por?.nombres})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRegistrarSeguimiento(cmp)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium"
                    >
                      Registrar evaluación de seguimiento
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
