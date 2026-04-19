import { ok, BAD_REQUEST, NOT_FOUND } from '../response.ts'
import { AppleHealthBridge } from '../../infrastructure/apple-health/bridge.ts'
import type { RouteHandler } from '../router.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { BiomarkerStore } from '../../infrastructure/storage/biomarker-store.ts'

export function makeWebhookRoutes(users: UserRepository, biomarkers: BiomarkerStore) {
    const bridge = new AppleHealthBridge(biomarkers)

    // -----------------------------------------------
    // POST /webhook/apple-health
    //
    // Accepts two formats in the body:
    //   - Health Auto Export: { data: { metrics: [...] } }
    //   - Shortcuts flat:     { hrv: 52, resting_hr: 58, ... }
    //
    // userId resolved from:
    //   1. ?userId= query param
    //   2. body.userId field
    //   3. body.user_id field
    // -----------------------------------------------
    const appleHealthWebhook: RouteHandler = async ({ req, searchParams }) => {
        const body = await req.json().catch(() => null) as Record<string, unknown> | null
        if (!body) return BAD_REQUEST('Request body must be valid JSON')

        // Resolve userId
        const userIdParam = searchParams.get('userId') ?? searchParams.get('user_id')
        const userIdBody  = typeof body['userId'] === 'string' ? body['userId'] :
                            typeof body['user_id'] === 'string' ? body['user_id'] : null
        const userId = userIdParam ?? userIdBody

        if (!userId) {
            return BAD_REQUEST('Provide userId as a query param (?userId=) or in the request body')
        }

        const user = users.findById(userId) ?? users.findByPhone(userId)
        if (!user) return NOT_FOUND

        const result = bridge.ingest(body, user.id)

        return ok({
            userId: user.id,
            userName: user.name,
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
