# Unidad Verificadora 05 del Sureste — Sistema de Gestión de Inspecciones

Aplicación web para gestionar inspecciones de estaciones de servicio (NOM-005-ASEA,
Anexo 21, Anexo 22): asignación de tareas a inspectores, registro de resultados por
normativa, carga de evidencias y dashboard de métricas.

## Stack

- **Frontend:** Angular 19 (standalone components, signals, lazy loading)
- **Backend:** Node.js 20 + Express (arquitectura en capas)
- **Base de datos:** PostgreSQL 16
- **Contenerización:** Docker + Docker Compose (perfiles dev y prod)

---

## 1. Arquitectura

```
Angular (SPA) ── HTTPS/REST + JWT ──▶ Express API ──▶ PostgreSQL
                                          │
                                          ▼
                                    /uploads (volumen persistente)
```

Backend en capas:

```
routes/        Definición de endpoints HTTP
controllers/    Validación de entrada + orquestación de la respuesta
config/db.js    Pool de conexión a PostgreSQL + helper de queries
middleware/     auth (JWT + roles), upload (multer seguro), errorHandler centralizado
utils/seed.js   Crea el usuario gerente inicial
```

Frontend en capas:

```
core/services/       Llamadas HTTP a la API (uno por recurso)
core/guards/          authGuard (requiere sesión), gerenteGuard (requiere rol gerente)
core/interceptors/    Inyecta el JWT en cada petición, hace logout en 401
features/             Un folder por pantalla: auth, dashboard, estaciones, inspecciones, usuarios
shared/layout/         Shell con sidebar de navegación
```

## 2. Modelo entidad-relación

```
roles (1) ──< usuarios (N)
usuarios[gerente] (1) ──< asignaciones (N) >── inspecciones (1)
usuarios[empleado] (1) ──< asignaciones (N)
estaciones (1) ──< inspecciones (N)
inspecciones (1) ──< evidencias (N)
inspecciones (1) ──< resultados_inspeccion (N) >── normativas (1)
```

El script completo con tipos, constraints, índices y datos semilla está en
`backend/database/init.sql`. Se ejecuta automáticamente la primera vez que se
levanta el contenedor de PostgreSQL (vía `docker-entrypoint-initdb.d`).

## 3. Endpoints de la API

Base URL: `http://localhost:3000/api` (dev) — todos requieren `Authorization: Bearer <token>` excepto `/auth/login`.

### Auth
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| POST | `/auth/login` | Login, retorna JWT + usuario | Público |
| GET | `/auth/me` | Datos del usuario autenticado | Cualquiera |

### Usuarios (empleados)
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/usuarios?rol=empleado` | Listar usuarios | Gerente |
| GET | `/usuarios/:id` | Obtener usuario | Gerente |
| POST | `/usuarios` | Crear usuario (gerente o empleado) | Gerente |
| PUT | `/usuarios/:id` | Actualizar usuario | Gerente |
| DELETE | `/usuarios/:id` | Desactivar usuario (soft delete) | Gerente |

### Estaciones
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/estaciones?estado=&municipio=&activo=` | Listar con filtros | Gerente/Empleado |
| GET | `/estaciones/:id` | Obtener estación | Gerente/Empleado |
| POST | `/estaciones` | Crear estación | Gerente |
| PUT | `/estaciones/:id` | Actualizar estación | Gerente |
| DELETE | `/estaciones/:id` | Desactivar estación | Gerente |

### Inspecciones
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/inspecciones?estacion_id=&empleado_id=&estatus=&fecha_desde=&fecha_hasta=` | Listar (empleado solo ve las suyas) | Gerente/Empleado |
| GET | `/inspecciones/:id` | Detalle + resultados + evidencias + asignaciones | Gerente/Empleado asignado |
| POST | `/inspecciones` | Crear inspección y asignarla a un empleado (genera folio `UV05-AAAA-0001`) | Gerente |
| PATCH | `/inspecciones/:id/estatus` | Cambiar estatus (`pendiente/en_proceso/completada/cancelada`) | Empleado (propia) / Gerente (cancelar) |

### Resultados por normativa
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| POST | `/resultados` | Registrar/actualizar resultado (`cumple`, `calificacion`, `observaciones`) | Empleado asignado |
| GET | `/resultados/inspeccion/:inspeccionId` | Resultados de una inspección | Gerente/Empleado |

### Evidencias
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| POST | `/evidencias` (multipart/form-data) | Subir evidencia (`imagen`/`pdf`, máx `MAX_UPLOAD_MB`) | Empleado asignado |
| GET | `/evidencias/inspeccion/:inspeccionId` | Listar evidencias | Gerente/Empleado |

### Normativas
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/normativas` | Catálogo (NOM-005, Anexo 21, Anexo 22) | Cualquiera |

### Dashboard
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/dashboard/metricas` | Inspecciones por estatus/mes, top estaciones, cumplimiento por normativa | Gerente |

---

## 4. Cómo levantar el proyecto (desarrollo)

### Requisitos
- Docker y Docker Compose instalados

### Pasos

```bash
# 1. Clonar/copiar el proyecto y entrar a la carpeta
cd verificadora-app

# 2. Copiar variables de entorno
cp .env.example .env
# Edita .env y cambia DB_PASSWORD y JWT_SECRET por valores seguros

# 3. Levantar todo (backend, frontend, base de datos)
docker compose up --build

# 4. En otra terminal, crear el usuario gerente inicial (solo la primera vez)
docker compose exec backend npm run seed
```

### Acceso

| Servicio | URL |
|---|---|
| Frontend (Angular) | http://localhost:4200 |
| API (Express) | http://localhost:3000/api/health |
| PostgreSQL | `localhost:5432` (usuario/clave definidos en `.env`) |

### Credenciales iniciales (cambiar tras el primer login)

```
email:    gerente@uv05sureste.mx
password: Verificadora2026!
```

### Conectarse a la base de datos manualmente

```bash
docker compose exec db psql -U verificadora_user -d verificadora_db
```

O desde un cliente externo (DBeaver, TablePlus, pgAdmin) usando `localhost:5432`
con las credenciales de tu `.env`.

---

## 5. Producción

```bash
cp .env.example .env   # ajustar valores reales de producción
docker compose -f docker-compose.prod.yml up --build -d
```

Diferencias clave vs. desarrollo:
- El frontend se compila (`ng build --configuration production`) y se sirve con Nginx, que hace proxy de `/api` y `/uploads` hacia el backend.
- El backend corre como usuario no-root, sin montar código como volumen (imagen inmutable).
- PostgreSQL no expone su puerto al host, solo es accesible dentro de la red interna `verificadora-net`.
- Persistencia: volúmenes `db_data` (Postgres) y `backend_uploads` (evidencias).

## 6. Buenas prácticas aplicadas

- **Seguridad:** contraseñas con bcrypt, JWT con expiración configurable, Helmet, CORS, validación de mimetype y nombres aleatorios en uploads, usuario no-root en el contenedor de producción, soft-delete (nunca se borran registros con historial referenciado).
- **Errores:** middleware centralizado (`errorHandler.js`) que distingue errores operacionales (400/401/403/404) de errores inesperados, sin filtrar `stack` en producción.
- **Datos:** claves foráneas con `ON DELETE CASCADE` solo donde tiene sentido (evidencias/resultados dependen de la inspección), `UNIQUE` compuestos para evitar duplicados (una normativa por inspección, un empleado no se asigna dos veces a la misma inspección).
- **Docker:** builds multi-stage en producción, `.dockerignore` en ambos servicios, variables sensibles solo vía `.env` (nunca hardcodeadas), red interna dedicada, healthcheck de Postgres antes de levantar el backend.

## 7. Siguientes pasos sugeridos

- Tests automatizados (Jest para backend, Karma/Jasmine o Vitest para frontend)
- Paginación en listados con muchos registros
- Exportación de reportes a PDF/Excel desde el dashboard
- Notificaciones por correo al asignar una inspección
- Refresh tokens (actualmente el JWT expira y requiere nuevo login)
