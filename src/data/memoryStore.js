import { events } from './events.js'

// Las inscripciones y ocupación viven en memoria: se reinician al reiniciar Node.
const registrations = new Map()

export function getAllEvents() {
  return events
}

export function getEvent(id) {
  return events.find((event) => event.id === Number(id))
}

export function getInscriptions(email) {
  return [...(registrations.get(email.toLowerCase()) ?? [])]
}

export function enroll(email, eventId) {
  const event = getEvent(eventId)
  if (!event) return { error: 'Evento no encontrado', status: 404 }
  if (new Date(`${event.date}T23:59:59`) < new Date()) return { error: 'El evento ya fue realizado', status: 409 }

  const normalizedEmail = email.toLowerCase()
  const eventIds = registrations.get(normalizedEmail) ?? new Set()
  if (eventIds.has(event.id)) return { error: 'El estudiante ya está inscrito', status: 409 }
  if (event.enrolled >= event.capacity) return { error: 'No hay cupos disponibles', status: 409 }

  eventIds.add(event.id)
  registrations.set(normalizedEmail, eventIds)
  event.enrolled += 1
  return { event, inscriptions: [...eventIds] }
}

export function cancelEnrollment(email, eventId) {
  const event = getEvent(eventId)
  if (!event) return { error: 'Evento no encontrado', status: 404 }
  const normalizedEmail = email.toLowerCase()
  const eventIds = registrations.get(normalizedEmail)
  if (!eventIds?.delete(event.id)) return { error: 'Inscripción no encontrada', status: 404 }
  event.enrolled = Math.max(0, event.enrolled - 1)
  if (eventIds.size === 0) registrations.delete(normalizedEmail)
  return { inscriptions: [...eventIds] }
}

export function clearStudent(email) {
  const normalizedEmail = email.toLowerCase()
  const eventIds = registrations.get(normalizedEmail) ?? []
  for (const id of eventIds) {
    const event = getEvent(id)
    if (event) event.enrolled = Math.max(0, event.enrolled - 1)
  }
  registrations.delete(normalizedEmail)
}
