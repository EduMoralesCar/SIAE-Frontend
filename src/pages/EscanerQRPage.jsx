import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  QrCode,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import api from '../api/client';
import { reproducirSonidoEscaneo } from '../utils/exportadores';

export default function EscanerQRPage() {
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [camarasDisponibles, setCamarasDisponibles] = useState([]);
  const [camaraSeleccionada, setCamaraSeleccionada] = useState('');
  const [errorCamara, setErrorCamara] = useState('');

  const [codigoManual, setCodigoManual] = useState('');
  const [tipoRegistro, setTipoRegistro] = useState('GENERAL');
  const [cursoNombre, setCursoNombre] = useState('Matemática');
  const [modoOperacion, setModoOperacion] = useState('AUTO');
  const [configHorario, setConfigHorario] = useState(null);

  const [resultadoEscaneo, setResultadoEscaneo] = useState(null);
  const [historialReciente, setHistorialReciente] = useState([]);
  const [procesando, setProcesando] = useState(false);

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const bloqueoLecturaContinuaRef = useRef(false);

  useEffect(() => {
    api
      .get('/configuracion')
      .then((res) => {
        if (res.data?.configuracion) setConfigHorario(res.data.configuracion);
      })
      .catch(() => {});

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCamarasDisponibles(devices);
          setCamaraSeleccionada(devices[0].id);
        }
      })
      .catch(() => {});

    return () => {
      detenerCamara();
    };
  }, []);

  const procesarLecturaQR = async (codigoLeido) => {
    if (!codigoLeido || procesando) return;
    setProcesando(true);

    try {
      const { data } = await api.post('/asistencias/escanear', {
        codigo_qr: codigoLeido,
        tipo_registro: tipoRegistro,
        curso_nombre: tipoRegistro === 'CLASE' ? cursoNombre : null,
        modo_operacion: modoOperacion,
      });

      const esTardanza = data.accion === 'ENTRADA_TARDANZA';
      reproducirSonidoEscaneo(esTardanza ? 'TARDANZA' : 'EXITO');

      const nuevoResultado = {
        ok: true,
        esDuplicado: false,
        esQrInvalido: false,
        accion: data.accion,
        mensaje: data.mensaje,
        estudiante: data.estudiante,
        asistencia: data.asistencia,
        registrado_por: data.registrado_por || 'Auxiliar',
        timestamp: new Date().toLocaleTimeString('es-PE'),
      };

      setResultadoEscaneo(nuevoResultado);
      setHistorialReciente((prev) => [nuevoResultado, ...prev.slice(0, 14)]);
    } catch (err) {
      const resp = err.response?.data || {};
      reproducirSonidoEscaneo('DUPLICADO');

      const errorResultado = {
        ok: false,
        esDuplicado: Boolean(resp.esDuplicado),
        esQrInvalido: Boolean(resp.esQrInvalido) || !resp.esDuplicado,
        mensaje: resp.mensaje || 'QR NO VÁLIDO — El código no corresponde a un estudiante activo.',
        estudiante: resp.estudiante || null,
        asistencia: resp.asistencia || null,
        registrado_por: resp.registrado_por || null,
        timestamp: new Date().toLocaleTimeString('es-PE'),
      };

      setResultadoEscaneo(errorResultado);
      setHistorialReciente((prev) => [errorResultado, ...prev.slice(0, 14)]);
    } finally {
      setProcesando(false);
    }
  };

  const iniciarCamara = async () => {
    setErrorCamara('');
    try {
      await detenerCamara();

      let camaraConfig = camaraSeleccionada;
      if (!camaraConfig) {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCamarasDisponibles(devices);
          camaraConfig = devices[0].id;
          setCamaraSeleccionada(devices[0].id);
        } else {
          camaraConfig = { facingMode: 'user' };
        }
      }

      const html5QrCode = new Html5Qrcode('siae-qr-reader');
      scannerRef.current = html5QrCode;
      setCamaraActiva(true);

      await html5QrCode.start(
        camaraConfig,
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          if (bloqueoLecturaContinuaRef.current) return;
          bloqueoLecturaContinuaRef.current = true;
          await procesarLecturaQR(decodedText);
          setTimeout(() => {
            bloqueoLecturaContinuaRef.current = false;
          }, 2500);
        },
        () => {}
      );
    } catch {
      setCamaraActiva(false);
      setErrorCamara(
        'No se pudo iniciar la cámara. Verifique que el navegador tenga permiso de cámara y no esté siendo usada por otra aplicación.'
      );
    }
  };

  const detenerCamara = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {
        // Ignorar errores al limpiar instancia previa
      }
      scannerRef.current = null;
    }
    setCamaraActiva(false);
  };

  const handleSubirImagenQR = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorCamara('');
    try {
      const fileScanner = new Html5Qrcode('siae-qr-file-reader');
      const decodedText = await fileScanner.scanFile(file, false);
      await fileScanner.clear();
      await procesarLecturaQR(decodedText);
    } catch {
      setErrorCamara('No se detectó un código QR válido en la imagen seleccionada.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmitManual = (e) => {
    e.preventDefault();
    if (!codigoManual.trim()) return;
    procesarLecturaQR(codigoManual.trim());
    setCodigoManual('');
  };

  const handleEjecutarCierre = async () => {
    try {
      const { data } = await api.post('/asistencias/cierre-automatico', {});
      alert(data.mensaje);
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al ejecutar cierre de asistencia.');
    }
  };

  return (
    <div className="space-y-6">
      <div id="siae-qr-file-reader" className="hidden" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Control de asistencia QR</h1>
          <p className="text-xs text-slate-500">
            {configHorario
              ? `Puntual hasta ${configHorario.hora_limite_puntual} · Tardanza hasta ${configHorario.hora_limite_tardanza} · Salida desde ${configHorario.hora_inicio_salida} · Bloqueo duplicado: ${configHorario.ventana_antiduplicado_min} min`
              : 'Escaneo por cámara, imagen QR o identificador STU / DNI'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleEjecutarCierre}
          className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition self-start sm:self-auto"
        >
          Cerrar asistencia del día
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Modalidad</label>
              <select
                value={tipoRegistro}
                onChange={(e) => setTipoRegistro(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
              >
                <option value="GENERAL">Ingreso / Salida general</option>
                <option value="CLASE">Asistencia por curso</option>
              </select>
            </div>

            {tipoRegistro === 'CLASE' ? (
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
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Operación</label>
                <select
                  value={modoOperacion}
                  onChange={(e) => setModoOperacion(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                >
                  <option value="AUTO">Automático</option>
                  <option value="SALIDA">Registrar salida</option>
                </select>
              </div>
            )}
          </div>

          {camarasDisponibles.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dispositivo de cámara
              </label>
              <select
                value={camaraSeleccionada}
                onChange={(e) => setCamaraSeleccionada(e.target.value)}
                disabled={camaraActiva}
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-xs"
              >
                {camarasDisponibles.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Cámara ${cam.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative w-full min-h-[250px] bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
            <div id="siae-qr-reader" className="w-full" />

            {!camaraActiva && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
                <QrCode className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-xs text-slate-300">Cámara inactiva</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pulsa &ldquo;Activar cámara&rdquo; y muestra el fotocheck QR
                </p>
              </div>
            )}
          </div>

          {errorCamara && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorCamara}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSubirImagenQR}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Escanear imagen PNG</span>
            </button>

            {!camaraActiva ? (
              <button
                type="button"
                onClick={iniciarCamara}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Activar cámara</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={detenerCamara}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>Detener cámara</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitManual} className="pt-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={codigoManual}
              onChange={(e) => setCodigoManual(e.target.value)}
              placeholder="Token QR (ej. STU-8F01-A903-X01) o DNI"
              className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-xs"
            />
            <button
              type="submit"
              disabled={procesando}
              className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
            >
              Registrar
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-5 rounded-lg border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3">
              Resultado del escaneo
            </h2>

            {!resultadoEscaneo ? (
              <div className="p-6 rounded-md bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                Esperando lectura de fotocheck QR...
              </div>
            ) : (
              <div
                className={`p-4 rounded-md border ${
                  resultadoEscaneo.esDuplicado
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : !resultadoEscaneo.ok
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : resultadoEscaneo.accion === 'ENTRADA_TARDANZA'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  {resultadoEscaneo.esDuplicado ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : !resultadoEscaneo.ok ? (
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  ) : resultadoEscaneo.accion === 'ENTRADA_TARDANZA' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold tracking-wide uppercase">
                        {resultadoEscaneo.esDuplicado
                          ? 'ASISTENCIA YA REGISTRADA'
                          : !resultadoEscaneo.ok
                            ? 'QR NO VÁLIDO'
                            : 'ASISTENCIA REGISTRADA'}
                      </span>
                      <span className="font-mono text-[11px] opacity-75">
                        {resultadoEscaneo.timestamp}
                      </span>
                    </div>

                    <p className="font-medium">{resultadoEscaneo.mensaje}</p>

                    {resultadoEscaneo.estudiante && (
                      <div className="pt-2 border-t border-black/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <span className="block opacity-70">Estudiante:</span>
                          <span className="font-semibold">
                            {resultadoEscaneo.estudiante.usuario?.nombres}{' '}
                            {resultadoEscaneo.estudiante.usuario?.apellidos}
                          </span>
                        </div>
                        <div>
                          <span className="block opacity-70">Grado y sección:</span>
                          <span className="font-semibold">
                            {resultadoEscaneo.estudiante.grado_seccion?.grado}° &ldquo;
                            {resultadoEscaneo.estudiante.grado_seccion?.seccion}&rdquo;
                          </span>
                        </div>
                        <div>
                          <span className="block opacity-70">Fecha y hora:</span>
                          <span className="font-semibold font-mono">
                            {resultadoEscaneo.asistencia?.fecha || new Date().toLocaleDateString('es-PE')}{' '}
                            {resultadoEscaneo.asistencia?.hora_entrada || resultadoEscaneo.timestamp}
                          </span>
                        </div>
                        <div>
                          <span className="block opacity-70">Registrado por:</span>
                          <span className="font-semibold">
                            {resultadoEscaneo.registrado_por || 'Personal autorizado'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Lecturas de la sesión ({historialReciente.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {historialReciente.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-400">Sin lecturas en esta sesión</p>
              ) : (
                historialReciente.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{item.mensaje}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.estudiante
                          ? `${item.estudiante.usuario?.apellidos}, ${item.estudiante.usuario?.nombres} (${item.estudiante.codigo_qr_unico})`
                          : 'Código no válido / auditado'}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">
                      {item.timestamp}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
