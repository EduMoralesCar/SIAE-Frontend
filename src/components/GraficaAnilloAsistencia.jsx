import React from 'react';

/**
 * Gráfica de anillo (Donut SVG) de resumen de asistencia individual o grupal
 * Adaptada a Modo Claro (Sol) y Modo Oscuro (Luna) bajo directrices Unslop
 */
export default function GraficaAnilloAsistencia({ resumen = {} }) {
  const presentes = Number(resumen.presentes || 0);
  const tardanzas = Number(resumen.tardanzas || 0);
  const faltas = Number(resumen.faltas || 0);
  const justificados = Number(resumen.justificados || 0);
  const retirados = Number(resumen.retirados || 0);

  const total = presentes + tardanzas + faltas + justificados + retirados;
  const pctAsistencia =
    resumen.porcentajeAsistencia !== undefined
      ? resumen.porcentajeAsistencia
      : total > 0
        ? Math.round(((presentes + tardanzas) / total) * 100)
        : 100;

  const segments = [
    { label: 'Presentes', value: presentes, color: '#10B981' },
    { label: 'Tardanzas', value: tardanzas, color: '#F59E0B' },
    { label: 'Faltas', value: faltas, color: '#EF4444' },
    { label: 'Justif. / Perm.', value: justificados, color: '#0284C7' },
    ...(retirados > 0 ? [{ label: 'Retiros', value: retirados, color: '#9333EA' }] : []),
  ];

  const size = 132;
  const strokeWidth = 18;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 mb-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-zinc-800"
          />
          {total > 0 &&
            segments.map((seg, idx) => {
              if (!seg.value || seg.value <= 0) return null;
              const pct = seg.value / total;
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
          <span className="text-base font-semibold text-slate-900 tabular-nums leading-none">
            {pctAsistencia}%
          </span>
          <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider mt-1">
            Asistencia
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        {segments.map((seg, idx) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-slate-600">{seg.label}</span>
                </div>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {seg.value} <span className="text-[11px] font-normal text-slate-400">({pct}%)</span>
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
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
