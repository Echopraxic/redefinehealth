import { ok } from '../response.ts'
import type { RouteHandler } from '../router.ts'

const startedAt = Date.now()

export const handleHealth: RouteHandler = () =>
    ok({
        status: 'ok',
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        version: '3.0.0',
        timestamp: new Date().toISOString(),
    })
