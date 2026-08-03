const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

async function listar(req, res, next) {
  try {
    const { estado, municipio, activo } = req.query;
    const condiciones = [];
    const params = [];

    if (estado) {
      params.push(estado);
      condiciones.push(`estado = $${params.length}`);
    }
    if (municipio) {
      params.push(municipio);
      condiciones.push(`municipio = $${params.length}`);
    }
    if (activo !== undefined) {
      params.push(activo === 'true');
      condiciones.push(`activo = $${params.length}`);
    }

    let sql = 'SELECT * FROM estaciones';
    if (condiciones.length) sql += ' WHERE ' + condiciones.join(' AND ');
    sql += ' ORDER BY nombre ASC';

    const result = await query(sql, params);
    res.json({ ok: true, estaciones: result.rows });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const result = await query('SELECT * FROM estaciones WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) throw new AppError('Estación no encontrada', 404);
    res.json({ ok: true, estacion: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const {
      nombre, razon_social, rfc, permiso_cre, direccion,
      municipio, estado, codigo_postal, latitud, longitud,
      contacto_nombre, contacto_tel, representante_legal, rfc_representante_legal, correo,
    } = req.body;

    if (!nombre || !direccion) {
      throw new AppError('nombre y direccion son requeridos', 400);
    }

    const result = await query(
      `INSERT INTO estaciones
        (nombre, razon_social, rfc, permiso_cre, direccion, municipio, estado,
         codigo_postal, latitud, longitud, contacto_nombre, contacto_tel,
         representante_legal, rfc_representante_legal, correo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [nombre, razon_social, rfc, permiso_cre, direccion, municipio, estado,
        codigo_postal, latitud, longitud, contacto_nombre, contacto_tel,
        representante_legal, rfc_representante_legal, correo]
    );
    res.status(201).json({ ok: true, estacion: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const campos = [
      'nombre', 'razon_social', 'rfc', 'permiso_cre', 'direccion', 'municipio',
      'estado', 'codigo_postal', 'latitud', 'longitud', 'contacto_nombre',
      'contacto_tel', 'representante_legal', 'rfc_representante_legal', 'correo', 'activo',
    ];
    const sets = [];
    const params = [];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        params.push(req.body[campo]);
        sets.push(`${campo} = $${params.length}`);
      }
    });
    if (!sets.length) throw new AppError('No hay campos para actualizar', 400);

    params.push(req.params.id);
    const result = await query(
      `UPDATE estaciones SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!result.rows[0]) throw new AppError('Estación no encontrada', 404);
    res.json({ ok: true, estacion: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const result = await query(
      'UPDATE estaciones SET activo = false WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows[0]) throw new AppError('Estación no encontrada', 404);
    res.json({ ok: true, message: 'Estación desactivada' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
