import express from 'express'
import cors from 'cors'
import { categories, events } from './data/events.js'
import { cancelEnrollment, clearStudent, enroll, getAllEvents, getEvent, getInscriptions } from './data/memoryStore.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)
const demoDelayMs = Math.min(Math.max(Number(process.env.DEMO_DELAY_MS ?? 5000), 0), 30000)

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())

// Asíncrono y no bloqueante: mientras espera este timer, Node puede atender otras peticiones.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'laboratorio9-backend' }))
app.get('/api/categories', (_req, res) => res.json(categories))
app.get('/api/events', (_req, res) => res.json(getAllEvents()))
app.get('/api/events/:id', (req, res) => {
  const event = getEvent(req.params.id)
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' })
  return res.json(event)
})

app.get('/api/students/:email/inscriptions', (req, res) => {
  res.json({ inscriptions: getInscriptions(req.params.email) })
})

app.post('/api/events/:id/inscriptions', (req, res) => {
  const { email } = req.body ?? {}
  if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ error: 'El correo del estudiante es obligatorio' })
  const result = enroll(email.trim(), req.params.id)
  if (result.error) return res.status(result.status).json({ error: result.error })
  return res.status(201).json(result)
})

app.delete('/api/events/:id/inscriptions/:email', (req, res) => {
  const result = cancelEnrollment(req.params.email, req.params.id)
  if (result.error) return res.status(result.status).json({ error: result.error })
  return res.json(result)
})

app.delete('/api/students/:email/inscriptions', (req, res) => {
  clearStudent(req.params.email)
  res.json({ inscriptions: [] })
})

// Para la exposición: GET /api/demo/slow?ms=5000, mientras se consulta /api/health.
app.get('/api/demo/slow', async (req, res) => {
  const requested = Number(req.query.ms ?? demoDelayMs)
  const delay = Math.min(Math.max(Number.isFinite(requested) ? requested : demoDelayMs, 0), 30000)
  const startedAt = new Date().toISOString()
  await wait(delay)
  res.json({ message: 'Demora simulada completada', delayMs: delay, startedAt, finishedAt: new Date().toISOString() })
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Error interno del servidor' })
})

app.listen(port, () => console.log(`Backend listo en http://localhost:${port}`))
