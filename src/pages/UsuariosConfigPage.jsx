import React, { useEffect, useState } from 'react';
import api from '../api/client';
import SelectorEstudiante from '../components/SelectorEstudiante';

export default function UsuariosConfigPage({ tabInicial = 'usuarios' }) {
  const [tab, setTab] = useState(tabInicial);
  const [usuarios, setUsuarios] = useState([]);
  const [grados, setGrados] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [aniosEscolares, setAniosEscolares] = useState([]);
  const [matriculas, setMatriculas] = useState([]);
  const [auditoriaLogs, setAuditoriaLogs] = useState([]);

  const [rolFiltro, setRolFiltro] = useState('');
  const [anioFiltroMatricula, setAnioFiltroMatricula] = useState('');
  const [entidadFiltroAuditoria, setEntidadFiltroAuditoria] = useState('');
  const [busquedaAuditoria, setBusquedaAuditoria] = useState('');

  const [config, setConfig] = useState({
    nombre_institucion: 'I.E. Nivel Secundaria — SIAE',
    anio_escolar: 2026,
    hora_inicio_entrada: '07:00',
    hora_limite_puntual: '08:00',
    hora_limite_tardanza: '08:30',
    hora_inicio_salida: '13:30',
    ventana_antiduplicado_min: 15,
    puntaje_conducta_inicial: 100,
  });
  const [mensajeConfig, setMensajeConfig] = useState('');

  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombres: '',
    apellidos: '',
    dni: '',
    email: '',
    password: '123456',
    telefono: '',
    rol: 'ESTUDIANTE',
    grado_seccion_id: '',
    estudiante_id_vinculo: '',
    parentesco: 'PADRE',
  });
  const [mensajeUsuario, setMensajeUsuario] = useState('');

  const [nuevoAnio, setNuevoAnio] = useState({
    nombre: '2027',
    fecha_inicio: '2027-03-01',
    fecha_fin: '2027-12-17',
    estado: 'PLANIFICACION',
  });

  const [nuevaMatricula, setNuevaMatricula] = useState({
    estudiante_id: '',
    anio_escolar_id: '',
    grado_seccion_id: '',
    estado: 'MATRICULADO',
    observaciones: '',
  });
  const [mensajeMatricula, setMensajeMatricula] = useState('');

  const cargarTodo = async () => {
    try {
      if (tab === 'configuracion') {
        const resCfg = await api.get('/configuracion');
        if (resCfg.data?.configuracion) setConfig(resCfg.data.configuracion);
        return;
      }

      if (tab === 'auditoria') {
        const resAud = await api.get('/auditoria-general', {
          params: {
            entidad: entidadFiltroAuditoria || undefined,
            busqueda: busquedaAuditoria || undefined,
          },
        });
        if (resAud.data?.logs) setAuditoriaLogs(resAud.data.logs);
        return;
      }

      if (tab === 'matriculas') {
        const [resGra, resEst, resAnios, resMat] = await Promise.all([
          api.get('/grados-secciones'),
          api.get('/estudiantes'),
          api.get('/anios-escolares'),
          api.get('/matriculas', {
            params: { anio_escolar_id: anioFiltroMatricula || undefined },
          }),
        ]);
        if (resGra.data?.grados) {
          setGrados(resGra.data.grados);
          const grados2026 = resGra.data.grados.filter((g) => g.anio_escolar === 2026);
          const defaultGrado = grados2026[0] || resGra.data.grados[0];
          if (defaultGrado) {
            setNuevaMatricula((prev) => ({
              ...prev,
              grado_seccion_id: prev.grado_seccion_id || String(defaultGrado.id),
            }));
          }
        }
        if (resEst.data?.estudiantes) {
          setEstudiantes(resEst.data.estudiantes);
          if (resEst.data.estudiantes.length > 0) {
            setNuevaMatricula((prev) => ({
              ...prev,
              estudiante_id: prev.estudiante_id || String(resEst.data.estudiantes[0].id),
            }));
          }
        }
        if (resAnios.data?.anios) {
          setAniosEscolares(resAnios.data.anios);
          const activo =
            resAnios.data.anios.find((a) => a.estado === 'ACTIVO') || resAnios.data.anios[0];
          if (activo) {
            setNuevaMatricula((prev) => ({
              ...prev,
              anio_escolar_id: prev.anio_escolar_id || String(activo.id),
            }));
          }
        }
        if (resMat.data?.matriculas) setMatriculas(resMat.data.matriculas);
        return;
      }

      // tab === 'usuarios'
      const [resUsu, resGra, resEst] = await Promise.all([
        api.get('/usuarios', { params: { rol: rolFiltro || undefined } }),
        api.get('/grados-secciones'),
        api.get('/estudiantes'),
      ]);

      if (resUsu.data?.usuarios) setUsuarios(resUsu.data.usuarios);
      if (resGra.data?.grados) {
        setGrados(resGra.data.grados);
        const grados2026 = resGra.data.grados.filter((g) => g.anio_escolar === 2026);
        const defaultGrado = grados2026[0] || resGra.data.grados[0];
        if (defaultGrado) {
          setNuevoUsuario((prev) => ({
            ...prev,
            grado_seccion_id: prev.grado_seccion_id || String(defaultGrado.id),
          }));
        }
      }
      if (resEst.data?.estudiantes) setEstudiantes(resEst.data.estudiantes);
    } catch {
      // Ignorar errores parciales
    }
  };

  useEffect(() => {
    setTab(tabInicial);
  }, [tabInicial]);

  useEffect(() => {
    cargarTodo();
  }, [tab, rolFiltro, anioFiltroMatricula, entidadFiltroAuditoria]);

  const handleGuardarConfig = async (e) => {
    e.preventDefault();
    setMensajeConfig('');
    try {
      const { data } = await api.put('/configuracion', config);
      setMensajeConfig(data.mensaje);
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al guardar configuración.');
    }
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setMensajeUsuario('');
    try {
      const { data } = await api.post('/usuarios', nuevoUsuario);
      setMensajeUsuario(data.mensaje);
      setNuevoUsuario((prev) => ({
        ...prev,
        nombres: '',
        apellidos: '',
        dni: '',
        email: '',
        telefono: '',
      }));
      await cargarTodo();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al registrar usuario.');
    }
  };

  const handleToggleEstadoUsuario = async (u) => {
    try {
      await api.patch(`/usuarios/${u.id}/estado`, { activo: !u.activo });
      await cargarTodo();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'No se pudo cambiar el estado del usuario.');
    }
  };

  const handleCrearAnioEscolar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/anios-escolares', nuevoAnio);
      await cargarTodo();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'No se pudo crear el año escolar.');
    }
  };

  const handleRegistrarMatricula = async (e) => {
    e.preventDefault();
    setMensajeMatricula('');
    try {
      const { data } = await api.post('/matriculas', nuevaMatricula);
      setMensajeMatricula(data.mensaje);
      await cargarTodo();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al registrar matrícula.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTab('usuarios')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'usuarios'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Usuarios y Roles
        </button>

        <button
          type="button"
          onClick={() => setTab('matriculas')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'matriculas'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Años Escolares y Matrículas
        </button>

        <button
          type="button"
          onClick={() => setTab('auditoria')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'auditoria'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Auditoría General ({auditoriaLogs.length})
        </button>

        <button
          type="button"
          onClick={() => setTab('configuracion')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'configuracion'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Configuración Horaria
        </button>
      </div>

      {/* TAB 1: USUARIOS Y ROLES */}
      {tab === 'usuarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-5 rounded-lg border border-slate-200">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-4">
              Nuevo usuario
            </h2>

            {mensajeUsuario && (
              <div className="mb-3 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                {mensajeUsuario}
              </div>
            )}

            <form onSubmit={handleCrearUsuario} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rol</label>
                <select
                  value={nuevoUsuario.rol}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                >
                  <option value="ESTUDIANTE">Estudiante</option>
                  <option value="PADRE">Padre / Madre / Apoderado</option>
                  <option value="TUTOR">Tutor</option>
                  <option value="DOCENTE">Docente</option>
                  <option value="AUXILIAR">Auxiliar</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nombres"
                  value={nuevoUsuario.nombres}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombres: e.target.value })}
                  className="px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
                <input
                  type="text"
                  placeholder="Apellidos"
                  value={nuevoUsuario.apellidos}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, apellidos: e.target.value })}
                  className="px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="DNI"
                  value={nuevoUsuario.dni}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, dni: e.target.value })}
                  className="px-3 py-2 rounded-md border border-slate-300 text-xs"
                  required
                />
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={nuevoUsuario.telefono}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, telefono: e.target.value })}
                  className="px-3 py-2 rounded-md border border-slate-300 text-xs"
                />
              </div>

              <input
                type="email"
                placeholder="Correo electrónico"
                value={nuevoUsuario.email}
                onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                required
              />

              {nuevoUsuario.rol === 'ESTUDIANTE' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Grado y Sección (Matrícula automática)
                  </label>
                  <select
                    value={nuevoUsuario.grado_seccion_id}
                    onChange={(e) =>
                      setNuevoUsuario({ ...nuevoUsuario, grado_seccion_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  >
                    {grados
                      .filter((g) => g.anio_escolar === 2026)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.grado}° &ldquo;{g.seccion}&rdquo; Secundaria ({g.anio_escolar})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {nuevoUsuario.rol === 'PADRE' && (
                <div className="space-y-3">
                  <SelectorEstudiante
                    estudiantes={estudiantes}
                    value={nuevoUsuario.estudiante_id_vinculo}
                    onChange={(val) =>
                      setNuevoUsuario({ ...nuevoUsuario, estudiante_id_vinculo: val })
                    }
                    label="Estudiante asociado"
                    required={false}
                    permitirVacio={true}
                    textoVacio="Seleccionar estudiante a vincular..."
                  />
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Parentesco
                    </label>
                    <select
                      value={nuevoUsuario.parentesco}
                      onChange={(e) =>
                        setNuevoUsuario({ ...nuevoUsuario, parentesco: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    >
                      <option value="PADRE">Padre</option>
                      <option value="MADRE">Madre</option>
                      <option value="APODERADO">Apoderado</option>
                      <option value="TUTOR">Tutor legal</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                Registrar usuario
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Usuarios registrados ({usuarios.length})
              </h2>
              <select
                value={rolFiltro}
                onChange={(e) => setRolFiltro(e.target.value)}
                className="px-2.5 py-1 rounded border border-slate-300 text-xs"
              >
                <option value="">Todos los roles</option>
                <option value="ADMIN">Administrador</option>
                <option value="DIRECTOR">Director</option>
                <option value="TUTOR">Tutor</option>
                <option value="DOCENTE">Docente</option>
                <option value="AUXILIAR">Auxiliar</option>
                <option value="PADRE">Padre / Apoderado</option>
                <option value="ESTUDIANTE">Estudiante</option>
              </select>
            </div>

            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Nombre</th>
                    <th className="py-2.5 px-3 font-medium">DNI</th>
                    <th className="py-2.5 px-3 font-medium">Rol</th>
                    <th className="py-2.5 px-3 font-medium">Detalle / Código</th>
                    <th className="py-2.5 px-4 font-medium text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">
                          {u.apellidos}, {u.nombres}
                        </div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{u.dni}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium">
                          {u.rol}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {u.estudiante_perfil ? (
                          <div>
                            <span className="font-medium text-slate-800">
                              {u.estudiante_perfil.grado_seccion?.grado}° &ldquo;
                              {u.estudiante_perfil.grado_seccion?.seccion}&rdquo;
                            </span>
                            <span className="block font-mono text-[10px] text-slate-400">
                              {u.estudiante_perfil.codigo_qr_unico}
                            </span>
                          </div>
                        ) : u.hijos_vinculados?.length > 0 ? (
                          `${u.hijos_vinculados.length} hijo(s) asociado(s)`
                        ) : u.secciones_tutoradas?.length > 0 ? (
                          `Tutor de ${u.secciones_tutoradas.length} aula(s)`
                        ) : (
                          'Personal institucional'
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleEstadoUsuario(u)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border transition ${
                            u.activo
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AÑOS ESCOLARES Y MATRÍCULAS (Secciones 51, 52 y 80) */}
      {tab === 'matriculas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-5 rounded-lg border border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3">
                Registrar o actualizar matrícula
              </h2>

              {mensajeMatricula && (
                <div className="mb-3 p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  {mensajeMatricula}
                </div>
              )}

              <form onSubmit={handleRegistrarMatricula} className="space-y-3">
                <SelectorEstudiante
                  estudiantes={estudiantes}
                  value={nuevaMatricula.estudiante_id}
                  onChange={(val) =>
                    setNuevaMatricula({ ...nuevaMatricula, estudiante_id: val })
                  }
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Año Escolar
                    </label>
                    <select
                      value={nuevaMatricula.anio_escolar_id}
                      onChange={(e) =>
                        setNuevaMatricula({ ...nuevaMatricula, anio_escolar_id: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                      required
                    >
                      {aniosEscolares.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} ({a.estado})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                    <select
                      value={nuevaMatricula.estado}
                      onChange={(e) =>
                        setNuevaMatricula({ ...nuevaMatricula, estado: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    >
                      <option value="MATRICULADO">Matriculado</option>
                      <option value="PROMOVIDO">Promovido</option>
                      <option value="TRASLADADO">Trasladado</option>
                      <option value="RETIRADO">Retirado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Grado y Sección
                  </label>
                  <select
                    value={nuevaMatricula.grado_seccion_id}
                    onChange={(e) =>
                      setNuevaMatricula({ ...nuevaMatricula, grado_seccion_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                    required
                  >
                    {grados.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.grado}° &ldquo;{g.seccion}&rdquo; Secundaria (Año {g.anio_escolar})
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Observaciones de matrícula"
                  value={nuevaMatricula.observaciones}
                  onChange={(e) =>
                    setNuevaMatricula({ ...nuevaMatricula, observaciones: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                />

                <button
                  type="submit"
                  className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
                >
                  Guardar matrícula
                </button>
              </form>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3">
                Años escolares ({aniosEscolares.length})
              </h2>

              <div className="space-y-2 mb-4">
                {aniosEscolares.map((a) => (
                  <div
                    key={a.id}
                    className="p-2.5 rounded border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">Año {a.nombre}</span>
                      <span className="block text-[11px] text-slate-500">
                        {a.fecha_inicio} al {a.fecha_fin} · {a._count?.matriculas || 0} matrículas
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        a.estado === 'ACTIVO'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {a.estado}
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleCrearAnioEscolar} className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-medium text-slate-600">Aperturar nuevo año escolar</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Ej. 2027"
                    value={nuevoAnio.nombre}
                    onChange={(e) => setNuevoAnio({ ...nuevoAnio, nombre: e.target.value })}
                    className="px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                    required
                  />
                  <input
                    type="date"
                    value={nuevoAnio.fecha_inicio}
                    onChange={(e) => setNuevoAnio({ ...nuevoAnio, fecha_inicio: e.target.value })}
                    className="px-2 py-1.5 rounded border border-slate-300 text-xs"
                    required
                  />
                  <input
                    type="date"
                    value={nuevoAnio.fecha_fin}
                    onChange={(e) => setNuevoAnio({ ...nuevoAnio, fecha_fin: e.target.value })}
                    className="px-2 py-1.5 rounded border border-slate-300 text-xs"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium"
                >
                  Crear año escolar
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Historial de matrículas por año escolar ({matriculas.length})
              </h2>
              <select
                value={anioFiltroMatricula}
                onChange={(e) => setAnioFiltroMatricula(e.target.value)}
                className="px-2.5 py-1 rounded border border-slate-300 text-xs"
              >
                <option value="">Todos los años</option>
                {aniosEscolares.map((a) => (
                  <option key={a.id} value={a.id}>
                    Año {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Estudiante</th>
                    <th className="py-2.5 px-3 font-medium">Año Escolar</th>
                    <th className="py-2.5 px-3 font-medium">Grado y Sección</th>
                    <th className="py-2.5 px-3 font-medium">Fecha</th>
                    <th className="py-2.5 px-4 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matriculas.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">
                          {m.estudiante?.usuario?.apellidos}, {m.estudiante?.usuario?.nombres}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          DNI {m.estudiante?.usuario?.dni}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {m.anio_escolar?.nombre || m.anio_escolar_num}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {m.grado_seccion?.grado}° &ldquo;{m.grado_seccion?.seccion}&rdquo; Secundaria
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {m.fecha_matricula}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            m.estado === 'MATRICULADO'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : m.estado === 'PROMOVIDO'
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {m.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDITORÍA GENERAL DEL SISTEMA (Secciones 64 y 65) */}
      {tab === 'auditoria' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Registro de Auditoría y Trazabilidad Institucional
              </h2>
              <p className="text-xs text-slate-500">
                Historial inmutable de acciones críticas: ¿Quién registró? ¿Qué registró? ¿Cuándo? ¿Qué cambió?
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={entidadFiltroAuditoria}
                onChange={(e) => setEntidadFiltroAuditoria(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-slate-300 text-xs"
              >
                <option value="">Todas las entidades</option>
                <option value="ASISTENCIA">Asistencia</option>
                <option value="CODIGO_QR">Códigos QR / Fotochecks</option>
                <option value="PERMISO">Permisos</option>
                <option value="SALUD">Situaciones de Salud</option>
                <option value="AUTORIZACION_RECOJO">Autorizaciones de Recojo</option>
                <option value="RETIRO">Retiros de Estudiantes</option>
                <option value="INCIDENCIA">Incidencias</option>
                <option value="CITACION">Citaciones</option>
                <option value="REUNION">Reuniones</option>
                <option value="ACTA">Actas</option>
                <option value="COMPROMISO">Compromisos</option>
                <option value="MATRICULA">Matrículas</option>
                <option value="USUARIO">Usuarios / Accesos</option>
              </select>

              <input
                type="text"
                placeholder="Buscar usuario o detalle..."
                value={busquedaAuditoria}
                onChange={(e) => setBusquedaAuditoria(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && cargarTodo()}
                className="px-3 py-1.5 rounded-md border border-slate-300 text-xs"
              />

              <button
                type="button"
                onClick={cargarTodo}
                className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium"
              >
                Filtrar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[550px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Fecha y Hora</th>
                  <th className="py-2.5 px-3 font-medium">Usuario Responsable</th>
                  <th className="py-2.5 px-3 font-medium">Módulo / Entidad</th>
                  <th className="py-2.5 px-3 font-medium">Acción</th>
                  <th className="py-2.5 px-4 font-medium">Descripción / Cambios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditoriaLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No hay registros de auditoría para el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  auditoriaLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('es-PE')}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">
                          {log.usuario_nombre || 'Sistema'}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase">
                          {log.usuario_rol || 'SISTEMA'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                          {log.entidad}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-800">
                        {log.accion}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 max-w-md">
                        <p>{log.descripcion}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURACIÓN HORARIA */}
      {tab === 'configuracion' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 max-w-2xl">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            Parámetros de horario y asistencia
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Configuración general para validación de ingresos, tardanzas y salidas
          </p>

          {mensajeConfig && (
            <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {mensajeConfig}
            </div>
          )}

          <form onSubmit={handleGuardarConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nombre de la institución
              </label>
              <input
                type="text"
                value={config.nombre_institucion}
                onChange={(e) => setConfig({ ...config, nombre_institucion: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Inicio de entrada
              </label>
              <input
                type="time"
                value={config.hora_inicio_entrada}
                onChange={(e) => setConfig({ ...config, hora_inicio_entrada: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hora límite puntual
              </label>
              <input
                type="time"
                value={config.hora_limite_puntual}
                onChange={(e) => setConfig({ ...config, hora_limite_puntual: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hora límite tardanza
              </label>
              <input
                type="time"
                value={config.hora_limite_tardanza}
                onChange={(e) => setConfig({ ...config, hora_limite_tardanza: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hora de salida
              </label>
              <input
                type="time"
                value={config.hora_inicio_salida}
                onChange={(e) => setConfig({ ...config, hora_inicio_salida: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ventana anti-duplicado (minutos)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={config.ventana_antiduplicado_min}
                onChange={(e) =>
                  setConfig({ ...config, ventana_antiduplicado_min: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Puntaje inicial de conducta
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={config.puntaje_conducta_inicial}
                onChange={(e) =>
                  setConfig({ ...config, puntaje_conducta_inicial: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
