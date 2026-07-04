import { Request, Response, NextFunction } from 'express'

export function logger(req: Request, res: Response, next: NextFunction) {
    const start = Date.now()
    console.log(`[${new Date().toISOString()}] → ${req.method} ${req.originalUrl}`)

    res.on('finish', () => {
        const duration = Date.now() - start
        console.log(
            `[${new Date().toISOString()}] ← ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`,
        )
    })

    next()
}
