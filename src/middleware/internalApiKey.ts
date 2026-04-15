import type { Request, Response, NextFunction } from 'express'

export function internalApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-internal-api-key']

  if (!key || key !== process.env.INTERNAL_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  next()
}
