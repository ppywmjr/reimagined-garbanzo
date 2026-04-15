import express from 'express'
import userRoutes from './routes/userRoutes.js'
import planRoutes from './routes/planRoutes.js'
import courseRoutes from './routes/courseRoutes.js'
import meRoutes from './routes/meRoutes.js'
import { clerkMiddleware } from '@clerk/express'
import { internalApiKey } from './middleware/internalApiKey.js'

const app = express()

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
