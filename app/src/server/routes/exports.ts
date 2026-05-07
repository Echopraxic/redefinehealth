import { NOT_FOUND } from '../response.ts'
import type { RouteHandler } from '../router.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { ComplianceStore } from '../../infrastructure/storage/compliance-store.ts'
import type { BiomarkerStore } from '../../infrastructure/storage/biomarker-store.ts'

export function makeExportRoutes(
    users: UserRepository,
    compliance: ComplianceStore,
    biomarkers: BiomarkerStore,
) {
    // GET /users/:id/export
    const exportUser: RouteHandler = ({ params }) => {
        const user = users.findById(params['id']!)
        if (!user) return NOT_FOUND

        const bundle = buildExportBundle(user, compliance, biomarkers)
        const json = JSON.stringify(bundle, null, 2)
        const filename = `healthspan-export-${user.id}-${new Date().toISOString().split('T')[0]}.json`

        return new Response(json, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    }

    return { exportUser }
}

function buildExportBundle(
    user: ReturnType<UserRepository['findById']> & {},
    compliance: ComplianceStore,
    biomarkers: BiomarkerStore,
) {
    const DAYS = 3650  // 10-year window — effectively all-time for this app

    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        profile: {
            id:          user.id,
            name:        user.name,
            phone:       user.phone,
            timezone:    user.timezone,
            wakeTime:    user.wakeTime,
            sleepTime:   user.sleepTime,
            goals:       user.goals,
            stack:       user.stack,
            peptides:    user.peptides,
            skincare:    user.skincare,
            preferences: user.preferences,
            onboarded:   user.onboarded,
            consentAt:   user.consentAt ? new Date(user.consentAt).toISOString() : null,
            createdAt:   new Date(user.createdAt).toISOString(),
            updatedAt:   new Date(user.updatedAt).toISOString(),
        },
        compliance: compliance.getAllComplianceHistory(user.id, DAYS).map(r => ({
            supplement:  r.supplementName,
            taken:       r.taken,
            loggedAt:    new Date(r.loggedAt).toISOString(),
            notes:       r.notes ?? null,
        })),
        peptideInjections: compliance.getAllInjections(user.id).map(r => ({
            peptide:       r.peptideName,
            scheduledAt:   new Date(r.scheduledAt).toISOString(),
            takenAt:       r.takenAt ? new Date(r.takenAt).toISOString() : null,
            skipped:       r.skipped,
            skipReason:    r.skipReason ?? null,
            injectionSite: r.injectionSite ?? null,
            sideEffects:   r.sideEffects ?? null,
        })),
        biomarkers: biomarkers.getAllHistory(user.id, DAYS).map(r => ({
            marker:     r.markerName,
            value:      r.value,
            unit:       r.unit,
            source:     r.source,
            notes:      r.notes ?? null,
            recordedAt: new Date(r.recordedAt).toISOString(),
        })),
    }
}
