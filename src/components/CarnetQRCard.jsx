import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, FileText } from 'lucide-react';
import { descargarCarnetPNG, descargarCarnetPDF } from '../utils/exportadores';

export default function CarnetQRCard({ estudiante, mostrarBotones = true }) {
  const cardRef = useRef(null);
  const [descargando, setDescargando] = useState(false);

  if (!estudiante) return null;

  const nombres = estudiante.usuario?.nombres || '';
  const apellidos = estudiante.usuario?.apellidos || '';
  const grado = estudiante.grado_seccion?.grado || '1';
  const seccion = estudiante.grado_seccion?.seccion || 'A';
  const anio = estudiante.grado_seccion?.anio_escolar || 2026;
  const codigoQR = estudiante.codigo_qr_unico || estudiante.codigo_estudiante;
  const iniciales = `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();

  const handleDescargarPNG = async () => {
    setDescargando(true);
    try {
      await descargarCarnetPNG(cardRef.current, `Fotocheck_SIAE_${codigoQR}.png`);
    } finally {
      setDescargando(false);
    }
  };

  const handleDescargarPDF = async () => {
    setDescargando(true);
    try {
      await descargarCarnetPDF(cardRef.current, `Fotocheck_SIAE_${codigoQR}.pdf`);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="flex flex-col items-center" data-carnet-id={estudiante.id}>
      {/* Tarjeta física imprimible protegida contra inversión de colores en modo oscuro */}
      <div
        ref={cardRef}
        className="siae-carnet-printable w-[270px] rounded-lg overflow-hidden select-none shadow-sm"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #d4d4d8',
          color: '#111113',
        }}
      >
        <div
          className="px-4 py-2.5 text-center"
          style={{ backgroundColor: '#111113', color: '#ffffff' }}
        >
          <p
            className="text-[11px] font-bold tracking-wider uppercase"
            style={{ color: '#ffffff' }}
          >
            I.E. Nivel Secundaria — SIAE
          </p>
          <p className="text-[10px]" style={{ color: '#a1a1aa' }}>
            Fotocheck de Identificación Escolar
          </p>
        </div>

        <div
          className="p-4 flex flex-col items-center text-center"
          style={{ backgroundColor: '#ffffff' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm mb-2"
            style={{
              backgroundColor: '#f4f4f5',
              border: '1px solid #d4d4d8',
              color: '#18181b',
            }}
          >
            {iniciales}
          </div>

          <h3
            className="text-xs font-bold uppercase leading-tight"
            style={{ color: '#111113' }}
          >
            {apellidos}
          </h3>
          <p className="text-xs uppercase mt-0.5" style={{ color: '#52525b' }}>
            {nombres}
          </p>

          <div className="mt-2.5 flex items-center justify-center gap-1.5">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-semibold"
              style={{
                backgroundColor: '#f4f4f5',
                color: '#18181b',
                border: '1px solid #e4e4e7',
              }}
            >
              {grado}° &ldquo;{seccion}&rdquo; Sec.
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-medium"
              style={{
                backgroundColor: '#fafafa',
                color: '#3f3f46',
                border: '1px solid #e4e4e7',
              }}
            >
              Año {anio}
            </span>
          </div>

          <div
            className="mt-3 p-2.5 rounded"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
            }}
          >
            <QRCodeCanvas
              value={codigoQR}
              size={128}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#111113"
            />
          </div>

          <p
            className="mt-2 font-mono text-[11px] font-semibold tracking-tight"
            style={{ color: '#18181b' }}
          >
            {codigoQR}
          </p>
          <p className="font-mono text-[10px]" style={{ color: '#71717a' }}>
            {estudiante.codigo_estudiante}
          </p>
        </div>
      </div>

      {mostrarBotones && (
        <div className="mt-3 flex items-center gap-2 w-full max-w-[270px]">
          <button
            type="button"
            onClick={handleDescargarPNG}
            disabled={descargando}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>
          <button
            type="button"
            onClick={handleDescargarPDF}
            disabled={descargando}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
