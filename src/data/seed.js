import { prisma, seedEvents } from './database.js'

try {
  await seedEvents()
  console.log('Eventos de ejemplo sincronizados.')
} catch (error) {
  console.error('No se pudieron cargar los eventos de ejemplo.', error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
