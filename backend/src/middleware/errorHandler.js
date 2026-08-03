/**
 * Clase de error de aplicación para diferenciar errores esperados
 * (validación, negocio) de errores inesperados (bugs, DB caída).
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

function notFoundHandler(req, res, next) {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  if (!err.isOperational && !isProd) {
    console.error('ERROR NO OPERACIONAL:', err);
  }

  res.status(statusCode).json({
    ok: false,
    error: {
      message: err.message || 'Error interno del servidor',
      details: err.details || undefined,
      // stack solo en desarrollo, nunca en producción
      stack: isProd ? undefined : err.stack,
    },
  });
}

module.exports = { AppError, notFoundHandler, errorHandler };
