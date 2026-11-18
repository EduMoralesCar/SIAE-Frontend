import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Descarga el componente visual del Carnet QR como Imagen PNG de alta resolución (para celular)
 */
export async function descargarCarnetPNG(elementoDOM, nombreArchivo = 'Carnet_SIAE.png') {
  if (!elementoDOM) return;
  const canvas = await html2canvas(elementoDOM, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#ffffff',
  });
  const link = document.createElement('a');
  link.download = nombreArchivo;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Descarga el Carnet QR en formato PDF con medidas estándar de fotocheck (5.4 cm x 8.5 cm)
 */
export async function descargarCarnetPDF(elementoDOM, nombreArchivo = 'Carnet_SIAE.pdf') {
  if (!elementoDOM) return;
  const canvas = await html2canvas(elementoDOM, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#ffffff',
  });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [54, 85],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, 54, 85);
  pdf.save(nombreArchivo);
}

/**
 * Genera un documento PDF A4 multipágina con los carnets masivos de la sección
 * en medidas oficiales de fotocheck (54 mm x 85 mm, 9 carnets por hoja A4 con guías de corte).
 */
export function descargarCarnetsMasivosPDF(estudiantes = [], etiquetaSeccion = 'Todos') {
  if (!estudiantes.length) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const cardW = 54;
  const cardH = 85;
  const marginX = 16;
  const marginY = 15;
  const gapX = 8;
  const gapY = 8;
  const cols = 3;
  const rows = 3;
  const porPagina = cols * rows;

  for (let i = 0; i < estudiantes.length; i++) {
    const est = estudiantes[i];
    const posEnPagina = i % porPagina;

    if (i > 0 && posEnPagina === 0) {
      doc.addPage();
    }

    const col = posEnPagina % cols;
    const row = Math.floor(posEnPagina / cols);
    const x = marginX + col * (cardW + gapX);
    const y = marginY + row * (cardH + gapY);

    const nombres = est.usuario?.nombres || '';
    const apellidos = est.usuario?.apellidos || '';
    const dni = est.usuario?.dni || '';
    const grado = est.grado_seccion?.grado || '';
    const seccion = est.grado_seccion?.seccion || '';
    const codigoEst = est.codigo_estudiante || `SIAE-2026-${dni}`;

    // Guía de corte del fotocheck
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'S');

    // Cabecera institucional
    doc.setFillColor(15, 23, 42);
    doc.rect(x, y, cardW, 13, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('SIAE', x + cardW / 2, y + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('CARNET DE IDENTIFICACIÓN ESCOLAR', x + cardW / 2, y + 10, { align: 'center' });

    // Datos del alumno
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(apellidos.toUpperCase().slice(0, 24), x + cardW / 2, y + 20, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(nombres.toUpperCase().slice(0, 26), x + cardW / 2, y + 24.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(`${grado}° "${seccion}" SEC.  |  DNI: ${dni}`, x + cardW / 2, y + 30, {
      align: 'center',
    });

    // Extraer el canvas QR renderizado en pantalla para este estudiante
    const qrCanvas = document.querySelector(`[data-carnet-id="${est.id}"] canvas`);
    if (qrCanvas) {
      const qrDataUrl = qrCanvas.toDataURL('image/png');
      const qrSize = 35;
      doc.addImage(qrDataUrl, 'PNG', x + (cardW - qrSize) / 2, y + 34, qrSize, qrSize);
    }

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(codigoEst, x + cardW / 2, y + 75, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text('Nivel Secundaria', x + cardW / 2, y + 80, { align: 'center' });
  }

  const limpio = String(etiquetaSeccion).replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Carnets_Masivos_SIAE_${limpio}.pdf`);
}

/**
 * Genera el Reporte Oficial SIAE en PDF con membrete institucional, consolidado,
 * detalle de marcaciones y auditoría de justificaciones.
 */
export function exportarReporteOficialPDF({
  consolidadoEstudiantes = [],
  registros = [],
  auditorias = [],
  filtros = {},
  tituloReporte = 'REPORTE OFICIAL DE ASISTENCIA Y CONDUCTA ESCOLAR',
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fechaEmision = new Date().toLocaleString('es-PE');

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SIAE — SISTEMA INTEGRAL DE CONTROL DE ASISTENCIA ESCOLAR', 14, 10);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(tituloReporte, 14, 16.5);
  doc.text(`Emitido: ${fechaEmision}`, 230, 13.5);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  const textoFiltros = [
    filtros.fecha_inicio ? `Desde: ${filtros.fecha_inicio}` : 'Desde: Inicio del periodo',
    filtros.fecha_fin ? `Hasta: ${filtros.fecha_fin}` : 'Hasta: Fecha actual',
    filtros.seccionTexto ? `Sección: ${filtros.seccionTexto}` : 'Sección: Todas (1° a 5° Sec.)',
    filtros.estado ? `Estado: ${filtros.estado}` : 'Estado: Todos',
  ].join('   |   ');
  doc.text(textoFiltros, 14, 29);

  autoTable(doc, {
    startY: 33,
    head: [
      [
        'Código SIAE',
        'DNI',
        'Estudiante',
        'Sección',
        'Pres.',
        'Tard.',
        'Faltas',
        'Justif.',
        '% Asist.',
        'Conducta',
        'Racha Faltas',
        'Estado',
      ],
    ],
    body: consolidadoEstudiantes.map((c) => [
      c.codigo_estudiante,
      c.dni,
      c.apellidos_nombres,
      c.seccion,
      c.presentes,
      c.tardanzas,
      c.faltas,
      c.justificados,
      `${c.porcentaje_asistencia}%`,
      `${c.puntaje_conducta}/100`,
      c.max_racha_faltas,
      c.alerta_recurrente ? 'Alerta activa' : 'Regular',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  if (registros.length > 0) {
    const finalY1 = doc.lastAutoTable.finalY || 110;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE MARCACIONES DIARIAS', 14, finalY1 + 9);

    autoTable(doc, {
      startY: finalY1 + 12,
      head: [
        [
          'Fecha',
          'Código',
          'Estudiante',
          'Sección',
          'Estado',
          'Entrada',
          'Salida',
          'Min. Tard.',
          'Observación / Justificación',
        ],
      ],
      body: registros.slice(0, 60).map((r) => [
        r.fecha,
        r.estudiante?.codigo_estudiante || '-',
        `${r.estudiante?.usuario?.apellidos || ''}, ${r.estudiante?.usuario?.nombres || ''}`,
        `${r.estudiante?.grado_seccion?.grado || ''}° "${r.estudiante?.grado_seccion?.seccion || ''}"`,
        r.estado,
        r.hora_entrada || '--:--',
        r.hora_salida || '--:--',
        r.minutos_tardanza || 0,
        r.motivo_justificacion || '-',
      ]),
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  if (auditorias.length > 0) {
    const finalY = doc.lastAutoTable.finalY || 120;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('REGISTRO DE AUDITORÍA DE JUSTIFICACIONES Y MODIFICACIONES', 14, finalY + 10);

    autoTable(doc, {
      startY: finalY + 13,
      head: [
        [
          'Fecha/Hora Cambio',
          'Fecha Asist.',
          'Estudiante',
          'Sección',
          'Anterior',
          'Nuevo',
          'Autorizado Por',
          'Motivo / Sustento',
        ],
      ],
      body: auditorias.slice(0, 30).map((a) => [
        new Date(a.fecha_hora_cambio).toLocaleString('es-PE'),
        a.asistencia?.fecha || '-',
        `${a.asistencia?.estudiante?.usuario?.apellidos || ''}, ${a.asistencia?.estudiante?.usuario?.nombres || ''}`,
        `${a.asistencia?.estudiante?.grado_seccion?.grado || ''}° "${a.asistencia?.estudiante?.grado_seccion?.seccion || ''}"`,
        a.estado_anterior,
        a.estado_nuevo,
        `${a.modificado_por?.nombres || ''} ${a.modificado_por?.apellidos || ''} (${a.modificado_por?.rol || ''})`,
        a.motivo_cambio,
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255 },
    });
  }

  const firmaY = Math.min((doc.lastAutoTable?.finalY || 140) + 25, 195);
  doc.setDrawColor(100, 116, 139);
  doc.line(50, firmaY, 120, firmaY);
  doc.line(175, firmaY, 245, firmaY);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma y Sello — Dirección SIAE', 62, firmaY + 5);
  doc.text('Firma — Docente Tutor / Secretaría', 185, firmaY + 5);

  doc.save(`Reporte_SIAE_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Genera el documento PDF oficial de un Acta de Conocimiento o Acta de Compromiso (Secciones 46, 47 y 78)
 */
export function exportarActaPDF(acta) {
  if (!acta) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fechaEmision = new Date(acta.created_at || Date.now()).toLocaleDateString('es-PE');

  // Cabecera institucional
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('I.E. EMBLEMÁTICA NIVEL SECUNDARIA — SIAE', 14, 10);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `ACTA INSTITUCIONAL DE ${acta.tipo || 'COMPROMISO'}   |   CÓDIGO: ${acta.codigo || `ACT-${acta.id}`}`,
    14,
    17.5
  );

  let y = 34;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`ACTA DE ${acta.tipo || 'COMPROMISO'} (${acta.codigo || `#${acta.id}`})`, 14, y);

  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const estNombre = `${acta.estudiante?.usuario?.apellidos || ''}, ${acta.estudiante?.usuario?.nombres || ''}`;
  const estGrado = `${acta.estudiante?.grado_seccion?.grado || ''}° "${acta.estudiante?.grado_seccion?.seccion || ''}" Secundaria`;
  const estDni = acta.estudiante?.usuario?.dni || '-';
  const respNombre = `${acta.creado_por?.nombres || ''} ${acta.creado_por?.apellidos || ''} (${acta.creado_por?.rol || 'Responsable'})`;

  autoTable(doc, {
    startY: y,
    body: [
      ['Estudiante:', estNombre, 'DNI:', estDni],
      ['Grado y Sección:', estGrado, 'Fecha:', fechaEmision],
      ['Motivo del Acta:', acta.motivo || '-', 'Responsable:', respNombre],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 35 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 28 },
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Contenido principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('1. DESCRIPCIÓN Y CONSTANCIA DE LOS HECHOS / ACUERDOS', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lineasContenido = doc.splitTextToSize(acta.contenido || '-', 182);
  doc.text(lineasContenido, 14, y);
  y += lineasContenido.length * 4.5 + 5;

  if (acta.informacion_comunicada) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('2. INFORMACIÓN COMUNICADA AL PADRE O APODERADO', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lineasInfo = doc.splitTextToSize(acta.informacion_comunicada, 182);
    doc.text(lineasInfo, 14, y);
    y += lineasInfo.length * 4.5 + 5;
  }

  // Participantes de la reunión vinculada
  const participantes = acta.reunion?.participantes || [];
  if (participantes.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('3. PARTICIPANTES DE LA REUNIÓN', 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [['Nombre Completo', 'Rol / Parentesco', 'Documento (DNI)']],
      body: participantes.map((p) => [
        p.nombre_participante,
        p.rol_participante,
        p.dni_participante || '-',
      ]),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Compromisos asociados al acta
  const compromisos = acta.compromisos || [];
  if (compromisos.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('4. COMPROMISOS ASUMIDOS Y FECHA DE SEGUIMIENTO', 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [['Código', 'Descripción del Compromiso', 'Responsable', 'Fecha Seguimiento', 'Estado']],
      body: compromisos.map((c) => [
        c.codigo || `#${c.id}`,
        c.descripcion,
        c.responsable_compromiso,
        c.fecha_seguimiento,
        c.estado,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (acta.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Observaciones: `, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(acta.observaciones, 40, y);
    y += 8;
  }

  // Estado de conformidad digital
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    acta.aceptado_padre
      ? `Constancia en plataforma: ACEPTADA DIGITALMENTE POR EL APODERADO (${new Date(acta.fecha_aceptacion).toLocaleString('es-PE')})`
      : 'Constancia en plataforma: Pendiente de firma / aceptación por el padre o apoderado',
    14,
    y + 4
  );

  // Bloques de firma
  const firmaY = Math.min(y + 35, 265);
  doc.setDrawColor(100, 116, 139);
  doc.line(25, firmaY, 95, firmaY);
  doc.line(115, firmaY, 185, firmaY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Firma del Padre, Madre o Apoderado', 35, firmaY + 5);
  doc.text(`Firma — ${respNombre.slice(0, 34)}`, 122, firmaY + 5);

  doc.save(`${acta.codigo || `Acta_${acta.id}`}_SIAE.pdf`);
}

/**
 * Feedback sonoro instantáneo para el escáner QR
 */
export function reproducirSonidoEscaneo(tipo = 'EXITO') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (tipo === 'EXITO') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (tipo === 'TARDANZA') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    }
  } catch {
    // Ignorar
  }
}
