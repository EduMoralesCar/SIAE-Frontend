import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function ActividadesDocentePage() {
  const [grados, setGrados] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [gradoSeccionId, setGradoSeccionId] = useState('');
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);

  const [cursoNombre, setCursoNombre] = useState('Matemática');
  const [tituloActividad, setTituloActividad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().slice(0, 10));
  const [creando, setCreando] = useState(false);

  const cargarDatos = async () => {
    try {
      const [resGrados, resAct] = await Promise.all([
        api.get('/grados-secciones'),
        api.get('/actividades', {
          params: { grado_seccion_id: gradoSeccionId || undefined },
        }),
      ]);
      if (resGrados.data?.grados) {
        setGrados(resGrados.data.grados);
        if (!gradoSeccionId && resGrados.data.grados.length > 0) {
          setGradoSeccionId(String(resGrados.data.grados[0].id));
        }
      }
      if (resAct.data?.actividades) {
        setActividades(resAct.data.actividades);
        if (resAct.data.actividades.length > 0) {
          const actual =
            resAct.data.actividades.find((a) => a.id === actividadSeleccionada?.id) ||
            resAct.data.actividades[0];
          setActividadSeleccionada(actual);
        } else {
          setActividadSeleccionada(null);
        }
      }
    } catch {
      // Ignorar
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [gradoSeccionId]);

  const handleCrearActividad = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      await api.post('/actividades', {
        grado_seccion_id: Number(gradoSeccionId),
        curso_nombre: cursoNombre,
        titulo_actividad: tituloActividad,
        descripcion,
        fecha_entrega: fechaEntrega,
      });
      setTituloActividad('');
      setDescripcion('');
      await cargarDatos();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al crear la actividad.');
    } finally {
      setCreando(false);
    }
  };

  const handleActualizarCalificacion = async (cal, estadoEntrega, nota, observacion) => {
    try {
      await api.post('/actividades/calificar', {
        actividad_id: actividadSeleccionada.id,
        estudiante_id: cal.estudiante_id,
        estado_entrega: estadoEntrega,
        nota,
        observacion,
      });
      await cargarDatos();
    } catch {
      alert('No se pudo guardar la calificación.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Actividades y calificaciones</h1>
          <p className="text-xs text-slate-500">Control de entregas y notas por sección</p>
        </div>

        <select
          value={gradoSeccionId}
          onChange={(e) => setGradoSeccionId(e.target.value)}
          className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs"
        >
          {grados.map((g) => (
            <option key={g.id} value={g.id}>
              {g.grado}° &ldquo;{g.seccion}&rdquo; Secundaria
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-lg border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-4">
              Nueva actividad
            </h2>

            <form onSubmit={handleCrearActividad} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Curso</label>
                <select
                  value={cursoNombre}
                  onChange={(e) => setCursoNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                >
                  <option value="Matemática">Matemática</option>
                  <option value="Comunicación">Comunicación</option>
                  <option value="Ciencia y Tecnología">Ciencia y Tecnología</option>
                  <option value="Historia, Geografía y Economía">
                    Historia, Geografía y Economía
                  </option>
                  <option value="Inglés">Inglés</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Título</label>
                <input
                  type="text"
                  value={tituloActividad}
                  onChange={(e) => setTituloActividad(e.target.value)}
                  placeholder="Título de la actividad..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fecha de entrega
                </label>
                <input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={creando}
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                {creando ? 'Guardando...' : 'Crear actividad'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Actividades ({actividades.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {actividades.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setActividadSeleccionada(act)}
                  className={`w-full p-3.5 text-left transition ${
                    actividadSeleccionada?.id === act.id
                      ? 'bg-slate-100 border-l-2 border-slate-900'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[11px] font-medium text-slate-500">
                    {act.curso_nombre}
                  </span>
                  <p className="text-xs font-medium text-slate-900 mt-0.5">
                    {act.titulo_actividad}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Entrega: {act.fecha_entrega}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
              {actividadSeleccionada
                ? actividadSeleccionada.titulo_actividad
                : 'Seleccione una actividad'}
            </h2>
          </div>

          {actividadSeleccionada && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Estudiante</th>
                    <th className="py-2.5 px-3 font-medium">Entrega</th>
                    <th className="py-2.5 px-3 font-medium">Nota</th>
                    <th className="py-2.5 px-3 font-medium">Observación</th>
                    <th className="py-2.5 px-4 text-right font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(actividadSeleccionada.calificaciones || []).map((cal) => (
                    <FilaCalificacion
                      key={cal.id}
                      cal={cal}
                      onGuardar={handleActualizarCalificacion}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilaCalificacion({ cal, onGuardar }) {
  const [estado, setEstado] = useState(cal.estado_entrega);
  const [nota, setNota] = useState(cal.nota ?? '');
  const [observacion, setObservacion] = useState(cal.observacion ?? '');
  const [guardado, setGuardado] = useState(false);

  const handleSave = async () => {
    await onGuardar(cal, estado, nota, observacion);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1500);
  };

  return (
    <tr className="hover:bg-slate-50">
      <td className="py-2.5 px-4 font-medium text-slate-900">
        {cal.estudiante?.usuario?.apellidos}, {cal.estudiante?.usuario?.nombres}
      </td>
      <td className="py-2.5 px-3">
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="px-2 py-1 rounded border border-slate-300 text-xs"
        >
          <option value="ENTREGADO">Entregado</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="NO_PRESENTO">No presentó</option>
        </select>
      </td>
      <td className="py-2.5 px-3">
        <input
          type="number"
          min="0"
          max="20"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="--"
          className="w-14 px-2 py-1 rounded border border-slate-300 text-xs text-center"
        />
      </td>
      <td className="py-2.5 px-3">
        <input
          type="text"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          placeholder="Comentario..."
          className="w-full min-w-[130px] px-2 py-1 rounded border border-slate-300 text-xs"
        />
      </td>
      <td className="py-2.5 px-4 text-right">
        <button
          type="button"
          onClick={handleSave}
          className="px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
        >
          {guardado ? 'Guardado' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
}
