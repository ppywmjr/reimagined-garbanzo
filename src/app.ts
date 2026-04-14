import express from 'express'
import userRoutes from './routes/userRoutes.js'
import planRoutes from './routes/planRoutes.js'
import courseRoutes from './routes/courseRoutes.js'
import meRoutes from './routes/meRoutes.js'
import webhookEventRoutes from './routes/webhookEventRoutes.js'
import { clerkMiddleware } from '@clerk/express'

const app = express()

app.use(express.json({ limit: '100kb' }))
app.use(clerkMiddleware())
app.use(userRoutes)
app.use(planRoutes)
app.use(courseRoutes)
app.use(meRoutes)
app.use(webhookEventRoutes)

export default app
