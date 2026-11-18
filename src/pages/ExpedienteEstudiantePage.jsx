import React, { useEffect, useState } from 'react';
import {
  Clock,
  Calendar,
  FileText,
  GraduationCap,
  ShieldCheck,
  HeartPulse,
  UserCheck,
  AlertTriangle,
  FileSignature,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api/client';
import SelectorEstudiante from '../components/SelectorEstudiante';

export default function ExpedienteEstudiantePage() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudianteId, setEstudianteId] = useState('');
  const [anioFiltro, setAnioFiltro] = useState('TODOS');
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODAS');

  const [estudianteDetalle, setEstudianteDetalle] = useState(null);
  const [historialPorAnio, setHistorialPorAnio] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api
      .get('/estudiantes')
      .then((res) => {
        if (res.data?.estudiantes && res.data.estudiantes.length > 0) {
          setEstudiantes(res.data.estudiantes);
          setEstudianteId(String(res.data.estudiantes[0].id));
        }
      })
      .catch(() => {});
  }, []);

  const cargarLineaTiempo = async () => {
    if (!estudianteId) return;
    setCargando(true);
    try {
      const { data } = await api.get(`/estudiantes/${estudianteId}/linea-tiempo`, {
        params: {
          anio_escolar: anioFiltro,
          categoria: categoriaFiltro,
        },
      });
      if (data.ok) {
        setEstudianteDetalle(data.estudiante);
        setHistorialPorAnio(data.historialPorAnio || []);
        setEventos(data.eventosLineaTiempo || []);
      }
    } catch {
      // Ignorar
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarLineaTiempo();
  }, [estudianteId, anioFiltro, categoriaFiltro]);

  const exportarHistorialPDF = () => {
    if (!estudianteDetalle) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const nombreCompleto = `${estudianteDetalle.usuario?.apellidos}, ${estudianteDetalle.usuario?.nombres}`;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SIAE — ANTECEDENTES Y LÍNEA DE TIEMPO DEL ESTUDIANTE', 14, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `Estudiante: ${nombreCompleto}   |   Código QR: ${estudianteDetalle.codigo_qr_unico}   |   DNI: ${estudianteDetalle.usuario?.dni}`,
      14,
      16.5
    );

    autoTable(doc, {
      startY: 28,
      head: [
        [
          'Año Escolar',
          'Grado y Sección',
          'Matrícula',
          'Presentes',
          'Tard.',
          'Faltas',
          'Permisos',
          'Retiros',
          'Incid.',
          'Comprom.',
        ],
      ],
      body: historialPorAnio.map((h) => [
        h.anio_escolar,
        h.grado_seccion,
        h.estado_matricula,
        h.asistencias,
        h.tardanzas,
        h.faltas,
        h.permisos,
        h.retiros,
        h.incidencias,
        h.compromisos,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    });

    const startYEventos = (doc.lastAutoTable?.finalY || 50) + 8;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('LÍNEA DE TIEMPO CRONOLÓGICA DE EVENTOS', 14, startYEventos);

    autoTable(doc, {
      startY: startYEventos + 3,
      head: [['Fecha y Hora', 'Categoría', 'Evento', 'Descripción / Detalle', 'Responsable']],
      body: eventos.slice(0, 120).map((e) => [
        `${e.fecha} ${e.hora}`,
        e.categoria,
        e.titulo,
        e.descripcion,
        e.responsable || '-',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    });

    doc.save(`Expediente_${estudianteDetalle.codigo_estudiante || estudianteDetalle.id}.pdf`);
  };

  const badgeCategoria = (cat) => {
    if (cat === 'ASISTENCIA') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (cat === 'SALUD' || cat === 'NOTIFICACION' || cat === 'CONFIRMACION')
      return 'bg-amber-50 text-amber-800 border-amber-200';
    if (cat === 'RETIRO') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (cat === 'INCIDENCIA' || cat === 'CITACION')
      return 'bg-red-50 text-red-700 border-red-200';
    if (cat === 'ACTA' || cat === 'COMPROMISO' || cat === 'SEGUIMIENTO')
      return 'bg-sky-50 text-sky-700 border-sky-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Antecedentes, historial multianual y línea de tiempo del estudiante
          </h1>
          <p className="text-xs text-slate-500">
            Trazabilidad cronológica de asistencia, salud, confirmaciones, retiros, permisos, incidencias, citaciones, actas y compromisos
          </p>
        </div>

        <button
          type="button"
          onClick={exportarHistorialPDF}
          disabled={!estudianteDetalle}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition self-start sm:self-auto"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Exportar expediente PDF</span>
        </button>
      </div>

      {/* Filtros de Estudiante, Año Escolar y Categoría */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        <div className="lg:col-span-6">
          <SelectorEstudiante
            estudiantes={estudiantes}
            value={estudianteId}
            onChange={(val) => setEstudianteId(val)}
          />
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Año escolar (Sección 51)
          </label>
          <select
            value={anioFiltro}
            onChange={(e) => setAnioFiltro(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
          >
            <option value="TODOS">Todos los años escolares</option>
            <option value="2026">Año Escolar 2026 (Activo)</option>
            <option value="2025">Año Escolar 2025 (Histórico)</option>
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de evento</label>
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
          >
            <option value="TODAS">Todos los eventos ({eventos.length})</option>
            <option value="ASISTENCIA">Asistencia, Tardanzas y Faltas</option>
            <option value="PERMISO">Solicitudes de Permiso</option>
            <option value="SALUD">Situaciones de Salud</option>
            <option value="CONFIRMACION">Confirmaciones del Padre</option>
            <option value="RETIRO">Retiros de la Jornada</option>
            <option value="INCIDENCIA">Incidencias</option>
            <option value="CITACION">Citaciones</option>
            <option value="REUNION">Reuniones</option>
            <option value="ACTA">Actas de Conocimiento y Compromiso</option>
            <option value="COMPROMISO">Compromisos</option>
            <option value="SEGUIMIENTO">Seguimiento de Compromisos</option>
          </select>
        </div>
      </div>

      {/* Resumen de Matrículas y Antecedentes por Año Escolar (Sección 51 y 52) */}
      {historialPorAnio.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {historialPorAnio.map((h) => (
            <div
              key={h.matricula_id}
              className="bg-white p-4 rounded-lg border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-900 uppercase">
                    AÑO ESCOLAR {h.anio_escolar} — {h.grado_seccion}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700">
                  {h.estado_matricula}
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center text-[11px]">
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                  <span className="block font-bold text-emerald-700">{h.asistencias}</span>
                  <span className="text-[10px] text-slate-500">Asist.</span>
                </div>
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                  <span className="block font-bold text-amber-700">{h.tardanzas}</span>
                  <span className="text-[10px] text-slate-500">Tard.</span>
                </div>
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                  <span className="block font-bold text-red-700">{h.faltas}</span>
                  <span className="text-[10px] text-slate-500">Faltas</span>
                </div>
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                  <span className="block font-bold text-sky-700">{h.permisos}</span>
                  <span className="text-[10px] text-slate-500">Perm.</span>
                </div>
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                  <span className="block font-bold text-purple-700">{h.retiros}</span>
                  <span className="text-[10px] text-slate-500">Retiros</span>
                </div>
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                  <span className="block font-bold text-slate-800">{h.incidencias}</span>
                  <span className="text-[10px] text-slate-500">Incid.</span>
                </div>
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                  <span className="block font-bold text-slate-800">{h.reuniones}</span>
                  <span className="text-[10px] text-slate-500">Reun.</span>
                </div>
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200">
                  <span className="block font-bold text-slate-800">{h.compromisos}</span>
                  <span className="text-[10px] text-slate-500">Compr.</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Línea de Tiempo del Estudiante (Secciones 50 y 79) */}
      <div className="bg-white p-5 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
              Línea de tiempo del estudiante ({eventos.length} eventos registrados)
            </h2>
            {estudianteDetalle && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                {estudianteDetalle.usuario?.nombres} {estudianteDetalle.usuario?.apellidos} · Token
                QR activo: <span className="font-mono">{estudianteDetalle.codigo_qr_unico}</span>
              </p>
            )}
          </div>
        </div>

        {cargando ? (
          <p className="py-12 text-center text-xs text-slate-400">
            Cargando línea de tiempo del estudiante...
          </p>
        ) : eventos.length === 0 ? (
          <p className="py-12 text-center text-xs text-slate-400">
            No se encontraron eventos para el filtro seleccionado.
          </p>
        ) : (
          <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
            {eventos.map((ev) => (
              <div key={ev.id} className="relative group">
                <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-white" />

                <div className="p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-xs space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-800">
                        {ev.fecha} — {ev.hora}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeCategoria(
                          ev.categoria
                        )}`}
                      >
                        {ev.categoria}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      Responsable: <strong className="text-slate-600">{ev.responsable}</strong>
                    </span>
                  </div>

                  <p className="font-semibold text-slate-900">{ev.titulo}</p>
                  <p className="text-slate-600">{ev.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
