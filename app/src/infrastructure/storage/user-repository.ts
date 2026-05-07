import type Database from 'better-sqlite3'
import { randomUUID, randomBytes } from 'node:crypto'
import type { UserProfile, CreateUserInput } from '../../domain/user-profile.ts'

// -----------------------------------------------
// Row ↔ domain mapping
// -----------------------------------------------

type UserRow = Record<string, unknown>

function rowToProfile(row: UserRow): UserProfile {
    return {
        id:          row['id'] as string,
        phone:       row['phone'] as string,
        name:        row['name'] as string,
        timezone:    row['timezone'] as string,
        wakeTime:    row['wake_time'] as string,
        sleepTime:   row['sleep_time'] as string,
        goals:       JSON.parse(row['goals'] as string),
        preferences: JSON.parse(row['preferences'] as string),
        stack:       JSON.parse(row['stack'] as string),
        peptides:    JSON.parse(row['peptides'] as string),
        skincare:    JSON.parse((row['skincare'] as string | undefined) ?? '[]'),
        onboarded:     Boolean(row['onboarded']),
        webhookToken:  (row['webhook_token'] as string | null) ?? null,
        consentAt:     (row['consent_at'] as number | null) ?? null,
        createdAt:     row['created_at'] as number,
        updatedAt:     row['updated_at'] as number,
        deletedAt:     (row['deleted_at'] as number | null) ?? null,
    }
}

// -----------------------------------------------
// Repository
// -----------------------------------------------

export class UserRepository {
    private readonly db: Database.Database

    constructor(db: Database.Database) {
        this.db = db
    }

    create(input: CreateUserInput): UserProfile {
        const id = randomUUID()
        const webhookToken = randomBytes(32).toString('hex')
        const now = Date.now()

        this.db.prepare(`
            INSERT INTO users
                (id, phone, name, timezone, wake_time, sleep_time, goals, preferences, stack, peptides, skincare, onboarded, webhook_token, consent_at, created_at, updated_at)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
        `).run(
            id,
            input.phone,
            input.name,
            input.timezone,
            input.wakeTime,
            input.sleepTime,
            JSON.stringify(input.goals),
            JSON.stringify(input.preferences),
            JSON.stringify(input.stack),
            JSON.stringify(input.peptides),
            JSON.stringify(input.skincare ?? []),
            webhookToken,
            input.consentAt ?? null,
            now,
            now,
        )

        return this.findById(id)!
    }

    /** Returns active (non-deleted) user by id, or null */
    findById(id: string): UserProfile | null {
        const row = this.db.prepare(
            'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL'
        ).get(id) as UserRow | undefined
        return row ? rowToProfile(row) : null
    }

    findByPhone(phone: string): UserProfile | null {
        const row = this.db.prepare(
            'SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL'
        ).get(phone) as UserRow | undefined
        return row ? rowToProfile(row) : null
    }

    findAll(): UserProfile[] {
        return (this.db.prepare(
            'SELECT * FROM users WHERE deleted_at IS NULL'
        ).all() as UserRow[]).map(rowToProfile)
    }

    update(id: string, updates: Partial<Omit<UserProfile, 'id' | 'createdAt'>>): UserProfile | null {
        const existing = this.findById(id)
        if (!existing) return null

        const next: UserProfile = { ...existing, ...updates, updatedAt: Date.now() }

        this.db.prepare(`
            UPDATE users SET
                phone = ?, name = ?, timezone = ?, wake_time = ?, sleep_time = ?,
                goals = ?, preferences = ?, stack = ?, peptides = ?, skincare = ?,
                onboarded = ?, updated_at = ?
            WHERE id = ?
        `).run(
            next.phone, next.name, next.timezone, next.wakeTime, next.sleepTime,
            JSON.stringify(next.goals), JSON.stringify(next.preferences),
            JSON.stringify(next.stack), JSON.stringify(next.peptides), JSON.stringify(next.skincare),
            next.onboarded ? 1 : 0, next.updatedAt,
            id,
        )

        return this.findById(id)
    }

    findByWebhookToken(token: string): UserProfile | null {
        const row = this.db.prepare(
            'SELECT * FROM users WHERE webhook_token = ? AND deleted_at IS NULL'
        ).get(token) as UserRow | undefined
        return row ? rowToProfile(row) : null
    }

    regenerateWebhookToken(id: string): string | null {
        const token = randomBytes(32).toString('hex')
        const result = this.db.prepare(
            'UPDATE users SET webhook_token = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
        ).run(token, Date.now(), id)
        return result.changes > 0 ? token : null
    }

    markOnboarded(id: string): void {
        this.db.prepare('UPDATE users SET onboarded = 1, updated_at = ? WHERE id = ?').run(Date.now(), id)
    }

    /** Soft delete: marks deleted_at, hides from all active queries. PII is preserved for 30-day restore window. */
    softDelete(id: string): void {
        this.db.prepare(
            'UPDATE users SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
        ).run(Date.now(), Date.now(), id)
    }

    /** Restore a soft-deleted user within the grace period (before purgeExpired runs). */
    restore(id: string): boolean {
        const result = this.db.prepare(
            'UPDATE users SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL'
        ).run(Date.now(), id)
        return result.changes > 0
    }

    /**
     * Anonymize PII for users whose deleted_at is older than gracePeriodMs (default 30 days).
     * The user row is retained so child table FK references remain valid; personal data is erased.
     * Returns the number of users anonymized.
     */
    purgeExpired(gracePeriodMs = 30 * 24 * 60 * 60 * 1000): number {
        const cutoff = Date.now() - gracePeriodMs
        const result = this.db.prepare(`
            UPDATE users
            SET
                phone        = '[deleted:' || id || ']',
                name         = '[deleted]',
                goals        = '[]',
                stack        = '[]',
                peptides     = '[]',
                preferences  = '{}',
                updated_at   = ?
            WHERE deleted_at IS NOT NULL AND deleted_at < ?
        `).run(Date.now(), cutoff)
        return result.changes as number
    }
}
