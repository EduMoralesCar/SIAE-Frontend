import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  PieChart,
  TrendingUp,
  BarChart3,
  Activity,
  Filter,
  Users,
  HeartPulse,
  ShieldAlert,
  FileCheck2,
} from 'lucide-react';
import api from '../api/client';

/**
 * 1. Gráfica de Anillo (Donut Chart SVG) con etiquetas limpias y porcentaje central
 */
function DonutChartSVG({
  segments = [],
  total = 0,
  centerValue = '0%',
  centerLabel = 'Total',
}) {
  const size = 156;
  const strokeWidth = 20;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  const safeTotal = total > 0 ? total : segments.reduce((acc, s) => acc + (s.value || 0), 0);
  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-zinc-800"
          />
          {safeTotal > 0 &&
            segments.map((seg, idx) => {
              if (!seg.value || seg.value <= 0) return null;
              const pct = seg.value / safeTotal;
              const dashArray = `${pct * circumference} ${circumference}`;
              const dashOffset = -accumulatedPercent * circumference;
              accumulatedPercent += pct;

              return (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-xl font-semibold text-slate-900 tabular-nums leading-none">
            {centerValue}
          </span>
          <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider mt-1">
            {centerLabel}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        {segments.map((seg, idx) => {
          const pct = safeTotal > 0 ? Math.round((seg.value / safeTotal) * 100) : 0;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-slate-600 truncate">{seg.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                  <span className="font-semibold text-slate-900">{seg.value}</span>
                  <span className="text-[11px] text-slate-400 w-9 text-right">{pct}%</span>
                </div>
              </div>
              <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: seg.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 2. Gráfica de Dinámica Temporal (Líneas + Área SVG) estilo Dashboard Analítico
 */
function TrendLineChartSVG({ series = [], maxStudents = 30 }) {
  if (!series || series.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-500">
        Sin datos históricos suficientes para graficar tendencia.
      </div>
    );
  }

  const width = 560;
  const height = 190;
  const padLeft = 30;
  const padRight = 14;
  const padTop = 16;
  const padBottom = 26;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(
    maxStudents,
    ...series.map((d) => Math.max(d.presentes || 0, d.tardanzas || 0, d.faltas || 0, 5))
  );

  const getX = (index) => {
    if (series.length <= 1) return padLeft + chartW / 2;
    return padLeft + (index / (series.length - 1)) * chartW;
  };

  const getY = (val) => {
    const ratio = maxVal > 0 ? Math.min(1, Math.max(0, val / maxVal)) : 0;
    return padTop + chartH - ratio * chartH;
  };

  const buildPath = (key) =>
    series
      .map(
        (item, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(item[key] || 0).toFixed(1)}`
      )
      .join(' ');

  const buildArea = (key) => {
    if (series.length === 0) return '';
    const line = buildPath(key);
    const lastX = getX(series.length - 1).toFixed(1);
    const firstX = getX(0).toFixed(1);
    const baseY = (padTop + chartH).toFixed(1);
    return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  const yTicks = [0, Math.round(maxVal * 0.5), maxVal];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pb-1">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Presentes
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Tardanzas
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            Faltas
          </span>
        </div>
        <span className="tabular-nums text-slate-400">Últimos {series.length} días lectivos</span>
      </div>

      <div className="w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="emeraldAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick, idx) => {
            const y = getY(tick);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-slate-200 dark:text-zinc-800"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[9px] tabular-nums"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          <path d={buildArea('presentes')} fill="url(#emeraldAreaFill)" />
          <path
            d={buildPath('presentes')}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={buildPath('tardanzas')}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={buildPath('faltas')}
            fill="none"
            stroke="#EF4444"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {series.map((d, idx) => {
            const x = getX(idx);
            const yPres = getY(d.presentes || 0);
            const yTard = getY(d.tardanzas || 0);
            const yFalt = getY(d.faltas || 0);
            const labelFecha = d.fecha ? d.fecha.slice(5).replace('-', '/') : '';

            return (
              <g key={d.fecha || idx}>
                <circle
                  cx={x}
                  cy={yPres}
                  r="3.2"
                  fill="#10B981"
                  className="stroke-white dark:stroke-zinc-900"
                  strokeWidth="1.5"
                >
                  <title>{`${d.fecha}: ${d.presentes} presentes, ${d.tardanzas} tardanzas, ${d.faltas} faltas`}</title>
                </circle>
                <circle
                  cx={x}
                  cy={yTard}
                  r="2.5"
                  fill="#F59E0B"
                  className="stroke-white dark:stroke-zinc-900"
                  strokeWidth="1.2"
                />
                <circle
                  cx={x}
                  cy={yFalt}
                  r="2.5"
                  fill="#EF4444"
                  className="stroke-white dark:stroke-zinc-900"
                  strokeWidth="1.2"
                />
                <text
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-slate-400 text-[9px] tabular-nums"
                >
                  {labelFecha}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/**
 * 3. Gráfica de Columnas Sólidas por Grado y Sección (inspirada en el dashboard de referencia)
 * Sin ningún solapamiento de etiquetas inferiores.
 */
function VerticalSectionBarChart({
  secciones = [],
  seccionActivaId = '',
  onSelectSeccion,
}) {
  if (!secciones || secciones.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-500">
        Sin secciones registradas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Escala superior tipo semáforo como en la imagen de referencia */}
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-16 h-2 rounded-l-sm bg-emerald-500" />
          <span className="inline-block w-12 h-2 bg-amber-500" />
          <span className="inline-block w-10 h-2 rounded-r-sm bg-red-500" />
          <span className="text-slate-500 ml-1">Escala de asistencia efectiva por aula</span>
        </div>
        <span className="text-slate-400">Clic en un aula para filtrar</span>
      </div>

      {/* Área de columnas con altura fija y etiquetas separadas debajo */}
      <div className="grid grid-cols-5 gap-3 pt-2">
        {secciones.map((s) => {
          const total = s.totalAlumnos || 1;
          const asistentes = (s.presentes || 0) + (s.tardanzas || 0);
          const pctAsistencia = Math.round((asistentes / total) * 100);
          const isSelected = String(seccionActivaId) === String(s.id);

          // Color de columna según rendimiento (como la gráfica inferior derecha de la referencia)
          const barColor =
            pctAsistencia >= 85
              ? '#10B981'
              : pctAsistencia >= 70
                ? '#F59E0B'
                : '#EF4444';

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSeccion && onSelectSeccion(isSelected ? '' : String(s.id))}
              className={`group flex flex-col items-center rounded-lg p-2 border transition ${
                isSelected
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50/60'
              }`}
            >
              {/* Valor superior */}
              <span className="text-xs font-semibold text-slate-900 tabular-nums mb-1.5">
                {pctAsistencia}%
              </span>

              {/* Contenedor de la barra vertical */}
              <div className="w-full max-w-[54px] h-28 bg-slate-100 rounded-md flex flex-col justify-end overflow-hidden p-0.5">
                <div
                  className="w-full rounded-sm transition-all duration-300"
                  style={{
                    height: `${Math.max(pctAsistencia, 10)}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>

              {/* Etiqueta del aula limpia y sin solaparse */}
              <span className="mt-2 text-xs font-semibold text-slate-900 leading-tight">
                {s.etiqueta}
              </span>
              <span className="text-[10px] text-slate-500 tabular-nums mt-0.5">
                {s.presentes}P · {s.tardanzas}T · {s.faltas}F
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 4. Matriz Visual de Calor por Sección (inspirada en la tabla superior derecha con celdas coloreadas)
 */
function SectionHeatmapMatrix({
  secciones = [],
  seccionActivaId = '',
  onSelectSeccion,
}) {
  const totales = secciones.reduce(
    (acc, s) => ({
      alumnos: acc.alumnos + (s.totalAlumnos || 0),
      presentes: acc.presentes + (s.presentes || 0),
      tardanzas: acc.tardanzas + (s.tardanzas || 0),
      faltas: acc.faltas + (s.faltas || 0),
      justificados: acc.justificados + (s.justificados || 0),
      retirados: acc.retirados + (s.retirados || 0),
    }),
    { alumnos: 0, presentes: 0, tardanzas: 0, faltas: 0, justificados: 0, retirados: 0 }
  );

  const pctGlobal =
    totales.alumnos > 0
      ? Math.round(((totales.presentes + totales.tardanzas) / totales.alumnos) * 100)
      : 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
            <th className="py-2 px-3 text-left font-medium">Aula / Tutor</th>
            <th className="py-2 px-2.5 text-center font-medium">% Asist.</th>
            <th className="py-2 px-2.5 text-center font-medium">Pres.</th>
            <th className="py-2 px-2.5 text-center font-medium">Tard.</th>
            <th className="py-2 px-2.5 text-center font-medium">Faltas</th>
            <th className="py-2 px-2.5 text-center font-medium">Justif.</th>
            <th className="py-2 px-2.5 text-center font-medium">Retiros</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {secciones.map((s) => {
            const total = s.totalAlumnos || 1;
            const pct = Math.round(((s.presentes + s.tardanzas) / total) * 100);
            const isSelected = String(seccionActivaId) === String(s.id);

            return (
              <tr
                key={s.id}
                onClick={() => onSelectSeccion && onSelectSeccion(isSelected ? '' : String(s.id))}
                className={`cursor-pointer transition ${
                  isSelected ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                }`}
              >
                <td className="py-2 px-3">
                  <div className="font-semibold text-slate-900">{s.etiqueta}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[155px]">{s.tutor}</div>
                </td>

                {/* Celda Heatmap % Asistencia */}
                <td className="p-1.5 text-center tabular-nums">
                  <div
                    className={`py-1 px-2 rounded font-semibold ${
                      pct >= 85
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : pct >= 70
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {pct}%
                  </div>
                </td>

                {/* Celda Heatmap Presentes */}
                <td className="p-1.5 text-center tabular-nums">
                  <div className="py-1 px-2 rounded bg-emerald-50/70 text-emerald-800 font-semibold">
                    {s.presentes}/{s.totalAlumnos}
                  </div>
                </td>

                {/* Celda Heatmap Tardanzas */}
                <td className="p-1.5 text-center tabular-nums">
                  <div
                    className={`py-1 px-2 rounded font-medium ${
                      s.tardanzas > 0
                        ? 'bg-amber-50 text-amber-800 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.tardanzas}
                  </div>
                </td>

                {/* Celda Heatmap Faltas */}
                <td className="p-1.5 text-center tabular-nums">
                  <div
                    className={`py-1 px-2 rounded font-medium ${
                      s.faltas > 0
                        ? 'bg-red-50 text-red-700 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.faltas}
                  </div>
                </td>

                {/* Celda Heatmap Justificados */}
                <td className="p-1.5 text-center tabular-nums">
                  <div
                    className={`py-1 px-2 rounded font-medium ${
                      s.justificados > 0
                        ? 'bg-sky-50 text-sky-800 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.justificados}
                  </div>
                </td>

                {/* Celda Heatmap Retiros */}
                <td className="p-1.5 text-center tabular-nums">
                  <div
                    className={`py-1 px-2 rounded font-medium ${
                      s.retirados > 0
                        ? 'bg-purple-50 text-purple-800 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.retirados || 0}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900 tabular-nums">
            <td className="py-2 px-3">Total ({totales.alumnos} alumnos)</td>
            <td className="py-2 px-2.5 text-center text-emerald-700">{pctGlobal}%</td>
            <td className="py-2 px-2.5 text-center text-emerald-700">{totales.presentes}</td>
            <td className="py-2 px-2.5 text-center text-amber-600">{totales.tardanzas}</td>
            <td className="py-2 px-2.5 text-center text-red-600">{totales.faltas}</td>
            <td className="py-2 px-2.5 text-center text-sky-700">{totales.justificados}</td>
            <td className="py-2 px-2.5 text-center text-purple-700">{totales.retirados}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const [datos, setDatos] = useState(null);
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [gradoSeccionId, setGradoSeccionId] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [citandoId, setCitandoId] = useState(null);

  const cargarDashboard = async (fecha = fechaFiltro, seccionId = gradoSeccionId) => {
    setCargando(true);
    setError('');
    try {
      const { data } = await api.get('/reportes/dashboard', {
        params: {
          fecha: fecha || undefined,
          grado_seccion_id: seccionId || undefined,
        },
      });
      if (data.ok) {
        setDatos(data);
        if (!fecha && data.kpisHoy?.fecha) {
          setFechaFiltro(data.kpisHoy.fecha);
        }
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo cargar la información del panel.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDashboard('', '');
  }, []);

  const handleCitarApoderado = async (estudianteId, motivo) => {
    setCitandoId(estudianteId);
    try {
      const { data } = await api.post('/reportes/citar-apoderado', {
        estudiante_id: estudianteId,
        motivo,
      });
      alert(data.mensaje);
      await cargarDashboard(fechaFiltro, gradoSeccionId);
    } catch (err) {
      alert(err.response?.data?.mensaje || 'No se pudo enviar la citación.');
    } finally {
      setCitandoId(null);
    }
  };

  if (cargando && !datos) {
    return (
      <div className="py-12 text-center text-slate-500 text-sm">
        Cargando dashboard analítico...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
        {error}
      </div>
    );
  }

  const kpis = datos?.kpisHoy || {};
  const secciones = datos?.resumenPorSeccion || [];
  const gradosSecciones = datos?.gradosSecciones || [];
  const tendenciaDiaria = datos?.tendenciaDiaria || [];
  const distribucionConducta = datos?.distribucionConducta || {
    optimo: 0,
    preventivo: 0,
    critico: 0,
    porNaturaleza: [],
  };
  const alertasAusencias = datos?.alertasAusenciasRecurrentes || [];
  const alertasConducta = datos?.alertasConducta || [];

  const totalMatriculados = kpis.totalMatriculados || 0;
  const totalAsistentesHoy = (kpis.presentes || 0) + (kpis.tardanzas || 0);
  const tasaAsistenciaHoy =
    totalMatriculados > 0 ? Math.round((totalAsistentesHoy / totalMatriculados) * 100) : 0;

  const pctPresentes =
    totalMatriculados > 0 ? Math.round(((kpis.presentes || 0) / totalMatriculados) * 100) : 0;
  const pctTardanzas =
    totalMatriculados > 0 ? Math.round(((kpis.tardanzas || 0) / totalMatriculados) * 100) : 0;
  const pctFaltas =
    totalMatriculados > 0 ? Math.round(((kpis.faltas || 0) / totalMatriculados) * 100) : 0;

  const segmentosAsistencia = [
    { label: 'Presentes a tiempo', value: kpis.presentes || 0, color: '#10B981' },
    { label: 'Tardanzas registradas', value: kpis.tardanzas || 0, color: '#F59E0B' },
    { label: 'Faltas injustificadas', value: kpis.faltas || 0, color: '#EF4444' },
    { label: 'Justificados / Permisos', value: kpis.justificados || 0, color: '#0284C7' },
    { label: 'Retiros en jornada', value: kpis.retirados || 0, color: '#9333EA' },
  ];

  const totalConducta =
    (distribucionConducta.optimo || 0) +
    (distribucionConducta.preventivo || 0) +
    (distribucionConducta.critico || 0);
  const pctOptimoConducta =
    totalConducta > 0 ? Math.round((distribucionConducta.optimo / totalConducta) * 100) : 100;

  const segmentosConducta = [
    { label: 'Óptimo (76–100 pts)', value: distribucionConducta.optimo || 0, color: '#10B981' },
    { label: 'Preventivo (61–75 pts)', value: distribucionConducta.preventivo || 0, color: '#F59E0B' },
    { label: 'Crítico (≤ 60 pts)', value: distribucionConducta.critico || 0, color: '#EF4444' },
  ];

  const pipelineItems = [
    { label: 'Incidencias abiertas', value: kpis.incidenciasAbiertas || 0, color: '#EF4444' },
    { label: 'Citaciones a padres', value: kpis.citacionesPendientes || 0, color: '#F59E0B' },
    { label: 'Reuniones ejecutadas', value: kpis.reunionesRegistradas || 0, color: '#0284C7' },
    { label: 'Actas firmadas', value: kpis.actasEmitidas || 0, color: '#6366F1' },
    { label: 'Compromisos activos', value: kpis.compromisosPendientes || 0, color: '#10B981' },
    {
      label: 'Salud y retiros hoy',
      value: (kpis.situacionesSaludHoy || 0) + (kpis.retirados || 0),
      color: '#9333EA',
    },
  ];
  const maxPipelineVal = Math.max(...pipelineItems.map((i) => i.value || 0), 4);

  const seccionSeleccionadaObj = gradosSecciones.find(
    (g) => String(g.id) === String(gradoSeccionId)
  );

  return (
    <div className="space-y-4">
      {/* CABECERA COMPACTA CON FILTROS */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">Dashboard general institucional</h1>
            {seccionSeleccionadaObj && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                Aula {seccionSeleccionadaObj.grado}° &ldquo;{seccionSeleccionadaObj.seccion}&rdquo;
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Analítica de asistencia, convivencia escolar, salud, retiros y seguimiento ({kpis.fecha})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={gradoSeccionId}
              onChange={(e) => {
                const val = e.target.value;
                setGradoSeccionId(val);
                cargarDashboard(fechaFiltro, val);
              }}
              className="bg-transparent text-xs text-slate-800 focus:outline-none pr-1"
            >
              <option value="">Todos los grados y secciones</option>
              {gradosSecciones.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.grado}° &ldquo;{g.seccion}&rdquo; — Secundaria
                </option>
              ))}
            </select>
          </div>

          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => {
              setFechaFiltro(e.target.value);
              cargarDashboard(e.target.value, gradoSeccionId);
            }}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs"
          />

          <button
            type="button"
            onClick={() => cargarDashboard(fechaFiltro, gradoSeccionId)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* BANDA EJECUTIVA UNIFICADA (Reemplaza las 12 cajas sueltas con exceso de bordes) */}
      <div className="bg-white rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 overflow-hidden">
        {/* Bloque 1: Asistencia General */}
        <div className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium uppercase tracking-wide text-[11px]">
                Asistencia del día
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900 tabular-nums">
                {tasaAsistenciaHoy}%
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                ({totalAsistentesHoy} de {totalMatriculados} alumnos)
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {/* Barra apilada multicapa */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
              <div style={{ width: `${pctPresentes}%`, backgroundColor: '#10B981' }} />
              <div style={{ width: `${pctTardanzas}%`, backgroundColor: '#F59E0B' }} />
              <div style={{ width: `${pctFaltas}%`, backgroundColor: '#EF4444' }} />
            </div>
            <div className="flex items-center justify-between text-[11px] tabular-nums">
              <span className="text-emerald-700 font-medium">{kpis.presentes} Pres.</span>
              <span className="text-amber-600 font-medium">{kpis.tardanzas} Tard.</span>
              <span className="text-red-600 font-medium">{kpis.faltas} Faltas</span>
              <span className="text-sky-700 font-medium">{kpis.justificados} Just.</span>
            </div>
          </div>
        </div>

        {/* Bloque 2: Salud, Retiros y Permisos */}
        <div className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium uppercase tracking-wide text-[11px]">
                Salud, retiros y permisos
              </span>
              <HeartPulse className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900 tabular-nums">
                {(kpis.situacionesSaludHoy || 0) +
                  (kpis.retirados || 0) +
                  (kpis.permisosPendientes || 0)}
              </span>
              <span className="text-xs text-slate-500">atenciones y solicitudes hoy</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-[11px] tabular-nums">
            <div>
              <span className="text-slate-400 block text-[10px]">Salud hoy</span>
              <span className="font-semibold text-slate-900">{kpis.situacionesSaludHoy || 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Retirados</span>
              <span className="font-semibold text-purple-700">{kpis.retirados || 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Permisos pend.</span>
              <span className="font-semibold text-amber-700">{kpis.permisosPendientes || 0}</span>
            </div>
          </div>
        </div>

        {/* Bloque 3: Convivencia e Incidencias */}
        <div className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium uppercase tracking-wide text-[11px]">
                Clima y convivencia
              </span>
              <ShieldAlert className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-emerald-700 tabular-nums">
                {pctOptimoConducta}%
              </span>
              <span className="text-xs text-slate-500">en conducta óptima</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-[11px] tabular-nums">
            <div>
              <span className="text-slate-400 block text-[10px]">Incidencias ab.</span>
              <span className="font-semibold text-red-600">{kpis.incidenciasAbiertas || 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Preventivo</span>
              <span className="font-semibold text-amber-600">
                {distribucionConducta.preventivo || 0}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Riesgo crítico</span>
              <span className="font-semibold text-red-600">
                {distribucionConducta.critico || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Bloque 4: Citaciones, Reuniones y Compromisos */}
        <div className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium uppercase tracking-wide text-[11px]">
                Seguimiento familiar
              </span>
              <FileCheck2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900 tabular-nums">
                {(kpis.citacionesPendientes || 0) +
                  (kpis.reunionesRegistradas || 0) +
                  (kpis.compromisosPendientes || 0)}
              </span>
              <span className="text-xs text-slate-500">acciones con apoderados</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-[11px] tabular-nums">
            <div>
              <span className="text-slate-400 block text-[10px]">Citaciones</span>
              <span className="font-semibold text-amber-700">{kpis.citacionesPendientes || 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Reuniones</span>
              <span className="font-semibold text-slate-900">{kpis.reunionesRegistradas || 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Compromisos</span>
              <span className="font-semibold text-emerald-700">
                {kpis.compromisosPendientes || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FILA CENTRAL DE GRÁFICAS PRINCIPALES (Grid compacto gap-4 como la imagen de referencia) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Dinámica Temporal (5 columnas) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Dinámica diaria de asistencia y tardanzas
              </h2>
              <p className="text-[11px] text-slate-500">
                Curva comparativa de ingresos puntuales, tardanzas y faltas
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>

          <TrendLineChartSVG series={tendenciaDiaria} maxStudents={totalMatriculados} />
        </div>

        {/* Donut Distribución de Asistencia (4 columnas) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Distribución porcentual hoy
              </h2>
              <p className="text-[11px] text-slate-500">
                Desglose sobre {totalMatriculados} estudiantes
              </p>
            </div>
            <PieChart className="w-4 h-4 text-slate-400" />
          </div>

          <DonutChartSVG
            segments={segmentosAsistencia}
            total={totalMatriculados}
            centerValue={`${tasaAsistenciaHoy}%`}
            centerLabel="Asistencia"
          />
        </div>

        {/* Barras Horizontales Compactas de Flujo Operativo (3 columnas) */}
        <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Volumen por etapa
              </h2>
              <p className="text-[11px] text-slate-500">Protocolo de convivencia y salud</p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-2.5 my-auto">
            {pipelineItems.map((item, idx) => {
              const widthPct = Math.max(
                item.value > 0 ? 14 : 4,
                Math.round(((item.value || 0) / maxPipelineVal) * 100)
              );
              return (
                <div key={idx} className="grid grid-cols-12 items-center gap-2 text-xs">
                  <span className="col-span-5 text-[11px] text-slate-600 truncate" title={item.label}>
                    {item.label}
                  </span>
                  <div className="col-span-5 h-3.5 rounded-sm bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all duration-300"
                      style={{ width: `${widthPct}%`, backgroundColor: item.color }}
                    />
                  </div>
                  <span className="col-span-2 text-right font-semibold text-slate-900 tabular-nums text-[11px]">
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FILA 2: Columnas Sólidas por Aula + Matriz de Calor (Heatmap) por Sección */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Columnas Verticales por Aula (5 columnas) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Rendimiento de asistencia por aula
              </h2>
              <p className="text-[11px] text-slate-500">
                Comparativa porcentual de 1° &ldquo;A&rdquo; a 5° &ldquo;A&rdquo; Secundaria
              </p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>

          <VerticalSectionBarChart
            secciones={secciones}
            seccionActivaId={gradoSeccionId}
            onSelectSeccion={(nuevoId) => {
              setGradoSeccionId(nuevoId);
              cargarDashboard(fechaFiltro, nuevoId);
            }}
          />
        </div>

        {/* Matriz de Calor por Sección (7 columnas) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Matriz de calor por grado y sección
              </h2>
              <p className="text-[11px] text-slate-500">
                Mapa de intensidad de asistencia, tardanzas, faltas y retiros por salón
              </p>
            </div>
            {gradoSeccionId && (
              <button
                type="button"
                onClick={() => {
                  setGradoSeccionId('');
                  cargarDashboard(fechaFiltro, '');
                }}
                className="text-[11px] font-medium text-slate-700 underline hover:text-slate-900"
              >
                Restablecer filtro
              </button>
            )}
          </div>

          <SectionHeatmapMatrix
            secciones={secciones}
            seccionActivaId={gradoSeccionId}
            onSelectSeccion={(nuevoId) => {
              setGradoSeccionId(nuevoId);
              cargarDashboard(fechaFiltro, nuevoId);
            }}
          />
        </div>
      </div>

      {/* FILA 3: Gráficas de Barras Horizontales para Ranking de Ausencias, Conducta y Semáforo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Ranking Horizontal 1: Detector de Ausencias y Tardanzas (4 columnas) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Top alertas de inasistencia / tardanza
              </h2>
              <p className="text-[11px] text-slate-500">
                Racha &ge; 3 faltas o &gt; 20% de tardanzas
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold tabular-nums">
              {alertasAusencias.length}
            </span>
          </div>

          {alertasAusencias.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Sin alertas activas</div>
          ) : (
            <div className="space-y-3 my-auto">
              {alertasAusencias.slice(0, 5).map((al) => {
                const isCritica = al.nivelSeveridad === 'CRITICA';
                const barPct = isCritica
                  ? Math.min(100, (al.maxRachaFaltas / 5) * 100)
                  : Math.min(100, al.porcentajeTardanzas);

                return (
                  <div key={al.estudiante_id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 truncate">
                        <span className="font-medium text-slate-900">{al.nombres}</span>
                        <span className="text-slate-400 ml-1.5 text-[11px]">{al.seccion}</span>
                      </div>
                      <button
                        type="button"
                        disabled={citandoId === al.estudiante_id}
                        onClick={() => handleCitarApoderado(al.estudiante_id, al.motivoAlerta)}
                        className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-50 text-[10px] font-medium text-slate-700 shrink-0"
                      >
                        {citandoId === al.estudiante_id ? '...' : 'Citar'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-4 rounded-sm bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-sm flex items-center px-1.5 text-[10px] font-semibold text-white whitespace-nowrap"
                          style={{
                            width: `${Math.max(barPct, 32)}%`,
                            backgroundColor: isCritica ? '#EF4444' : '#F59E0B',
                          }}
                        >
                          {al.motivoAlerta}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ranking Horizontal 2: Seguimiento Conductual <= 75 pts (4 columnas) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Ranking de riesgo conductual (&le; 75 pts)
              </h2>
              <p className="text-[11px] text-slate-500">
                Puntaje actual frente al umbral institucional (100 pts)
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold tabular-nums">
              {alertasConducta.length}
            </span>
          </div>

          {alertasConducta.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Sin casos en riesgo</div>
          ) : (
            <div className="space-y-3 my-auto">
              {alertasConducta.slice(0, 5).map((ac) => {
                const isCritico = ac.puntaje_conducta <= 60;
                return (
                  <div key={ac.estudiante_id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 truncate">
                        <span className="font-medium text-slate-900">{ac.nombres}</span>
                        <span className="text-slate-400 ml-1.5 text-[11px]">{ac.seccion}</span>
                      </div>
                      <button
                        type="button"
                        disabled={citandoId === ac.estudiante_id}
                        onClick={() =>
                          handleCitarApoderado(
                            ac.estudiante_id,
                            `Seguimiento conductual (${ac.puntaje_conducta}/100 pts)`
                          )
                        }
                        className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-50 text-[10px] font-medium text-slate-700 shrink-0"
                      >
                        {citandoId === ac.estudiante_id ? '...' : 'Citar'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-4 rounded-sm bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-sm flex items-center justify-between px-2 text-[10px] font-semibold text-white tabular-nums"
                          style={{
                            width: `${Math.max(ac.puntaje_conducta, 25)}%`,
                            backgroundColor: isCritico ? '#EF4444' : '#F59E0B',
                          }}
                        >
                          <span>{isCritico ? 'Crítico' : 'Preventivo'}</span>
                          <span>{ac.puntaje_conducta}/100 pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Donut 2: Semáforo de Convivencia Escolar (4 columnas) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Semáforo general de conducta
              </h2>
              <p className="text-[11px] text-slate-500">
                Proporción de estudiantes por nivel conductual
              </p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>

          <DonutChartSVG
            segments={segmentosConducta}
            total={totalConducta}
            centerValue={`${pctOptimoConducta}%`}
            centerLabel="Óptimo"
          />
        </div>
      </div>
    </div>
  );
}
