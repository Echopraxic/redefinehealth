import type Database from 'better-sqlite3'
import type { ComplianceRecord } from '../../domain/compliance/tracker.ts'

// -----------------------------------------------
// Types
// -----------------------------------------------

export interface PeptideInjectionRecord {
    id?: number
    userId: string
    peptideName: string
    scheduledAt: number
    takenAt?: number
    skipped: boolean
    skipReason?: string
    injectionSite?: string
    sideEffects?: string
}

export interface RecentDose {
    name: string
    takenAt: number
    type: 'supplement' | 'peptide'
}

// -----------------------------------------------
// Store
// -----------------------------------------------

export class ComplianceStore {
    private readonly db: Database.Database

    constructor(db: Database.Database) {
        this.db = db
    }

    // -----------------------------------------------
    // Supplements
    // -----------------------------------------------

    logCompliance(record: Omit<ComplianceRecord, 'loggedAt'> & { loggedAt?: number }): void {
        this.db.prepare(`
            INSERT INTO compliance_log (user_id, supplement_name, logged_at, taken, notes)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            record.userId,
            record.supplementName,
            record.loggedAt ?? Date.now(),
            record.taken ? 1 : 0,
            record.notes ?? null,
        )
    }

    getComplianceHistory(userId: string, supplementName: string, limitDays = 90): ComplianceRecord[] {
        const since = Date.now() - limitDays * 86_400_000
        const rows = this.db.prepare(`
            SELECT user_id, supplement_name, logged_at, taken, notes
            FROM compliance_log
            WHERE user_id = ? AND supplement_name = ? AND logged_at >= ?
            ORDER BY logged_at ASC
        `).all(userId, supplementName, since) as any[]

        return rows.map(r => ({
            userId: r.user_id as string,
            supplementName: r.supplement_name as string,
            loggedAt: r.logged_at as number,
            taken: Boolean(r.taken),
            notes: r.notes ?? undefined,
        }))
    }

    getAllComplianceHistory(userId: string, limitDays = 30): ComplianceRecord[] {
        const since = Date.now() - limitDays * 86_400_000
        const rows = this.db.prepare(`
            SELECT user_id, supplement_name, logged_at, taken, notes
            FROM compliance_log
            WHERE user_id = ? AND logged_at >= ?
            ORDER BY logged_at ASC
        `).all(userId, since) as any[]

        return rows.map(r => ({
            userId: r.user_id as string,
            supplementName: r.supplement_name as string,
            loggedAt: r.logged_at as number,
            taken: Boolean(r.taken),
            notes: r.notes ?? undefined,
        }))
    }

    // -----------------------------------------------
    // Peptide injections
    // -----------------------------------------------

    logInjection(record: PeptideInjectionRecord): void {
        this.db.prepare(`
            INSERT INTO peptide_injections
                (user_id, peptide_name, scheduled_at, taken_at, skipped, skip_reason, injection_site, side_effects)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            record.userId,
            record.peptideName,
            record.scheduledAt,
            record.takenAt ?? null,
            record.skipped ? 1 : 0,
            record.skipReason ?? null,
            record.injectionSite ?? null,
            record.sideEffects ?? null,
        )
    }

    getInjectionHistory(userId: string, peptideName: string, limitDays = 90): PeptideInjectionRecord[] {
        const since = Date.now() - limitDays * 86_400_000
        const rows = this.db.prepare(`
            SELECT * FROM peptide_injections
            WHERE user_id = ? AND peptide_name = ? AND scheduled_at >= ?
            ORDER BY scheduled_at ASC
        `).all(userId, peptideName, since) as any[]

        return rows.map(r => ({
            id: r.id as number,
            userId: r.user_id as string,
            peptideName: r.peptide_name as string,
            scheduledAt: r.scheduled_at as number,
            takenAt: r.taken_at ?? undefined,
            skipped: Boolean(r.skipped),
            skipReason: r.skip_reason ?? undefined,
            injectionSite: r.injection_site ?? undefined,
            sideEffects: r.side_effects ?? undefined,
        }))
    }

    // -----------------------------------------------
    // Cross-type recent dose lookup (for side-effect analysis)
    // -----------------------------------------------

    getRecentDoses(userId: string, withinHours = 6): RecentDose[] {
        const since = Date.now() - withinHours * 3_600_000

        const supplements = this.db.prepare(`
            SELECT supplement_name AS name, logged_at AS taken_at
            FROM compliance_log
            WHERE user_id = ? AND taken = 1 AND logged_at >= ?
        `).all(userId, since) as any[]

        const peptides = this.db.prepare(`
            SELECT peptide_name AS name, taken_at
            FROM peptide_injections
            WHERE user_id = ? AND skipped = 0 AND taken_at IS NOT NULL AND taken_at >= ?
        `).all(userId, since) as any[]

        return [
            ...supplements.map(r => ({ name: r.name as string, takenAt: r.taken_at as number, type: 'supplement' as const })),
            ...peptides.map(r => ({ name: r.name as string, takenAt: r.taken_at as number, type: 'peptide' as const })),
        ].sort((a, b) => b.takenAt - a.takenAt)
    }
}
