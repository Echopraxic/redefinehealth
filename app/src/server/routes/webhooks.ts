import { ok, BAD_REQUEST, NOT_FOUND } from '../response.ts'
import { AppleHealthBridge } from '../../infrastructure/apple-health/bridge.ts'
import type { RouteHandler } from '../router.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { BiomarkerStore } from '../../infrastructure/storage/biomarker-store.ts'

export function makeWebhookRoutes(users: UserRepository, biomarkers: BiomarkerStore) {
    const bridge = new AppleHealthBridge(biomarkers)

    // -----------------------------------------------
    // POST /webhook/apple-health/:token
    //
    // Each user has a unique 32-byte random token.
    // The token IS the authentication — no API key needed, no userId in the body.
    // A leaked token affects only that user and can be rotated via regenerateWebhookToken().
    //
    // Accepts two body formats:
    //   - Health Auto Export: { data: { metrics: [...] } }
    //   - Shortcuts flat:     { hrv: 52, resting_hr: 58, ... }
    // -----------------------------------------------
    const appleHealthWebhook: RouteHandler = async ({ req, params }) => {
        const token = params['token']
        if (!token) return BAD_REQUEST('Missing webhook token')

        const user = users.findByWebhookToken(token)
        if (!user) return NOT_FOUND

        const body = await req.json().catch(() => null) as Record<string, unknown> | null
        if (!body) return BAD_REQUEST('Request body must be valid JSON')

        const result = bridge.ingest(body, user.id)

        return ok({
            imported: result.imported,
            skipped: result.skipped,
            biomarkersSaved: result.biomarkersSaved,
            metrics: {
                hrv:            result.hrv            ?? null,
                restingHr:      result.restingHr      ?? null,
                sleepHours:     result.sleepHours     ?? null,
                sleepDeepHours: result.sleepDeepHours ?? null,
                sleepRemHours:  result.sleepRemHours  ?? null,
                steps:          result.steps          ?? null,
            },
            recordedAt: new Date(result.recordedAt).toISOString(),
        }, 201)
    }

    return { appleHealthWebhook }
}
