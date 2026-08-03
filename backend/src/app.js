const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const estacionesRoutes = require('./routes/estaciones.routes');
const inspeccionesRoutes = require('./routes/inspecciones.routes');
const resultadosRoutes = require('./routes/resultados.routes');
const evidenciasRoutes = require('./routes/evidencias.routes');
const normativasRoutes = require('./routes/normativas.routes');
const tiposInspeccionRoutes = require('./routes/tiposInspeccion.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Archivos de evidencia servidos de forma estática (protegidos por token en el frontend al solicitarlos)
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'verificadora-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/estaciones', estacionesRoutes);
app.use('/api/inspecciones', inspeccionesRoutes);
app.use('/api/resultados', resultadosRoutes);
app.use('/api/evidencias', evidenciasRoutes);
app.use('/api/normativas', normativasRoutes);
app.use('/api/tipos-inspeccion', tiposInspeccionRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
