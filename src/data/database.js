import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

export async function initDatabase() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Event" (
      "id" INTEGER NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "time" TEXT NOT NULL,
      "speaker" TEXT NOT NULL,
      "speakerBio" TEXT,
      "category" TEXT NOT NULL,
      "isFree" BOOLEAN NOT NULL,
      "cost" DOUBLE PRECISION NOT NULL,
      "capacity" INTEGER NOT NULL,
      "initialCount" INTEGER NOT NULL DEFAULT 0,
      "location" TEXT NOT NULL,
      "agenda" JSONB
    );

    CREATE TABLE IF NOT EXISTS "Student" (
      "email" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "Enrollment" (
      "studentEmail" TEXT NOT NULL REFERENCES "Student"("email") ON DELETE CASCADE ON UPDATE CASCADE,
      "eventId" INTEGER NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("studentEmail", "eventId")
    );

    CREATE TABLE IF NOT EXISTS "Favorite" (
      "studentEmail" TEXT NOT NULL REFERENCES "Student"("email") ON DELETE CASCADE ON UPDATE CASCADE,
      "eventId" INTEGER NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("studentEmail", "eventId")
    );

    CREATE TABLE IF NOT EXISTS "Review" (
      "id" SERIAL NOT NULL PRIMARY KEY,
      "studentEmail" TEXT NOT NULL REFERENCES "Student"("email") ON DELETE CASCADE ON UPDATE CASCADE,
      "eventId" INTEGER NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "rating" INTEGER NOT NULL,
      "comment" VARCHAR(1000) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Review_studentEmail_eventId_key" UNIQUE ("studentEmail", "eventId"),
      CONSTRAINT "Review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
    );

    CREATE INDEX IF NOT EXISTS "Enrollment_eventId_idx" ON "Enrollment"("eventId");
    CREATE INDEX IF NOT EXISTS "Favorite_eventId_idx" ON "Favorite"("eventId");
    CREATE INDEX IF NOT EXISTS "Review_eventId_idx" ON "Review"("eventId");
  `)
}

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
