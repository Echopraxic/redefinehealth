import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { UserProfile, CreateUserInput } from '../../domain/user-profile.ts'

// -----------------------------------------------
// Row ↔ domain mapping
// -----------------------------------------------

type UserRow = Record<string, unknown>

function rowToProfile(row: UserRow): UserProfile {
    return {
        id:         row['id'] as string,
        phone:      row['phone'] as string,
        name:       row['name'] as string,
        timezone:   row['timezone'] as string,
        wakeTime:   row['wake_time'] as string,
        sleepTime:  row['sleep_time'] as string,
        goals:      JSON.parse(row['goals'] as string),
        preferences: JSON.parse(row['preferences'] as string),
        stack:      JSON.parse(row['stack'] as string),
        peptides:   JSON.parse(row['peptides'] as string),
        onboarded:  Boolean(row['onboarded']),
        createdAt:  row['created_at'] as number,
        updatedAt:  row['updated_at'] as number,
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
        const now = Date.now()

        this.db.prepare(`
            INSERT INTO users
                (id, phone, name, timezone, wake_time, sleep_time, goals, preferences, stack, peptides, onboarded, created_at, updated_at)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
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
            now,
            now,
        )

        return this.findById(id)!
    }

    findById(id: string): UserProfile | null {
        const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
        return row ? rowToProfile(row) : null
    }

    findByPhone(phone: string): UserProfile | null {
        const row = this.db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as UserRow | undefined
        return row ? rowToProfile(row) : null
    }

    findAll(): UserProfile[] {
        return (this.db.prepare('SELECT * FROM users').all() as UserRow[]).map(rowToProfile)
    }

    update(id: string, updates: Partial<Omit<UserProfile, 'id' | 'createdAt'>>): UserProfile | null {
        const existing = this.findById(id)
        if (!existing) return null

        const next: UserProfile = { ...existing, ...updates, updatedAt: Date.now() }

        this.db.prepare(`
            UPDATE users SET
                phone = ?, name = ?, timezone = ?, wake_time = ?, sleep_time = ?,
                goals = ?, preferences = ?, stack = ?, peptides = ?,
                onboarded = ?, updated_at = ?
            WHERE id = ?
        `).run(
            next.phone, next.name, next.timezone, next.wakeTime, next.sleepTime,
            JSON.stringify(next.goals), JSON.stringify(next.preferences),
            JSON.stringify(next.stack), JSON.stringify(next.peptides),
            next.onboarded ? 1 : 0, next.updatedAt,
            id,
        )

        return this.findById(id)
    }

    markOnboarded(id: string): void {
        this.db.prepare('UPDATE users SET onboarded = 1, updated_at = ? WHERE id = ?').run(Date.now(), id)
    }

    delete(id: string): void {
        this.db.prepare('DELETE FROM users WHERE id = ?').run(id)
    }
}
