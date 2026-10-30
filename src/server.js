import express from 'express'
import cors from 'cors'
import { categories } from './data/events.js'
import { eventWithEnrollmentCount, initDatabase, prisma, seedEvents } from './data/database.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)
const demoDelayMs = Math.min(Math.max(Number(process.env.DEMO_DELAY_MS ?? 5000), 0), 30000)

app.use(cors({ origin: (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173').split(',').map((origin) => origin.trim().replace(/\/+$/, '')) }))
app.use(express.json())

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const normalizeEmail = (email) => email.trim().toLowerCase()
const validEmail = (email) => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const today = () => new Date().toISOString().slice(0, 10)

async function ensureStudent(email, name) {
  return prisma.student.upsert({
    where: { email },
    update: name ? { name } : {},
    create: { email, name: name || null },
  })
}

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return res.json({ status: 'ok', service: 'laboratorio9-backend', database: 'connected' })
  } catch {
    return res.status(503).json({ status: 'error', service: 'laboratorio9-backend', database: 'unavailable' })
  }
})

app.get('/api/categories', (_req, res) => res.json(categories))

app.get('/api/events', async (_req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      include: { _count: { select: { enrollments: true } } },
      orderBy: { id: 'asc' },
    })
    res.json(events.map(eventWithEnrollmentCount))
  } catch (error) { next(error) }
})

app.get('/api/events/:id', async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: Number(req.params.id) },
      include: { _count: { select: { enrollments: true } } },
    })
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' })
    return res.json(eventWithEnrollmentCount(event))
  } catch (error) { next(error) }
})

app.get('/api/students/:email/inscriptions', async (req, res, next) => {
  try {
    const inscriptions = await prisma.enrollment.findMany({
      where: { studentEmail: normalizeEmail(req.params.email) },
      select: { eventId: true },
    })
    res.json({ inscriptions: inscriptions.map(({ eventId }) => eventId) })
  } catch (error) { next(error) }
})

app.post('/api/events/:id/inscriptions', async (req, res, next) => {
  const { email: rawEmail, name } = req.body ?? {}
  if (!validEmail(rawEmail)) return res.status(400).json({ error: 'El correo del estudiante es obligatorio y debe ser válido' })
  const email = normalizeEmail(rawEmail)
  const eventId = Number(req.params.id)
  try {
    const result = await prisma.$transaction(async (tx) => {
      // El bloqueo por fila y la transacción evitan sobrepasar cupos con solicitudes simultáneas.
      await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${eventId} FOR UPDATE`
      const event = await tx.event.findUnique({ where: { id: eventId } })
      if (!event) return { error: 'Evento no encontrado', status: 404 }
      if (event.date < today()) return { error: 'El evento ya fue realizado', status: 409 }
      const existing = await tx.enrollment.findUnique({ where: { studentEmail_eventId: { studentEmail: email, eventId } } })
      if (existing) return { error: 'El estudiante ya está inscrito', status: 409 }
      const enrollmentCount = await tx.enrollment.count({ where: { eventId } })
      if (event.initialCount + enrollmentCount >= event.capacity) return { error: 'No hay cupos disponibles', status: 409 }
      await tx.student.upsert({ where: { email }, update: name ? { name } : {}, create: { email, name: name || null } })
      await tx.enrollment.create({ data: { studentEmail: email, eventId } })
      const inscriptions = await tx.enrollment.findMany({ where: { studentEmail: email }, select: { eventId: true } })
      const updatedEvent = await tx.event.findUnique({
        where: { id: eventId },
        include: { _count: { select: { enrollments: true } } },
      })
      return { event: eventWithEnrollmentCount(updatedEvent), inscriptions: inscriptions.map(({ eventId: id }) => id) }
    })
    if (result.error) return res.status(result.status).json({ error: result.error })
    return res.status(201).json(result)
  } catch (error) { return next(error) }
})

app.delete('/api/events/:id/inscriptions/:email', async (req, res, next) => {
  const email = normalizeEmail(req.params.email)
  const eventId = Number(req.params.id)
  try {
    const enrollment = await prisma.enrollment.findUnique({ where: { studentEmail_eventId: { studentEmail: email, eventId } } })
    if (!enrollment) return res.status(404).json({ error: 'Inscripción no encontrada' })
    await prisma.enrollment.delete({ where: { studentEmail_eventId: { studentEmail: email, eventId } } })
    const inscriptions = await prisma.enrollment.findMany({ where: { studentEmail: email }, select: { eventId: true } })
    res.json({ inscriptions: inscriptions.map(({ eventId: id }) => id) })
  } catch (error) { next(error) }
})

app.delete('/api/students/:email/inscriptions', async (req, res, next) => {
  try {
    await prisma.enrollment.deleteMany({ where: { studentEmail: normalizeEmail(req.params.email) } })
    res.json({ inscriptions: [] })
  } catch (error) { next(error) }
})

app.get('/api/students/:email/favorites', async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { studentEmail: normalizeEmail(req.params.email) },
      select: { eventId: true },
    })
    res.json({ favorites: favorites.map(({ eventId }) => eventId) })
  } catch (error) { next(error) }
})

app.post('/api/students/:email/favorites/:eventId', async (req, res, next) => {
  const email = normalizeEmail(req.params.email)
  const eventId = Number(req.params.eventId)
  if (!validEmail(email)) return res.status(400).json({ error: 'Correo inválido' })
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' })
    await ensureStudent(email, req.body?.name)
    await prisma.favorite.upsert({
      where: { studentEmail_eventId: { studentEmail: email, eventId } },
      update: {},
      create: { studentEmail: email, eventId },
    })
    const favorites = await prisma.favorite.findMany({ where: { studentEmail: email }, select: { eventId: true } })
    res.status(201).json({ favorites: favorites.map(({ eventId: id }) => id) })
  } catch (error) { next(error) }
})

app.delete('/api/students/:email/favorites/:eventId', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.params.email)
    const eventId = Number(req.params.eventId)
    await prisma.favorite.deleteMany({ where: { studentEmail: email, eventId } })
    const favorites = await prisma.favorite.findMany({ where: { studentEmail: email }, select: { eventId: true } })
    res.json({ favorites: favorites.map(({ eventId: id }) => id) })
  } catch (error) { next(error) }
})

app.get('/api/events/:id/reviews', async (req, res, next) => {
  try {
    const eventId = Number(req.params.id)
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' })
    const [reviews, aggregate] = await Promise.all([
      prisma.review.findMany({
        where: { eventId },
        include: { student: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.aggregate({ where: { eventId }, _avg: { rating: true }, _count: { _all: true } }),
    ])
    res.json({
      average: aggregate._avg.rating ?? null,
      count: aggregate._count._all,
      reviews: reviews.map(({ student, ...review }) => ({ ...review, name: student.name || 'Estudiante' })),
    })
  } catch (error) { next(error) }
})

app.post('/api/events/:id/reviews', async (req, res, next) => {
  const { email: rawEmail, name, rating, comment } = req.body ?? {}
  if (!validEmail(rawEmail)) return res.status(400).json({ error: 'El correo del estudiante debe ser válido' })
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'La calificación debe ser un número entre 1 y 5' })
  if (typeof comment !== 'string' || !comment.trim() || comment.trim().length > 1000) {
    return res.status(400).json({ error: 'El comentario es obligatorio y debe tener como máximo 1000 caracteres' })
  }
  try {
    const eventId = Number(req.params.id)
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' })
    if (event.date >= today()) return res.status(409).json({ error: 'Solo puedes calificar eventos que ya se realizaron' })
    const email = normalizeEmail(rawEmail)
    await ensureStudent(email, name)
    const review = await prisma.review.upsert({
      where: { studentEmail_eventId: { studentEmail: email, eventId } },
      update: { rating, comment: comment.trim() },
      create: { studentEmail: email, eventId, rating, comment: comment.trim() },
      include: { student: { select: { name: true } } },
    })
    res.status(201).json({ ...review, name: review.student.name || 'Estudiante' })
  } catch (error) { next(error) }
})

app.get('/api/demo/slow', async (req, res) => {
  const requested = Number(req.query.ms ?? demoDelayMs)
  const delay = Math.min(Math.max(Number.isFinite(requested) ? requested : demoDelayMs, 0), 30000)
  const startedAt = new Date().toISOString()
  await wait(delay)
  res.json({ message: 'Demora simulada completada', delayMs: delay, startedAt, finishedAt: new Date().toISOString() })
})

app.use((error, _req, res, _next) => {
  console.error(error)
  if (error.code === 'P2002') return res.status(409).json({ error: 'El registro ya existe' })
  if (error.code === 'P2003' || error.code === 'P2025') return res.status(404).json({ error: 'Registro relacionado no encontrado' })
  return res.status(500).json({ error: 'Error interno del servidor' })
})

async function start() {
  const server = app.listen(port, () => console.log('Backend listo en el puerto ' + port))
  initDatabase()
    .then(() => {
      console.log('Estructura de base de datos verificada/creada.')
      return seedEvents()
    })
    .then(() => console.log('Eventos sincronizados con éxito.'))
    .catch((err) => console.error('Aviso inicialización BD:', err.message))
  const shutdown = async () => {
    server.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

start().catch(async (error) => {
  console.error('No se pudo iniciar el backend; verifica DATABASE_URL y ejecuta las migraciones.', error)
  await prisma.$disconnect()
  process.exit(1)
})
