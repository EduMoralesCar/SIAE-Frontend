import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

/**
 * Selector inteligente de estudiantes con filtro previo por Grado/Sección
 * y buscador rápido por DNI, apellidos, nombres o código QR (escalable a +100 alumnos).
 */
export default function SelectorEstudiante({
  estudiantes = [],
  value = '',
  onChange,
  label = 'Estudiante',
  required = true,
  mostrarPuntaje = false,
  permitirVacio = false,
  textoVacio = 'Seleccionar estudiante...',
}) {
  const [gradoFiltro, setGradoFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Extraer lista única de grados/secciones ordenada (1° A .. 5° A)
  const seccionesUnicas = useMemo(() => {
    const mapa = new Map();
    for (const e of estudiantes) {
      const gs = e.grado_seccion;
      if (gs && !mapa.has(gs.id)) {
        mapa.set(gs.id, {
          id: String(gs.id),
          grado: gs.grado,
          seccion: gs.seccion,
          etiqueta: `${gs.grado}° "${gs.seccion}"`,
        });
      }
    }
    return Array.from(mapa.values()).sort(
      (a, b) => a.grado - b.grado || a.seccion.localeCompare(b.seccion)
    );
  }, [estudiantes]);

  // Filtrar y ordenar alfabéticamente por apellidos
  const estudiantesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return estudiantes
      .filter((e) => {
        if (gradoFiltro && String(e.grado_seccion_id || e.grado_seccion?.id) !== String(gradoFiltro)) {
          return false;
        }
        if (!q) return true;
        const apellidos = (e.usuario?.apellidos || '').toLowerCase();
        const nombres = (e.usuario?.nombres || '').toLowerCase();
        const dni = (e.usuario?.dni || '').toLowerCase();
        const qr = (e.codigo_qr_unico || '').toLowerCase();
        const cod = (e.codigo_estudiante || '').toLowerCase();
        return (
          apellidos.includes(q) ||
          nombres.includes(q) ||
          `${apellidos} ${nombres}`.includes(q) ||
          `${nombres} ${apellidos}`.includes(q) ||
          dni.includes(q) ||
          qr.includes(q) ||
          cod.includes(q)
        );
      })
      .sort((a, b) => {
        const apA = a.usuario?.apellidos || '';
        const apB = b.usuario?.apellidos || '';
        return apA.localeCompare(apB, 'es');
      });
  }, [estudiantes, gradoFiltro, busqueda]);

  const handleCambioGrado = (nuevoGradoId) => {
    setGradoFiltro(nuevoGradoId);
    const candidatos = estudiantes
      .filter(
        (e) =>
          !nuevoGradoId ||
          String(e.grado_seccion_id || e.grado_seccion?.id) === String(nuevoGradoId)
      )
      .sort((a, b) => (a.usuario?.apellidos || '').localeCompare(b.usuario?.apellidos || '', 'es'));

    if (candidatos.length > 0 && !permitirVacio) {
      const actualSigue = candidatos.some((c) => String(c.id) === String(value));
      if (!actualSigue && onChange) {
        onChange(String(candidatos[0].id));
      }
    }
  };

  const handleCambioBusqueda = (texto) => {
    setBusqueda(texto);
    const q = texto.trim().toLowerCase();
    if (!q) return;

    const candidatos = estudiantes
      .filter((e) => {
        if (gradoFiltro && String(e.grado_seccion_id || e.grado_seccion?.id) !== String(gradoFiltro)) {
          return false;
        }
        const apellidos = (e.usuario?.apellidos || '').toLowerCase();
        const nombres = (e.usuario?.nombres || '').toLowerCase();
        const dni = (e.usuario?.dni || '').toLowerCase();
        const qr = (e.codigo_qr_unico || '').toLowerCase();
        return (
          apellidos.includes(q) ||
          nombres.includes(q) ||
          dni.includes(q) ||
          qr.includes(q)
        );
      })
      .sort((a, b) => (a.usuario?.apellidos || '').localeCompare(b.usuario?.apellidos || '', 'es'));

    if (candidatos.length > 0 && !permitirVacio) {
      const actualSigue = candidatos.some((c) => String(c.id) === String(value));
      if (!actualSigue && onChange) {
        onChange(String(candidatos[0].id));
      }
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-slate-700">{label}</label>
        <span className="text-[10px] font-mono text-slate-400">
          {estudiantesFiltrados.length} de {estudiantes.length} alumno(s)
        </span>
      </div>

      {/* Barra de filtro rápido: Grado/Sección + Buscador por DNI o Nombre */}
      <div className="grid grid-cols-12 gap-1.5">
        <div className="col-span-5">
          <select
            value={gradoFiltro}
            onChange={(e) => handleCambioGrado(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-[11px]"
            title="Filtrar por grado y sección"
          >
            <option value="">Todos los grados</option>
            {seccionesUnicas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.etiqueta} Sec.
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-7 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => handleCambioBusqueda(e.target.value)}
            placeholder="Buscar DNI o apellido..."
            className="w-full pl-7 pr-2.5 py-1.5 rounded-md border border-slate-300 text-[11px]"
          />
        </div>
      </div>

      {/* Selector de estudiante filtrado y ordenado alfabéticamente */}
      <select
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs font-medium"
        required={required}
      >
        {permitirVacio && <option value="">{textoVacio}</option>}
        {estudiantesFiltrados.length === 0 ? (
          <option value="">Sin coincidencias para el filtro...</option>
        ) : (
          estudiantesFiltrados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.usuario?.apellidos}, {e.usuario?.nombres} — DNI {e.usuario?.dni} (
              {e.grado_seccion?.grado}° &ldquo;{e.grado_seccion?.seccion}&rdquo;)
              {mostrarPuntaje ? ` · ${e.puntaje_conducta} pts` : ''}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
