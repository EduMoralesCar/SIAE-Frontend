import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import api from '../api/client';
import { exportarReporteOficialPDF } from '../utils/exportadores';

export default function ReportesPage() {
  const [grados, setGrados] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [gradoSeccionId, setGradoSeccionId] = useState('');
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pestana, setPestana] = useState('consolidado');

  const [consolidado, setConsolidado] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [auditorias, setAuditorias] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [situacionesSalud, setSituacionesSalud] = useState([]);
  const [retiros, setRetiros] = useState([]);
  const [incidencias, setIncidencias] = useState([]);
  const [citaciones, setCitaciones] = useState([]);
  const [compromisos, setCompromisos] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [exportandoExcel, setExportandoExcel] = useState(false);

  const cargarReporte = async () => {
    setCargando(true);
    try {
      const [resRep, resGrados] = await Promise.all([
        api.get('/reportes/multicriterio', {
          params: {
            fecha_inicio: fechaInicio || undefined,
            fecha_fin: fechaFin || undefined,
            grado_seccion_id: gradoSeccionId || undefined,
            estado: estado || undefined,
            busqueda: busqueda || undefined,
          },
        }),
        api.get('/grados-secciones'),
      ]);
      if (resRep.data?.ok) {
        setConsolidado(resRep.data.consolidadoEstudiantes || []);
        setRegistros(resRep.data.registros || []);
        setAuditorias(resRep.data.auditorias || []);
        setPermisos(resRep.data.permisos || []);
        setSituacionesSalud(resRep.data.situacionesSalud || []);
        setRetiros(resRep.data.retiros || []);
        setIncidencias(resRep.data.incidencias || []);
        setCitaciones(resRep.data.citaciones || []);
        setCompromisos(resRep.data.compromisos || []);
      }
      if (resGrados.data?.grados) setGrados(resGrados.data.grados);
    } catch {
      // Ignorar
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarReporte();
  }, [fechaInicio, fechaFin, gradoSeccionId, estado]);

  const handleExportarPDF = () => {
    const seccionObj = grados.find((g) => String(g.id) === String(gradoSeccionId));
    exportarReporteOficialPDF({
      consolidadoEstudiantes: consolidado,
      registros,
      auditorias,
      filtros: {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        seccionTexto: seccionObj ? `${seccionObj.grado}° "${seccionObj.seccion}"` : 'Todas',
        estado,
      },
    });
  };

  const handleExportarExcel = async () => {
    setExportandoExcel(true);
    try {
      const response = await api.get('/reportes/exportar-excel', {
        params: {
          fecha_inicio: fechaInicio || undefined,
          fecha_fin: fechaFin || undefined,
          grado_seccion_id: gradoSeccionId || undefined,
          estado: estado || undefined,
          busqueda: busqueda || undefined,
        },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Reporte_Integral_SIAE_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('No se pudo generar el archivo Excel.');
    } finally {
      setExportandoExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Centro de reportes institucionales
          </h1>
          <p className="text-xs text-slate-500">
            Reportes de asistencia, permisos, retiros, situaciones de salud, incidencias, citaciones y compromisos (PDF y Excel .xlsx)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportarPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportarExcel}
            disabled={exportandoExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{exportandoExcel ? 'Exportando...' : 'Exportar Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Filtros multicriterio */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Hasta</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Grado y sección
          </label>
          <select
            value={gradoSeccionId}
            onChange={(e) => setGradoSeccionId(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-xs"
          >
            <option value="">Todas (1° a 5° Sec.)</option>
            {grados
              .filter((g) => g.anio_escolar === 2026)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.grado}° &ldquo;{g.seccion}&rdquo; Secundaria
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Estado asistencia
          </label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-xs"
          >
            <option value="">Todos</option>
            <option value="PRESENTE">Presente</option>
            <option value="TARDANZA">Tardanza</option>
            <option value="FALTA">Falta</option>
            <option value="JUSTIFICADO">Falta justificada</option>
            <option value="PERMISO">Permiso</option>
            <option value="RETIRADO">Retirado</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Estudiante</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Apellido, DNI o código..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-xs"
            />
            <button
              type="button"
              onClick={cargarReporte}
              className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium"
            >
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Selector de vista del reporte (Sección 63) */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPestana('consolidado')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pestana === 'consolidado'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Consolidado general ({consolidado.length})
            </button>
            <button
              type="button"
              onClick={() => setPestana('detalle')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pestana === 'detalle'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Asistencia, tardanzas y faltas ({registros.length})
            </button>
            <button
              type="button"
              onClick={() => setPestana('jornada')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pestana === 'jornada'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Permisos, salud y retiros ({permisos.length + situacionesSalud.length + retiros.length})
            </button>
            <button
              type="button"
              onClick={() => setPestana('seguimiento')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pestana === 'seguimiento'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Incidencias, citaciones y compromisos (
              {incidencias.length + citaciones.length + compromisos.length})
            </button>
            <button
              type="button"
              onClick={() => setPestana('auditoria')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pestana === 'auditoria'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Auditoría ({auditorias.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {cargando ? (
            <div className="p-8 text-center text-xs text-slate-400">Cargando datos...</div>
          ) : pestana === 'consolidado' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Token QR</th>
                  <th className="py-2.5 px-4 font-medium">Estudiante</th>
                  <th className="py-2.5 px-3 text-center font-medium">Sección</th>
                  <th className="py-2.5 px-2.5 text-center font-medium">Pres.</th>
                  <th className="py-2.5 px-2.5 text-center font-medium">Tard.</th>
                  <th className="py-2.5 px-2.5 text-center font-medium">Faltas</th>
                  <th className="py-2.5 px-2.5 text-center font-medium">Just./Perm.</th>
                  <th className="py-2.5 px-2.5 text-center font-medium">Retiros</th>
                  <th className="py-2.5 px-2.5 text-center font-medium">Incid.</th>
                  <th className="py-2.5 px-2.5 text-center font-medium">Citac.</th>
                  <th className="py-2.5 px-2.5 text-center font-medium">Compr.</th>
                  <th className="py-2.5 px-3 text-center font-medium">% Asist.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consolidado.map((c) => (
                  <tr key={c.estudiante_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                      {c.codigo_qr_unico || c.codigo_estudiante}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {c.apellidos_nombres}{' '}
                      <span className="text-[11px] font-normal text-slate-400">({c.dni})</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">{c.seccion}</td>
                    <td className="py-2.5 px-2.5 text-center text-emerald-700 font-medium">
                      {c.presentes}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-amber-600 font-medium">
                      {c.tardanzas}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-red-600 font-medium">
                      {c.faltas}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-sky-700 font-medium">
                      {c.justificados}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-purple-700 font-medium">
                      {c.retirados || 0}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-slate-700">
                      {c.incidencias_count || 0}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-slate-700">
                      {c.citaciones_count || 0}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-slate-700">
                      {c.compromisos_count || 0}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-900">
                      {c.porcentaje_asistencia}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : pestana === 'detalle' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Fecha</th>
                  <th className="py-2.5 px-4 font-medium">Estudiante</th>
                  <th className="py-2.5 px-3 font-medium">Sección</th>
                  <th className="py-2.5 px-3 font-medium">Entrada / Salida</th>
                  <th className="py-2.5 px-3 font-medium">Estado</th>
                  <th className="py-2.5 px-4 font-medium">Registrado por</th>
                  <th className="py-2.5 px-4 font-medium">Motivo / Justificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.slice(0, 150).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-slate-600">{r.fecha}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {r.estudiante?.usuario?.apellidos}, {r.estudiante?.usuario?.nombres}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {r.estudiante?.grado_seccion?.grado}° &ldquo;
                      {r.estudiante?.grado_seccion?.seccion}&rdquo;
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {r.hora_entrada || '--:--'} / {r.hora_salida || '--:--'}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{r.estado}</td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {r.registrado_por
                        ? `${r.registrado_por.nombres} ${r.registrado_por.apellidos}`
                        : 'Cierre automático'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {r.motivo_justificacion || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : pestana === 'jornada' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Módulo</th>
                  <th className="py-2.5 px-3 font-medium">Fecha / Hora</th>
                  <th className="py-2.5 px-4 font-medium">Estudiante</th>
                  <th className="py-2.5 px-3 font-medium">Motivo / Tipo</th>
                  <th className="py-2.5 px-4 font-medium">Detalle / Persona que recogió</th>
                  <th className="py-2.5 px-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permisos.map((p) => (
                  <tr key={`p-${p.id}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-sky-700">PERMISO</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{p.fecha}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {p.estudiante?.usuario?.apellidos}, {p.estudiante?.usuario?.nombres}
                    </td>
                    <td className="py-2.5 px-3">{p.tipo}</td>
                    <td className="py-2.5 px-4 text-slate-600">{p.descripcion}</td>
                    <td className="py-2.5 px-4 font-semibold">{p.estado}</td>
                  </tr>
                ))}
                {situacionesSalud.map((s) => (
                  <tr key={`s-${s.id}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-amber-700">SALUD</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {s.fecha} {s.hora}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {s.estudiante?.usuario?.apellidos}, {s.estudiante?.usuario?.nombres}
                    </td>
                    <td className="py-2.5 px-3">{s.tipo_situacion}</td>
                    <td className="py-2.5 px-4 text-slate-600">{s.descripcion}</td>
                    <td className="py-2.5 px-4 font-semibold">{s.estado}</td>
                  </tr>
                ))}
                {retiros.map((ret) => (
                  <tr key={`r-${ret.id}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-purple-700">RETIRO</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {ret.fecha} {ret.hora_salida}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {ret.estudiante?.usuario?.apellidos}, {ret.estudiante?.usuario?.nombres}
                    </td>
                    <td className="py-2.5 px-3">{ret.motivo}</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      Recogió: {ret.recogido_por_nombre} ({ret.parentesco}, DNI{' '}
                      {ret.recogido_por_dni})
                    </td>
                    <td className="py-2.5 px-4 font-semibold">RETIRADO</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : pestana === 'seguimiento' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Módulo</th>
                  <th className="py-2.5 px-3 font-medium">Código / Fecha</th>
                  <th className="py-2.5 px-4 font-medium">Estudiante</th>
                  <th className="py-2.5 px-3 font-medium">Clasificación / Responsable</th>
                  <th className="py-2.5 px-4 font-medium">Descripción / Compromiso</th>
                  <th className="py-2.5 px-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidencias.map((inc) => (
                  <tr key={`inc-${inc.id}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-red-700">INCIDENCIA</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {inc.codigo || `#${inc.id}`}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {inc.estudiante?.usuario?.apellidos}, {inc.estudiante?.usuario?.nombres}
                    </td>
                    <td className="py-2.5 px-3">
                      {inc.naturaleza} ({inc.gravedad})
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {inc.categoria}: {inc.descripcion}
                    </td>
                    <td className="py-2.5 px-4 font-semibold">{inc.estado}</td>
                  </tr>
                ))}
                {citaciones.map((cit) => (
                  <tr key={`cit-${cit.id}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-amber-700">CITACIÓN</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {cit.fecha_programada} {cit.hora_programada}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {cit.estudiante?.usuario?.apellidos}, {cit.estudiante?.usuario?.nombres}
                    </td>
                    <td className="py-2.5 px-3">
                      {cit.lugar} ({cit.rol_responsable})
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{cit.motivo}</td>
                    <td className="py-2.5 px-4 font-semibold">{cit.estado}</td>
                  </tr>
                ))}
                {compromisos.map((cmp) => (
                  <tr key={`cmp-${cmp.id}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-sky-700">COMPROMISO</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {cmp.codigo} ({cmp.fecha_seguimiento})
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {cmp.estudiante?.usuario?.apellidos}, {cmp.estudiante?.usuario?.nombres}
                    </td>
                    <td className="py-2.5 px-3">{cmp.responsable_compromiso}</td>
                    <td className="py-2.5 px-4 text-slate-600">{cmp.descripcion}</td>
                    <td className="py-2.5 px-4 font-semibold">{cmp.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Fecha de modificación</th>
                  <th className="py-2.5 px-4 font-medium">Fecha asistencia</th>
                  <th className="py-2.5 px-4 font-medium">Estudiante</th>
                  <th className="py-2.5 px-4 font-medium">Cambio</th>
                  <th className="py-2.5 px-4 font-medium">Responsable</th>
                  <th className="py-2.5 px-4 font-medium">Sustento / Documento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditorias.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {new Date(a.fecha_hora_cambio).toLocaleString('es-PE')}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">{a.asistencia?.fecha}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {a.asistencia?.estudiante?.usuario?.apellidos},{' '}
                      {a.asistencia?.estudiante?.usuario?.nombres}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {a.estado_anterior} &rarr; {a.estado_nuevo}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {a.modificado_por?.nombres} {a.modificado_por?.apellidos} (
                      {a.modificado_por?.rol})
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{a.motivo_cambio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
