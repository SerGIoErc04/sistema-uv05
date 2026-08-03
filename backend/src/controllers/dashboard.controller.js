const { query } = require('../config/db');

async function metricas(req, res, next) {
  try {
    const [porEstatus, porMes, topEstaciones, cumplimientoPorNormativa] = await Promise.all([
      query(`SELECT estatus, COUNT(*)::int AS total FROM inspecciones GROUP BY estatus`),
      query(`
        SELECT to_char(fecha_programada, 'YYYY-MM') AS mes, COUNT(*)::int AS total
        FROM inspecciones GROUP BY mes ORDER BY mes DESC LIMIT 12
      `),
      query(`
        SELECT e.nombre, COUNT(i.id)::int AS total_inspecciones
        FROM estaciones e JOIN inspecciones i ON i.estacion_id = e.id
        GROUP BY e.nombre ORDER BY total_inspecciones DESC LIMIT 5
      `),
      query(`
        SELECT n.clave, n.nombre,
               COUNT(*) FILTER (WHERE ri.cumple = true)::int AS cumple,
               COUNT(*) FILTER (WHERE ri.cumple = false)::int AS no_cumple
        FROM resultados_inspeccion ri JOIN normativas n ON n.id = ri.normativa_id
        GROUP BY n.clave, n.nombre
      `),
    ]);

    res.json({
      ok: true,
      metricas: {
        inspecciones_por_estatus: porEstatus.rows,
        inspecciones_por_mes: porMes.rows,
        estaciones_mas_inspeccionadas: topEstaciones.rows,
        cumplimiento_por_normativa: cumplimientoPorNormativa.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { metricas };
