import React, { useEffect, useState } from 'react';
import api from '../api/client';
import CarnetQRCard from '../components/CarnetQRCard';
import SemaforoBadge from '../components/SemaforoBadge';
import GraficaAnilloAsistencia from '../components/GraficaAnilloAsistencia';

export default function PortalEstudiantePage() {
  const [expediente, setExpediente] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api
      .get('/portal/estudiante')
      .then((res) => {
        if (res.data?.expediente) setExpediente(res.data.expediente);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return <div className="py-12 text-center text-slate-500 text-sm">Cargando...</div>;
  }

  if (!expediente) {
    return (
      <div className="p-6 bg-white rounded-lg border border-slate-200 text-center text-xs text-slate-600">
        No se encontró perfil de estudiante activo.
      </div>
    );
  }

  const resumen = expediente.resumenAsistencia || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Mi carnet y asistencia</h1>
          <p className="text-xs text-slate-500">
            {expediente.usuario?.nombres} {expediente.usuario?.apellidos} ·{' '}
            {expediente.grado_seccion?.grado}° &ldquo;{expediente.grado_seccion?.seccion}&rdquo;
          </p>
        </div>
        <SemaforoBadge puntaje={expediente.puntaje_conducta} mostrarBarra={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200 flex flex-col items-center">
          <CarnetQRCard estudiante={expediente} mostrarBotones={true} />
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-5 rounded-lg border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3">
              Resumen de asistencia ({resumen.porcentajeAsistencia}%)
            </h2>

            <GraficaAnilloAsistencia resumen={resumen} />

            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              <div className="p-2.5 rounded-md border border-slate-200">
                <p className="text-lg font-semibold text-emerald-700">{resumen.presentes}</p>
                <p className="text-[11px] text-slate-500">Presentes</p>
              </div>
              <div className="p-2.5 rounded-md border border-slate-200">
                <p className="text-lg font-semibold text-amber-600">{resumen.tardanzas}</p>
                <p className="text-[11px] text-slate-500">Tardanzas</p>
              </div>
              <div className="p-2.5 rounded-md border border-slate-200">
                <p className="text-lg font-semibold text-red-600">{resumen.faltas}</p>
                <p className="text-[11px] text-slate-500">Faltas</p>
              </div>
              <div className="p-2.5 rounded-md border border-slate-200">
                <p className="text-lg font-semibold text-slate-700">{resumen.justificados}</p>
                <p className="text-[11px] text-slate-500">Justif.</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {(expediente.asistencias || []).slice(0, 8).map((a) => (
                <div key={a.id} className="py-2 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-700">{a.fecha}</span>
                  <span className="text-slate-500">
                    {a.hora_entrada || '--:--'} / {a.hora_salida || '--:--'}
                  </span>
                  <span className="font-medium text-slate-900">{a.estado}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3">
              Actividades asignadas
            </h2>
            <div className="divide-y divide-slate-100">
              {(expediente.calificaciones || []).map((cal) => (
                <div key={cal.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">{cal.actividad?.curso_nombre}: </span>
                    <span className="font-medium text-slate-900">
                      {cal.actividad?.titulo_actividad}
                    </span>
                  </div>
                  <span className="font-medium text-slate-700">
                    {cal.estado_entrega} {cal.nota !== null ? `(${cal.nota})` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
