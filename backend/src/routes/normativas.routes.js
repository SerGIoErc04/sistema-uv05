const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM normativas WHERE activo = true ORDER BY clave');
    res.json({ ok: true, normativas: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
