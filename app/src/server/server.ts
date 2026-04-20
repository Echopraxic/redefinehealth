import { Router } from './router.ts'
import { UNAUTHORIZED, INTERNAL_ERROR } from './response.ts'
import { handleHealth } from './routes/health.ts'
import { makeUsersRoutes } from './routes/users.ts'
import { makeReportsRoutes } from './routes/reports.ts'
import { makeComplianceRoutes } from './routes/compliance.ts'
import { makeBiomarkerRoutes } from './routes/biomarkers.ts'
import { makeWebhookRoutes } from './routes/webhooks.ts'
import { makeLeaderboardRoutes } from './routes/leaderboard.ts'
import type { UserRepository } from '../infrastructure/storage/user-repository.ts'
import type { ComplianceStore } from '../infrastructure/storage/compliance-store.ts'
import type { BiomarkerStore } from '../infrastructure/storage/biomarker-store.ts'

// -----------------------------------------------
// Rate limiter — sliding window per IP (60 req/min)
// -----------------------------------------------

const WINDOW_MS = 60_000
const MAX_REQUESTS = 60

const rateLimitMap = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const windowStart = now - WINDOW_MS
    const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => t > windowStart)
    timestamps.push(now)
    rateLimitMap.set(ip, timestamps)
    return timestamps.length > MAX_REQUESTS
}

// -----------------------------------------------
// HealthspanServer
// -----------------------------------------------

export interface ServerDeps {
    users: UserRepository
    compliance: ComplianceStore
    biomarkers: BiomarkerStore
    apiKey: string | null
    port: number
}

export class HealthspanServer {
    private readonly router: Router
    private readonly apiKey: string | null
    private readonly port: number
    private server: ReturnType<typeof Bun.serve> | null = null

    constructor({ users, compliance, biomarkers, apiKey, port }: ServerDeps) {
        this.apiKey = apiKey
        this.port = port

        const { listUsers, getUser, createUser, updateUser, deleteUser } = makeUsersRoutes(users)
        const { getReport, getStreak } = makeReportsRoutes(users, compliance)
        const { getComplianceLogs, logCompliance, getInjectionLogs } = makeComplianceRoutes(users, compliance)
        const { getBiomarkers, getMarkerHistory, logBiomarker, deleteBiomarker, getRegistry } = makeBiomarkerRoutes(users, biomarkers)
        const { appleHealthWebhook } = makeWebhookRoutes(users, biomarkers)
        const { getLeaderboard } = makeLeaderboardRoutes(users, compliance)

        this.router = new Router()
            // Health — unauthenticated
            .get('/health', handleHealth)

            // Marker registry — unauthenticated reference endpoint
            .get('/biomarkers/registry', getRegistry)

            // Users
            .get('/users',          listUsers)
            .get('/users/:id',      getUser)
            .post('/users',         createUser)
            .patch('/users/:id',    updateUser)
            .del('/users/:id',      deleteUser)

            // Reports
            .get('/users/:id/report',  getReport)
            .get('/users/:id/streak',  getStreak)

            // Compliance logs
            .get('/users/:id/compliance',  getComplianceLogs)
            .post('/users/:id/compliance', logCompliance)
            .get('/users/:id/injections',  getInjectionLogs)

            // Biomarkers
            .get('/users/:id/biomarkers',                    getBiomarkers)
            .post('/users/:id/biomarkers',                   logBiomarker)
            .get('/users/:id/biomarkers/:marker',            getMarkerHistory)
            .del('/users/:id/biomarkers/:entryId',           deleteBiomarker)

            // Leaderboard — unauthenticated (display names only, no userId exposed)
            .get('/leaderboard',                             getLeaderboard)

            // Webhooks
            .post('/webhook/apple-health',                   appleHealthWebhook)
    }

    start(): void {
        const { router, apiKey, port } = this

        this.server = Bun.serve({
            port,
            fetch(req) {
                const url = new URL(req.url)

                // Rate limiting (skip for health)
                if (url.pathname !== '/health') {
                    // Use x-real-ip first (set by nginx/Caddy), then the first entry
                    // of x-forwarded-for. Never trust the full header chain from clients.
                    const xRealIp = req.headers.get('x-real-ip')
                    const xForwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                    const ip = xRealIp ?? xForwardedFor ?? 'unknown'
                    if (isRateLimited(ip)) {
                        return new Response(JSON.stringify({ ok: false, error: { code: 'rate_limited', message: 'Too many requests' } }), {
                            status: 429,
                            headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
                        })
                    }
                }

                // Auth (skip for health)
                if (apiKey && url.pathname !== '/health') {
                    const auth = req.headers.get('authorization') ?? ''
                    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
                    if (token !== apiKey) return UNAUTHORIZED
                }

                try {
                    return router.dispatch(req)
                } catch (err) {
                    console.error('[server] Unhandled error:', err)
                    return INTERNAL_ERROR
                }
            },
        })

        console.log(`[server] Listening on http://localhost:${port}`)
    }

    stop(): void {
        this.server?.stop()
        this.server = null
        console.log('[server] Stopped')
    }
}
