import 'dotenv/config'
import app from './app.js'
import { getPrismaClient, disconnectPrisma } from './lib/prisma.js'

const parsedPort = Number.parseInt(process.env.PORT ?? '', 10)
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down gracefully`)
  server.close(async () => {
    try {
      await disconnectPrisma()
      console.log('Database connections closed')
      process.exit(0)
    } catch (err) {
      console.error('Error during shutdown', err)
      process.exit(1)
    }
  })
}

try {
  await getPrismaClient().$connect()
  console.log('Database connection established')
} catch (err) {
  console.error('Failed to connect to database', err)
  process.exit(1)
}

const server = app.listen(port, () =>
  console.log(`
🚀 Server ready at: http://localhost:${port}`),
)

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
