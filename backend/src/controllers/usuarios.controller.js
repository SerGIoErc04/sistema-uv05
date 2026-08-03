const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

async function listar(req, res, next) {
  try {
    const { rol } = req.query; // filtro opcional ?rol=empleado
    let sql = `SELECT u.id, u.nombre, u.apellido, u.email, u.telefono, u.puesto, u.activo,
                      r.nombre AS rol, u.creado_en
               FROM usuarios u JOIN roles r ON r.id = u.rol_id`;
    const params = [];
    if (rol) {
      sql += ` WHERE r.nombre = $1`;
      params.push(rol);
    }
    sql += ' ORDER BY u.creado_en DESC';
    const result = await query(sql, params);
    res.json({ ok: true, usuarios: result.rows });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const result = await query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.telefono, u.puesto, u.activo, r.nombre AS rol
       FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) throw new AppError('Usuario no encontrado', 404);
    res.json({ ok: true, usuario: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellido, email, password, telefono, rol, puesto } = req.body;

    if (!nombre || !apellido || !email || !password || !rol) {
      throw new AppError('nombre, apellido, email, password y rol son requeridos', 400);
    }
    if (!['gerente', 'empleado'].includes(rol)) {
      throw new AppError('rol debe ser "gerente" o "empleado"', 400);
    }

    const rolResult = await query('SELECT id FROM roles WHERE nombre = $1', [rol]);
    if (!rolResult.rows[0]) throw new AppError('Rol no válido', 400);

    const existente = await query('SELECT id FROM usuarios WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    if (existente.rows[0]) throw new AppError('Ya existe un usuario con ese email', 409);

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol_id, puesto)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nombre, apellido, email, telefono, puesto, activo, creado_en`,
      [nombre, apellido, email.toLowerCase().trim(), passwordHash, telefono || null, rolResult.rows[0].id, puesto || 'Inspector']
    );

    res.status(201).json({ ok: true, usuario: { ...result.rows[0], rol } });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { nombre, apellido, telefono, activo, puesto } = req.body;
    const result = await query(
      `UPDATE usuarios
       SET nombre = COALESCE($1, nombre),
           apellido = COALESCE($2, apellido),
           telefono = COALESCE($3, telefono),
           activo = COALESCE($4, activo),
           puesto = COALESCE($5, puesto)
       WHERE id = $6
       RETURNING id, nombre, apellido, email, telefono, puesto, activo`,
      [nombre, apellido, telefono, activo, puesto, req.params.id]
    );
    if (!result.rows[0]) throw new AppError('Usuario no encontrado', 404);
    res.json({ ok: true, usuario: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    // Soft delete: nunca borrar históricos de inspecciones/asignaciones
    const result = await query(
      `UPDATE usuarios SET activo = false WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!result.rows[0]) throw new AppError('Usuario no encontrado', 404);
    res.json({ ok: true, message: 'Usuario desactivado' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
