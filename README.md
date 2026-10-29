# Backend de Eventos

API REST con Node.js, Express, PostgreSQL y Prisma ORM. Las inscripciones, favoritos y reseñas se guardan en PostgreSQL; los eventos de ejemplo se cargan una vez al arrancar y no sobrescriben cambios existentes.

## Requisitos y configuración local

- Node.js 20 o superior.
- Una instancia PostgreSQL accesible (local o Azure). No es necesario instalar Docker.

```bash
npm install
```

Copia `.env.example` a `.env` y configura `DATABASE_URL`. Luego inicializa la base de datos:

```bash
npm run db:generate
npm run db:migrate:dev
npm run dev
```

Para un despliegue con las migraciones ya incluidas en el repositorio:

```bash
npm run db:generate
npm run db:migrate
npm start
```

Variables disponibles: `DATABASE_URL`, `PORT`, `FRONTEND_ORIGIN` (acepta varios orígenes separados por coma) y `DEMO_DELAY_MS`. Mantén `.env` fuera de Git; configura `DATABASE_URL` como secreto en el servicio de Azure.

## API

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/health` | Estado del servicio y conexión a PostgreSQL |
| GET | `/api/categories` | Categorías disponibles |
| GET | `/api/events` | Eventos y ocupación actual |
| GET | `/api/events/:id` | Detalle de un evento |
| GET | `/api/students/:email/inscriptions` | Inscripciones del estudiante |
| POST | `/api/events/:id/inscriptions` | Inscribir: `{ "email": "alumno@unmsm.edu.pe", "name": "Nombre" }` |
| DELETE | `/api/events/:id/inscriptions/:email` | Cancelar inscripción |
| DELETE | `/api/students/:email/inscriptions` | Cancelar todas las inscripciones |
| GET | `/api/students/:email/favorites` | Consultar IDs favoritos |
| POST | `/api/students/:email/favorites/:eventId` | Agregar evento favorito; cuerpo opcional `{ "name": "Nombre" }` |
| DELETE | `/api/students/:email/favorites/:eventId` | Quitar favorito |
| GET | `/api/events/:id/reviews` | Consultar opiniones y promedio |
| POST | `/api/events/:id/reviews` | Crear/actualizar opinión: `{ "email": "...", "name": "...", "rating": 1, "comment": "..." }` |
| GET | `/api/demo/slow?ms=5000` | Demora asíncrona para demostrar concurrencia |

La calificación debe ser de 1 a 5, el comentario de hasta 1000 caracteres y solo se aceptan reseñas de eventos ya realizados. Cada estudiante puede mantener una reseña por evento; volver a enviarla la actualiza. El bloqueo transaccional por evento evita superar cupos en inscripciones concurrentes.

## Contenedor para despliegue

El `Dockerfile` está preparado para construir el servicio en Azure; no es necesario ejecutar Docker en el equipo de desarrollo. El build debe suministrar `DATABASE_URL` y las variables de entorno en el servicio. Ejecutar `npm run db:migrate` como paso de release/deployment antes de iniciar la nueva versión. El backend escucha en `PORT` y expone `/api/health`.

## Evidencia de concurrencia

Con el servidor iniciado, ejecuta en terminales distintas:

```bash
curl http://localhost:3000/api/demo/slow?ms=10000
curl http://localhost:3000/api/health
```

La ruta lenta espera con un timer dentro de una promesa; mientras está pendiente, Node puede responder a otras peticiones.
