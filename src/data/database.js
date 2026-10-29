import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

export async function seedEvents() {
  const { events } = await import('./events.js')
  for (const event of events) {
    const { enrolled, ...data } = event
    await prisma.event.upsert({
      where: { id: event.id },
      update: {},
      create: { ...data, initialCount: enrolled },
    })
  }
}

export function eventWithEnrollmentCount(event) {
  const { _count, initialCount, ...data } = event
  return { ...data, enrolled: initialCount + (_count?.enrollments ?? 0) }
}
