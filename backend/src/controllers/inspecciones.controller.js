const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

function formatearFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  // Se arma en UTC porque las columnas DATE de Postgres llegan sin hora,
  // y usar el huso local podría recorrer un día hacia atrás.
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const anio = d.getUTCFullYear();
  return `${dia}/${mes}/${anio}`;
}

function formatearHora(hora) {
  if (!hora) return '';
  // Postgres TIME llega como "HH:MM:SS"; mostramos solo HH:MM
  return hora.slice(0, 5);
}

const ETAPAS_VALIDAS = ['diseno', 'construccion', 'operacion_mantenimiento'];

// Prefijos de folio según la etapa, para NOM-005
const PREFIJOS_ETAPA = {
  diseno: { lista: 'LD', acta: 'AD' },
  construccion: { lista: 'LC', acta: 'AC' },
  operacion_mantenimiento: { lista: 'LOM', acta: 'AOM' },
};

// Folio genérico (por ahora solo NOM-016, que aún no tiene su propio esquema).
// Usa MAX del consecutivo ya emitido (no COUNT) para no repetir folios si se
// borró alguna inspección de en medio.
async function generarFolioGenerico() {
  const anio = new Date().getFullYear();
  const result = await query(
    `SELECT COALESCE(MAX((regexp_match(folio, '-(\\d+)$'))[1]::int), 0) AS maximo
     FROM inspecciones WHERE folio LIKE $1`,
    [`UV05-${anio}-%`]
  );
  const consecutivo = result.rows[0].maximo + 1;
  return `UV05-${anio}-${String(consecutivo).padStart(4, '0')}`;
}

// Orden de Trabajo (OT-AA/NNN): consecutivo global de NOM-005, sin importar la etapa
async function generarFolioOT() {
  const anioCorto = String(new Date().getFullYear()).slice(-2);
  const result = await query(
    `SELECT COALESCE(MAX((regexp_match(folio, '/(\\d+)$'))[1]::int), 0) AS maximo
     FROM inspecciones i
     JOIN tipos_inspeccion ti ON ti.id = i.tipo_inspeccion_id
     WHERE ti.clave = 'NOM-005' AND folio LIKE $1`,
    [`OT-${anioCorto}/%`]
  );
  const consecutivo = result.rows[0].maximo + 1;
  return `OT-${anioCorto}/${String(consecutivo).padStart(3, '0')}`;
}

// Id. de Lista de Inspección y de Acta Asignada: comparten el mismo consecutivo,
// pero llevan un contador independiente POR ETAPA (LD/LC/LOM por su lado)
async function generarFoliosEtapa(etapa) {
  const anioCorto = String(new Date().getFullYear()).slice(-2);
  const prefijos = PREFIJOS_ETAPA[etapa];
  const result = await query(
    `SELECT COALESCE(MAX((regexp_match(folio_lista_inspeccion, '/(\\d+)$'))[1]::int), 0) AS maximo
     FROM inspecciones i
     JOIN tipos_inspeccion ti ON ti.id = i.tipo_inspeccion_id
     WHERE ti.clave = 'NOM-005' AND i.etapa = $1 AND folio_lista_inspeccion LIKE $2`,
    [etapa, `${prefijos.lista}-${anioCorto}/%`]
  );
  const consecutivo = result.rows[0].maximo + 1;
  const serie = String(consecutivo).padStart(3, '0');
  return {
    folio_lista_inspeccion: `${prefijos.lista}-${anioCorto}/${serie}`,
    folio_acta: `${prefijos.acta}-${anioCorto}/${serie}`,
  };
}

// Anexos 21-22: no hay etapas; los 3 folios (No. de Servicio, Acta, Lista) comparten
// un mismo consecutivo global del módulo, solo cambia el prefijo.
async function generarFoliosAnexos() {
  const anioCorto = String(new Date().getFullYear()).slice(-2);
  const result = await query(
    `SELECT COALESCE(MAX((regexp_match(folio, '/(\\d+)$'))[1]::int), 0) AS maximo
     FROM inspecciones i
     JOIN tipos_inspeccion ti ON ti.id = i.tipo_inspeccion_id
     WHERE ti.clave = 'ANEXOS-21-22' AND folio LIKE $1`,
    [`OS-${anioCorto}/%`]
  );
  const consecutivo = result.rows[0].maximo + 1;
  const serie = String(consecutivo).padStart(3, '0');
  return {
    folio: `OS-${anioCorto}/${serie}`, // No. de Servicio (Orden de Servicio)
    folio_acta: `AI-${anioCorto}/${serie}`, // Acta Asignada
    folio_lista_inspeccion: `LI-${anioCorto}/${serie}`, // Id. Lista de Inspección
  };
}

// Crear inspección + asignarla a un empleado en un solo paso (solo gerente)
async function crear(req, res, next) {
  try {
    const {
      estacion_id, tipo_inspeccion_id, fecha_programada, empleado_id, notas, etapa,
      fecha_solicitud, nombre_solicitante, hora_programada,
    } = req.body;

    if (!estacion_id || !tipo_inspeccion_id || !fecha_programada || !empleado_id) {
      throw new AppError(
        'estacion_id, tipo_inspeccion_id, fecha_programada y empleado_id son requeridos',
        400
      );
    }

    const estacion = await query('SELECT id FROM estaciones WHERE id = $1 AND activo = true', [
      estacion_id,
    ]);
    if (!estacion.rows[0]) throw new AppError('Estación no válida', 400);

    const tipoInspeccion = await query(
      'SELECT id, clave FROM tipos_inspeccion WHERE id = $1 AND activo = true',
      [tipo_inspeccion_id]
    );
    if (!tipoInspeccion.rows[0]) throw new AppError('Tipo de inspección no válido', 400);

    const esNom005 = tipoInspeccion.rows[0].clave === 'NOM-005';
    const esAnexos2122 = tipoInspeccion.rows[0].clave === 'ANEXOS-21-22';

    if (esNom005 && !ETAPAS_VALIDAS.includes(etapa)) {
      throw new AppError(
        'Para NOM-005 debes indicar la etapa: diseno, construccion u operacion_mantenimiento',
        400
      );
    }

    const empleado = await query(
      `SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id
       WHERE u.id = $1 AND r.nombre = 'empleado' AND u.activo = true`,
      [empleado_id]
    );
    if (!empleado.rows[0]) throw new AppError('Empleado no válido', 400);

    // Reintenta hasta 3 veces si hay colisión de folio (ej. dos gerentes creando
    // una inspección al mismo tiempo). El MAX-based de arriba ya evita el caso
    // común (borrar una inspección de en medio); esto cubre la carrera residual.
    let inspeccion;
    let intentos = 0;
    while (!inspeccion) {
      intentos += 1;
      let folio;
      let etapaFinal = null;
      let folioListaInspeccion = null;
      let folioActa = null;

      if (esNom005) {
        folio = await generarFolioOT();
        const folios = await generarFoliosEtapa(etapa);
        folioListaInspeccion = folios.folio_lista_inspeccion;
        folioActa = folios.folio_acta;
        etapaFinal = etapa;
      } else if (esAnexos2122) {
        const folios = await generarFoliosAnexos();
        folio = folios.folio;
        folioListaInspeccion = folios.folio_lista_inspeccion;
        folioActa = folios.folio_acta;
      } else {
        folio = await generarFolioGenerico();
      }

      try {
        const inspeccionResult = await query(
          `INSERT INTO inspecciones
            (estacion_id, tipo_inspeccion_id, folio, etapa, folio_lista_inspeccion, folio_acta,
             fecha_programada, fecha_finalizacion, hora_programada, fecha_solicitud, nombre_solicitante, creado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11) RETURNING *`,
          [
            estacion_id,
            tipo_inspeccion_id,
            folio,
            etapaFinal,
            folioListaInspeccion,
            folioActa,
            fecha_programada,
            hora_programada || null,
            fecha_solicitud || null,
            nombre_solicitante || null,
            req.usuario.id,
          ]
        );
        inspeccion = inspeccionResult.rows[0];
      } catch (errInsert) {
        // 23505 = unique_violation. Si es por un folio, reintentamos con uno nuevo.
        if (errInsert.code === '23505' && intentos < 3) continue;
        throw errInsert;
      }
    }

    await query(
      `INSERT INTO asignaciones (inspeccion_id, empleado_id, asignado_por, notas)
       VALUES ($1, $2, $3, $4)`,
      [inspeccion.id, empleado_id, req.usuario.id, notas || null]
    );

    res.status(201).json({ ok: true, inspeccion });
  } catch (err) {
    next(err);
  }
}

// Listado con filtros por fecha, estación y empleado (para dashboard/reportes)
async function listar(req, res, next) {
  try {
    const { estacion_id, empleado_id, estatus, fecha_desde, fecha_hasta, tipo_inspeccion_id } = req.query;
    const condiciones = [];
    const params = [];

    // Un empleado solo ve sus propias inspecciones asignadas
    let sql = `
      SELECT i.*, e.nombre AS estacion_nombre,
             ti.clave AS tipo_inspeccion_clave, ti.nombre AS tipo_inspeccion_nombre,
             u.id AS empleado_id, u.nombre AS empleado_nombre, u.apellido AS empleado_apellido
      FROM inspecciones i
      JOIN estaciones e ON e.id = i.estacion_id
      JOIN tipos_inspeccion ti ON ti.id = i.tipo_inspeccion_id
      LEFT JOIN asignaciones a ON a.inspeccion_id = i.id
      LEFT JOIN usuarios u ON u.id = a.empleado_id
    `;

    if (req.usuario.rol === 'empleado') {
      params.push(req.usuario.id);
      condiciones.push(`u.id = $${params.length}`);
    } else if (empleado_id) {
      params.push(empleado_id);
      condiciones.push(`u.id = $${params.length}`);
    }

    if (estacion_id) {
      params.push(estacion_id);
      condiciones.push(`i.estacion_id = $${params.length}`);
    }
    if (tipo_inspeccion_id) {
      params.push(tipo_inspeccion_id);
      condiciones.push(`i.tipo_inspeccion_id = $${params.length}`);
    }
    if (estatus) {
      params.push(estatus);
      condiciones.push(`i.estatus = $${params.length}`);
    }
    if (fecha_desde) {
      params.push(fecha_desde);
      condiciones.push(`i.fecha_programada >= $${params.length}`);
    }
    if (fecha_hasta) {
      params.push(fecha_hasta);
      condiciones.push(`i.fecha_programada <= $${params.length}`);
    }

    if (condiciones.length) sql += ' WHERE ' + condiciones.join(' AND ');
    sql += ' ORDER BY i.fecha_programada DESC';

    const result = await query(sql, params);
    res.json({ ok: true, inspecciones: result.rows });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const inspeccion = await query(
      `SELECT i.*, e.nombre AS estacion_nombre, e.direccion AS estacion_direccion,
              ti.clave AS tipo_inspeccion_clave, ti.nombre AS tipo_inspeccion_nombre
       FROM inspecciones i
       JOIN estaciones e ON e.id = i.estacion_id
       JOIN tipos_inspeccion ti ON ti.id = i.tipo_inspeccion_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (!inspeccion.rows[0]) throw new AppError('Inspección no encontrada', 404);

    // Verificar que el empleado solo pueda ver lo suyo
    if (req.usuario.rol === 'empleado') {
      const asignado = await query(
        'SELECT 1 FROM asignaciones WHERE inspeccion_id = $1 AND empleado_id = $2',
        [req.params.id, req.usuario.id]
      );
      if (!asignado.rows[0]) throw new AppError('No autorizado para ver esta inspección', 403);
    }

    // Solo las normativas que pertenecen al módulo/tipo de esta inspección
    // (ej. si es "Anexos 21-22", regresa únicamente ANEXO-21 y ANEXO-22, no las 4)
    const normativasRequeridas = await query(
      `SELECT n.id, n.clave, n.nombre
       FROM tipos_inspeccion_normativas tin
       JOIN normativas n ON n.id = tin.normativa_id
       WHERE tin.tipo_inspeccion_id = $1
       ORDER BY n.clave`,
      [inspeccion.rows[0].tipo_inspeccion_id]
    );

    const resultados = await query(
      `SELECT ri.*, n.clave AS normativa_clave, n.nombre AS normativa_nombre
       FROM resultados_inspeccion ri JOIN normativas n ON n.id = ri.normativa_id
       WHERE ri.inspeccion_id = $1`,
      [req.params.id]
    );

    const evidencias = await query(
      'SELECT * FROM evidencias WHERE inspeccion_id = $1 ORDER BY creado_en DESC',
      [req.params.id]
    );

    const asignaciones = await query(
      `SELECT a.*, u.nombre, u.apellido FROM asignaciones a
       JOIN usuarios u ON u.id = a.empleado_id WHERE a.inspeccion_id = $1`,
      [req.params.id]
    );

    const datosGenerales = await query(
      'SELECT * FROM datos_generales_inspeccion WHERE inspeccion_id = $1',
      [req.params.id]
    );

    const tanques = await query(
      'SELECT * FROM tanques_inspeccion WHERE inspeccion_id = $1 ORDER BY id',
      [req.params.id]
    );

    res.json({
      ok: true,
      inspeccion: inspeccion.rows[0],
      normativas_requeridas: normativasRequeridas.rows,
      resultados: resultados.rows,
      evidencias: evidencias.rows,
      asignaciones: asignaciones.rows,
      datos_generales: datosGenerales.rows[0] || null,
      tanques: tanques.rows,
    });
  } catch (err) {
    next(err);
  }
}

// El empleado marca estatus (en_proceso / completada); el gerente puede cancelar
async function cambiarEstatus(req, res, next) {
  try {
    const { estatus } = req.body;
    const validos = ['pendiente', 'en_proceso', 'completada', 'cancelada'];
    if (!validos.includes(estatus)) throw new AppError('Estatus no válido', 400);

    if (req.usuario.rol === 'empleado' && estatus === 'cancelada') {
      throw new AppError('Solo el gerente puede cancelar una inspección', 403);
    }

    const camposExtra = estatus === 'completada' ? ', fecha_realizada = CURRENT_DATE' : '';
    const result = await query(
      `UPDATE inspecciones SET estatus = $1 ${camposExtra} WHERE id = $2 RETURNING *`,
      [estatus, req.params.id]
    );
    if (!result.rows[0]) throw new AppError('Inspección no encontrada', 404);
    res.json({ ok: true, inspeccion: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// El empleado registra manualmente la hora de inicio y/o término de la inspección
async function actualizarHorario(req, res, next) {
  try {
    const { hora_inicio, hora_termino, fecha_finalizacion } = req.body;
    if (!hora_inicio && !hora_termino && !fecha_finalizacion) {
      throw new AppError('Debes enviar hora_inicio, hora_termino y/o fecha_finalizacion', 400);
    }

    if (req.usuario.rol === 'empleado') {
      const asignado = await query(
        'SELECT 1 FROM asignaciones WHERE inspeccion_id = $1 AND empleado_id = $2',
        [req.params.id, req.usuario.id]
      );
      if (!asignado.rows[0]) throw new AppError('No estás asignado a esta inspección', 403);
    }

    const result = await query(
      `UPDATE inspecciones
       SET hora_inicio = COALESCE($1, hora_inicio),
           hora_termino = COALESCE($2, hora_termino),
           fecha_finalizacion = COALESCE($3, fecha_finalizacion)
       WHERE id = $4
       RETURNING *`,
      [hora_inicio || null, hora_termino || null, fecha_finalizacion || null, req.params.id]
    );
    if (!result.rows[0]) throw new AppError('Inspección no encontrada', 404);
    res.json({ ok: true, inspeccion: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Editar datos generales de la inspección (solo gerente).
// Reasigna estación, empleado, fecha, notas y —si es NOM-005— la etapa.
async function actualizar(req, res, next) {
  try {
    const actual = await query(
      `SELECT i.*, ti.clave AS tipo_clave FROM inspecciones i
       JOIN tipos_inspeccion ti ON ti.id = i.tipo_inspeccion_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (!actual.rows[0]) throw new AppError('Inspección no encontrada', 404);

    const {
      estacion_id, empleado_id, fecha_programada, notas, etapa,
      fecha_solicitud, nombre_solicitante, hora_programada,
    } = req.body;

    if (estacion_id) {
      const estacion = await query('SELECT id FROM estaciones WHERE id = $1 AND activo = true', [
        estacion_id,
      ]);
      if (!estacion.rows[0]) throw new AppError('Estación no válida', 400);
    }

    if (empleado_id) {
      const empleado = await query(
        `SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id
         WHERE u.id = $1 AND r.nombre = 'empleado' AND u.activo = true`,
        [empleado_id]
      );
      if (!empleado.rows[0]) throw new AppError('Empleado no válido', 400);
    }

    const esNom005 = actual.rows[0].tipo_clave === 'NOM-005';
    if (esNom005 && etapa && !ETAPAS_VALIDAS.includes(etapa)) {
      throw new AppError('Etapa no válida', 400);
    }

    const result = await query(
      `UPDATE inspecciones
       SET estacion_id = COALESCE($1, estacion_id),
           fecha_programada = COALESCE($2, fecha_programada),
           etapa = COALESCE($3, etapa),
           fecha_solicitud = COALESCE($4, fecha_solicitud),
           nombre_solicitante = COALESCE($5, nombre_solicitante),
           hora_programada = COALESCE($6, hora_programada)
       WHERE id = $7
       RETURNING *`,
      [
        estacion_id || null,
        fecha_programada || null,
        esNom005 ? etapa || null : null,
        fecha_solicitud || null,
        nombre_solicitante || null,
        hora_programada || null,
        req.params.id,
      ]
    );

    // La asignación (empleado + notas) vive en su propia tabla; se actualiza aparte
    if (empleado_id || notas) {
      await query(
        `UPDATE asignaciones
         SET empleado_id = COALESCE($1, empleado_id),
             notas = COALESCE($2, notas)
         WHERE inspeccion_id = $3`,
        [empleado_id || null, notas || null, req.params.id]
      );
    }

    res.json({ ok: true, inspeccion: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Eliminar una inspección (solo gerente). Las evidencias/resultados/asignaciones
// asociadas se borran en cascada por las FKs definidas en el esquema.
async function eliminar(req, res, next) {
  try {
    const result = await query('DELETE FROM inspecciones WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);
    if (!result.rows[0]) throw new AppError('Inspección no encontrada', 404);
    res.json({ ok: true, message: 'Inspección eliminada' });
  } catch (err) {
    next(err);
  }
}

// Genera la Orden de Trabajo (.docx) de una inspección NOM-005 con sus datos reales
// y la manda como descarga. Solo aplica al módulo NOM-005 (el que trae esta plantilla).
async function ordenTrabajo(req, res, next) {
  try {
    const result = await query(
      `SELECT i.*, ti.clave AS tipo_clave,
              e.nombre AS estacion_nombre, e.razon_social, e.direccion, e.municipio, e.estado,
              e.contacto_tel, e.correo,
              u.nombre AS empleado_nombre, u.apellido AS empleado_apellido, u.puesto AS empleado_puesto
       FROM inspecciones i
       JOIN tipos_inspeccion ti ON ti.id = i.tipo_inspeccion_id
       JOIN estaciones e ON e.id = i.estacion_id
       LEFT JOIN asignaciones a ON a.inspeccion_id = i.id
       LEFT JOIN usuarios u ON u.id = a.empleado_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    const insp = result.rows[0];
    if (!insp) throw new AppError('Inspección no encontrada', 404);
    if (insp.tipo_clave !== 'NOM-005') {
      throw new AppError('La Orden de Trabajo solo aplica a inspecciones de NOM-005', 400);
    }

    if (req.usuario.rol === 'empleado') {
      const asignado = await query(
        'SELECT 1 FROM asignaciones WHERE inspeccion_id = $1 AND empleado_id = $2',
        [req.params.id, req.usuario.id]
      );
      if (!asignado.rows[0]) throw new AppError('No autorizado para esta inspección', 403);
    }

    const direccionCompleta = [insp.direccion, insp.municipio, insp.estado].filter(Boolean).join(', ');
    const personalAsignado = insp.empleado_nombre
      ? `${insp.empleado_nombre} ${insp.empleado_apellido}`
      : '';

    const datos = {
      'F SOLICITUD': formatearFecha(insp.fecha_solicitud),
      'OS-': insp.folio || '',
      LISTA_I: insp.folio_lista_inspeccion || '',
      ACTA: insp.folio_acta || '',
      SOLICITANTE: insp.nombre_solicitante || '',
      'RAZON SOCIAL': insp.razon_social || insp.estacion_nombre || '',
      DIRECCION: direccionCompleta,
      TELEFONO: insp.contacto_tel || '',
      CORREO: insp.correo || '',
      FECHAP: formatearFecha(insp.fecha_programada),
      HORAP: formatearHora(insp.hora_programada),
      'PERSONAL ASIGNADO': personalAsignado,
      'PUESTO ASIGNADO': insp.empleado_puesto || 'Inspector',
      DIS: insp.etapa === 'diseno' ? 'X' : '',
      CONS: insp.etapa === 'construccion' ? 'X' : '',
      OM: insp.etapa === 'operacion_mantenimiento' ? 'X' : '',
    };

    const rutaPlantilla = path.join(__dirname, '..', '..', 'templates', 'nom-005', 'orden-trabajo.docx');
    const contenido = fs.readFileSync(rutaPlantilla, 'binary');
    const zip = new PizZip(contenido);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '', // si falta algún dato, deja el espacio en blanco en vez de tronar
    });

    doc.render(datos);
    const buffer = doc.getZip().generate({ type: 'nodebuffer' });

    const nombreArchivo = `OT_${(insp.folio || 'inspeccion').replace(/[\\/]/g, '-')}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(buffer);
  } catch (err) {
    if (err.properties && err.properties.errors) {
      // Errores propios de docxtemplater (ej. etiqueta mal formada en la plantilla)
      return next(new AppError('Error generando el documento: revisa la plantilla', 500));
    }
    next(err);
  }
}

// Guarda (o actualiza) los datos de los 2 testigos designados durante la inspección
async function guardarDatosGenerales(req, res, next) {
  try {
    if (req.usuario.rol === 'empleado') {
      const asignado = await query(
        'SELECT 1 FROM asignaciones WHERE inspeccion_id = $1 AND empleado_id = $2',
        [req.params.id, req.usuario.id]
      );
      if (!asignado.rows[0]) throw new AppError('No estás asignado a esta inspección', 403);
    }

    const {
      testigo1_nombre, testigo1_tipo_documento, testigo1_documento_id, testigo1_domicilio,
      testigo2_nombre, testigo2_tipo_documento, testigo2_documento_id, testigo2_domicilio,
    } = req.body;

    const result = await query(
      `INSERT INTO datos_generales_inspeccion
        (inspeccion_id, testigo1_nombre, testigo1_tipo_documento, testigo1_documento_id, testigo1_domicilio,
         testigo2_nombre, testigo2_tipo_documento, testigo2_documento_id, testigo2_domicilio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (inspeccion_id) DO UPDATE SET
         testigo1_nombre = $2, testigo1_tipo_documento = $3, testigo1_documento_id = $4, testigo1_domicilio = $5,
         testigo2_nombre = $6, testigo2_tipo_documento = $7, testigo2_documento_id = $8, testigo2_domicilio = $9
       RETURNING *`,
      [
        req.params.id,
        testigo1_nombre || null,
        testigo1_tipo_documento || null,
        testigo1_documento_id || null,
        testigo1_domicilio || null,
        testigo2_nombre || null,
        testigo2_tipo_documento || null,
        testigo2_documento_id || null,
        testigo2_domicilio || null,
      ]
    );

    res.json({ ok: true, datos_generales: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Reemplaza la lista completa de tanques de la inspección (se borra y se vuelve a insertar,
// más simple que CRUD incremental para una lista corta que se edita en bloque)
async function guardarTanques(req, res, next) {
  try {
    if (req.usuario.rol === 'empleado') {
      const asignado = await query(
        'SELECT 1 FROM asignaciones WHERE inspeccion_id = $1 AND empleado_id = $2',
        [req.params.id, req.usuario.id]
      );
      if (!asignado.rows[0]) throw new AppError('No estás asignado a esta inspección', 403);
    }

    const { tanques } = req.body;
    if (!Array.isArray(tanques)) throw new AppError('tanques debe ser un arreglo', 400);

    await query('DELETE FROM tanques_inspeccion WHERE inspeccion_id = $1', [req.params.id]);

    const insertados = [];
    for (const t of tanques) {
      const r = await query(
        `INSERT INTO tanques_inspeccion (inspeccion_id, numero_tanque, capacidad, producto)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [req.params.id, t.numero_tanque || null, t.capacidad || null, t.producto || null]
      );
      insertados.push(r.rows[0]);
    }

    res.json({ ok: true, tanques: insertados });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  crear,
  listar,
  obtener,
  cambiarEstatus,
  actualizarHorario,
  actualizar,
  eliminar,
  ordenTrabajo,
  guardarDatosGenerales,
  guardarTanques,
};
