import { ok, NOT_FOUND, BAD_REQUEST } from '../response.ts'
import type { RouteHandler } from '../router.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { ComplianceStore } from '../../infrastructure/storage/compliance-store.ts'

export function makeComplianceRoutes(users: UserRepository, compliance: ComplianceStore) {
    // GET /users/:id/compliance?days=30&supplement=
    const getComplianceLogs: RouteHandler = ({ params, searchParams }) => {
        const user = users.findById(params['id']!)
        if (!user) return NOT_FOUND

        const days = parseInt(searchParams.get('days') ?? '30', 10)
        if (isNaN(days) || days < 1 || days > 365) return BAD_REQUEST('days must be between 1 and 365')

        const supplement = searchParams.get('supplement')
        const records = supplement
            ? compliance.getComplianceHistory(params['id']!, supplement, days)
            : compliance.getAllComplianceHistory(params['id']!, days)

        return ok({
            userId: user.id,
            periodDays: days,
            supplement: supplement ?? 'all',
            total: records.length,
            taken: records.filter(r => r.taken).length,
            records: records.map(r => ({
                supplement: r.supplementName,
                taken: r.taken,
                notes: r.notes ?? null,
                loggedAt: new Date(r.loggedAt).toISOString(),
            })),
        })
    }

    // POST /users/:id/compliance — manual admin override
    const logCompliance: RouteHandler = async ({ req, params }) => {
        const user = users.findById(params['id']!)
        if (!user) return NOT_FOUND

        const body = await req.json().catch(() => null) as Record<string, unknown> | null
        if (!body) return BAD_REQUEST('Request body must be valid JSON')

        const { supplement, taken, notes } = body
        if (typeof supplement !== 'string' || supplement.trim() === '') return BAD_REQUEST('supplement is required')
        if (typeof taken !== 'boolean') return BAD_REQUEST('taken must be a boolean')

        compliance.logCompliance({
            userId: params['id']!,
            supplementName: supplement.trim(),
            taken,
            notes: typeof notes === 'string' ? notes : undefined,
        })

        return ok({ logged: true, userId: user.id, supplement: supplement.trim(), taken }, 201)
    }

    // GET /users/:id/injections?days=30&peptide=
    const getInjectionLogs: RouteHandler = ({ params, searchParams }) => {
        const user = users.findById(params['id']!)
        if (!user) return NOT_FOUND

        const days = parseInt(searchParams.get('days') ?? '30', 10)
        if (isNaN(days) || days < 1 || days > 365) return BAD_REQUEST('days must be between 1 and 365')

        const peptide = searchParams.get('peptide')

        const activePeptides = peptide
            ? user.peptides.filter(p => p.name.toLowerCase() === peptide.toLowerCase())
            : user.peptides

        const records = activePeptides.flatMap(p =>
            compliance.getInjectionHistory(params['id']!, p.name, days)
        )

        records.sort((a, b) => b.scheduledAt - a.scheduledAt)

        return ok({
            userId: user.id,
            periodDays: days,
            peptide: peptide ?? 'all',
            total: records.length,
            taken: records.filter(r => !r.skipped).length,
            records: records.map(r => ({
                peptide: r.peptideName,
                scheduledAt: new Date(r.scheduledAt).toISOString(),
                takenAt: r.takenAt ? new Date(r.takenAt).toISOString() : null,
                skipped: r.skipped,
                skipReason: r.skipReason ?? null,
                injectionSite: r.injectionSite ?? null,
                sideEffects: r.sideEffects ?? null,
            })),
        })
    }

    return { getComplianceLogs, logCompliance, getInjectionLogs }
}
