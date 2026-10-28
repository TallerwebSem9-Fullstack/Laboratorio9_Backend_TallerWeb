# Laboratorio 9 — Backend de Eventos

API REST con Node.js y Express. Los eventos y las inscripciones se gestionan en memoria, sin base de datos; se reinician al apagar el servidor.

## Iniciar

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

El servidor usa `http://localhost:3000`. `DEMO_DELAY_MS` permite configurar la demora por defecto del endpoint de demostración (5000 ms). `PORT` y `FRONTEND_ORIGIN` también se pueden configurar por variable de entorno.

## API

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/health` | Estado del backend |
| GET | `/api/categories` | Categorías |
| GET | `/api/events` | Listado de eventos |
| GET | `/api/events/:id` | Detalle de evento |
| GET | `/api/students/:email/inscriptions` | Inscripciones del estudiante |
| POST | `/api/events/:id/inscriptions` | Inscribir con JSON `{ "email": "alumno@unmsm.edu.pe" }` |
| DELETE | `/api/events/:id/inscriptions/:email` | Cancelar inscripción |
| DELETE | `/api/students/:email/inscriptions` | Borrar inscripciones del estudiante |
| GET | `/api/demo/slow?ms=5000` | Simular una petición lenta (máximo 30 s) |

Los errores responden como `{ "error": "..." }` con el código HTTP correspondiente.

## Evidencia de concurrencia

Con el servidor iniciado, ejecuta en dos terminales:

```bash
curl http://localhost:3000/api/demo/slow?ms=10000
curl http://localhost:3000/api/health
```

La segunda petición responde inmediatamente aunque la primera siga esperando. La espera usa `setTimeout` dentro de una promesa: no bloquea el event loop de Node, que puede procesar otras peticiones durante ese tiempo.
