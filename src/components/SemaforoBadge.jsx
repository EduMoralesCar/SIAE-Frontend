import React from 'react';

export function obtenerConfigSemaforo(puntaje = 100) {
  if (puntaje >= 76) {
    return {
      color: 'VERDE',
      etiqueta: 'Óptimo',
      bgBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      barra: 'bg-emerald-600',
    };
  }
  if (puntaje >= 61) {
    return {
      color: 'AMARILLO',
      etiqueta: 'Preventivo',
      bgBadge: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      barra: 'bg-amber-500',
    };
  }
  return {
    color: 'ROJO',
    etiqueta: 'Crítico',
    bgBadge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    barra: 'bg-red-600',
  };
}

export default function SemaforoBadge({ puntaje = 100, mostrarBarra = false }) {
  const cfg = obtenerConfigSemaforo(puntaje);

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${cfg.bgBadge}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        <span>
          {puntaje}/100 · {cfg.etiqueta}
        </span>
      </span>
      {mostrarBarra && (
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${cfg.barra}`}
            style={{ width: `${Math.max(0, Math.min(100, puntaje))}%` }}
          />
        </div>
      )}
    </div>
  );
}
