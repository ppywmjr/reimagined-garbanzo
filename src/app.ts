import express from 'express'
import cors from 'cors'
import userRoutes from './routes/userRoutes.js'
import planRoutes from './routes/planRoutes.js'
import courseRoutes from './routes/courseRoutes.js'
import meRoutes from './routes/meRoutes.js'
import { clerkMiddleware } from '@clerk/express'
import { internalApiKey } from './middleware/internalApiKey.js'
import { logger } from './middleware/logger.js'

const app = express()

app.use(logger)

// CORS is only enforced in production. Set ALLOWED_ORIGIN to your frontend domain
// (e.g. https://your-app.vercel.app). Omitting it allows all origins ('*') which
// is safe here because all data routes are protected by internalApiKey + Clerk auth,
// but setting it explicitly is recommended for production.
/* v8 ignore next 5 */
if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'staging') {
  app.use(cors({
    origin: process.env.ALLOWED_ORIGIN ?? '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-api-key'],
  }))
}

// Any raw-body route (e.g. Stripe webhook) must be registered here,
// before express.json() and before internalApiKey.

app.use(express.json({ limit: '100kb' }))

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.use(internalApiKey)
app.use(planRoutes)
app.use(clerkMiddleware())
app.use(userRoutes)
app.use(courseRoutes)
app.use(meRoutes)

export default app
