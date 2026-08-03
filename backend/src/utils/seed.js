/**
 * Crea el usuario gerente inicial si no existe.
 * Uso: npm run seed  (dentro del contenedor backend, o localmente con .env apuntando a la DB)
 */
const bcrypt = require('bcryptjs');
const { query, pool } = require('../config/db');

async function seed() {
  const email = 'gerente@uv05sureste.mx';
  const passwordPlano = 'Verificadora2026!'; // CAMBIAR inmediatamente después del primer login

  const existente = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (existente.rows[0]) {
    console.log('El usuario gerente ya existe, no se crea duplicado.');
    await pool.end();
    return;
  }

  const rol = await query("SELECT id FROM roles WHERE nombre = 'gerente'");
  const passwordHash = await bcrypt.hash(passwordPlano, 10);

  await query(
    `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id)
     VALUES ($1,$2,$3,$4,$5)`,
    ['Encargado', 'Unidad Verificadora 05', email, passwordHash, rol.rows[0].id]
  );

  console.log('Usuario gerente creado:');
  console.log(`  email: ${email}`);
  console.log(`  password: ${passwordPlano}  (cámbiala después de iniciar sesión)`);

  await pool.end();
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
