import express from 'express'
import cors from 'cors'
import userRoutes from './routes/userRoutes.js'
import planRoutes from './routes/planRoutes.js'
import courseRoutes from './routes/courseRoutes.js'
import meRoutes from './routes/meRoutes.js'
import { clerkMiddleware } from '@clerk/express'
import { internalApiKey } from './middleware/internalApiKey.js'

const app = express()

// CORS is only enforced in production. Set ALLOWED_ORIGIN to the frontend URL.
// In dev/staging, set NODE_ENV to anything other than 'production' to bypass.
if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'staging') {
  const allowedOrigin = process.env.ALLOWED_ORIGIN
  app.use(cors({ origin: allowedOrigin }))
}

// Any raw-body route (e.g. Stripe webhook) must be registered here,
// before express.json() and before internalApiKey.

app.use(express.json({ limit: '100kb' }))
app.use(internalApiKey)
app.use(clerkMiddleware())
app.use(userRoutes)
app.use(planRoutes)
app.use(courseRoutes)
app.use(meRoutes)

export default app
