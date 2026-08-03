const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

/**
 * Verifica el JWT en el header Authorization: Bearer <token>
 * y adjunta el payload (id, rol) a req.usuario
 */
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Token no proporcionado', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, email, rol }
    next();
  } catch (err) {
    return next(new AppError('Token inválido o expirado', 401));
  }
}

/**
 * Middleware factory para restringir acceso por rol.
 * Uso: router.post('/', verificarToken, permitirRoles('gerente'), controller)
 */
function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(new AppError('No autenticado', 401));
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(new AppError('No tienes permisos para esta acción', 403));
    }
    next();
  };
}

module.exports = { verificarToken, permitirRoles };
