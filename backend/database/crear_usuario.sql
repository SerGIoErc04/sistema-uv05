-- ============================================================
-- Crear un usuario manualmente vía SQL
-- Requiere la extensión pgcrypto (ya se habilita en init.sql)
-- El hash generado con crypt(..., gen_salt('bf')) es 100% compatible
-- con bcryptjs.compare() usado en el backend (mismo algoritmo bcrypt).
-- ============================================================

INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol_id)
VALUES (
    'Juan',                                  -- nombre
    'Pérez',                                 -- apellido
    'juan.perez@uv05sureste.mx',             -- email (debe ser único)
    crypt('MiPasswordSegura123!', gen_salt('bf')),  -- password en texto plano -> hash bcrypt
    '2381234567',                            -- telefono (opcional)
    (SELECT id FROM roles WHERE nombre = 'empleado')  -- o 'gerente'
);
