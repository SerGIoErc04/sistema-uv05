const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email y contraseña son requeridos', 400);
    }

    const result = await query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.password_hash, u.activo, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    const usuario = result.rows[0];
    if (!usuario || !usuario.activo) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const payload = { id: usuario.id, email: usuario.email, rol: usuario.rol };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json({
      ok: true,
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const result = await query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.telefono, r.nombre AS rol
       FROM usuarios u JOIN roles r ON r.id = u.rol_id
       WHERE u.id = $1`,
      [req.usuario.id]
    );
    if (!result.rows[0]) throw new AppError('Usuario no encontrado', 404);
    res.json({ ok: true, usuario: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
