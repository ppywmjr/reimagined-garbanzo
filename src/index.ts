import 'dotenv/config'
import app from './app.js'
import { getPrismaClient, disconnectPrisma } from './lib/prisma.js'

const parsedPort = Number.parseInt(process.env.PORT ?? '', 10)
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down gracefully`)
  // Force-kill after 10s if keep-alive connections prevent server.close() from completing
  setTimeout(() => {
    console.error('Shutdown timed out, forcing exit')
    process.exit(1)
  }, 10_000).unref()
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

async function start(): Promise<void> {
  try {
    await getPrismaClient().$queryRaw`SELECT 1`
    console.log('Database connection established')
  } catch (err) {
    console.error('Failed to connect to database', err)
    process.exit(1)
  }

  server = app.listen(port, () => {
    console.log(`🚀 Server ready at: http://localhost:${port}`)
    console.log(`NODE_ENV=${process.env.NODE_ENV ?? 'unset'}`)
    console.log(`INTERNAL_API_SECRET=${process.env.INTERNAL_API_SECRET ? 'set' : 'MISSING'}`)
    console.log(`ALLOWED_ORIGIN=${process.env.ALLOWED_ORIGIN ?? 'unset (CORS open)'}`)
  })

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

let server: ReturnType<typeof app.listen>

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason)
  process.exit(1)
})

void start()
