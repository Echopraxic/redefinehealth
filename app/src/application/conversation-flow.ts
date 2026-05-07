// -----------------------------------------------
// Multi-step conversation state machine
// Write-through to SQLite so sessions survive crashes and dev restarts.
// -----------------------------------------------

import type Database from 'better-sqlite3'

export type FlowState =
    | 'idle'
    | 'onboarding_consent'
    | 'onboarding_name'
    | 'onboarding_goals'
    | 'onboarding_wake_time'
    | 'onboarding_sleep_time'
    | 'onboarding_timezone'
    | 'onboarding_stack_supplements'
    | 'onboarding_stack_peptides'
    | 'onboarding_stack_skincare'
    | 'onboarding_stack_confirm'
    | 'adjusting_protocol'
    | 'logging_side_effect'

export interface ConversationContext {
    userId: string   // phone number during pre-registration
    state: FlowState
    pending: Record<string, unknown>
    updatedAt: number
}

// -----------------------------------------------
// Manager
// -----------------------------------------------

export class ConversationFlowManager {
    private readonly db: Database.Database

    constructor(db: Database.Database) {
        this.db = db
    }

    /** Start a new flow, overwriting any existing session */
    start(userId: string, state: FlowState, pending: Record<string, unknown> = {}): void {
        this.db.prepare(`
            INSERT INTO conversation_sessions (user_id, state, pending, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (user_id) DO UPDATE SET
                state      = excluded.state,
                pending    = excluded.pending,
                updated_at = excluded.updated_at
        `).run(userId, state, JSON.stringify(pending), Date.now())
    }

    get(userId: string): ConversationContext | null {
        const row = this.db.prepare(
            'SELECT user_id, state, pending, updated_at FROM conversation_sessions WHERE user_id = ?'
        ).get(userId) as { user_id: string; state: string; pending: string; updated_at: number } | undefined

        if (!row) return null
        return {
            userId: row.user_id,
            state: row.state as FlowState,
            pending: JSON.parse(row.pending) as Record<string, unknown>,
            updatedAt: row.updated_at,
        }
    }

    update(userId: string, updates: Partial<Pick<ConversationContext, 'state' | 'pending'>>): void {
        const existing = this.get(userId)
        if (!existing) return
        const newState = updates.state ?? existing.state
        const newPending = { ...existing.pending, ...(updates.pending ?? {}) }
        this.db.prepare(`
            UPDATE conversation_sessions
            SET state = ?, pending = ?, updated_at = ?
            WHERE user_id = ?
        `).run(newState, JSON.stringify(newPending), Date.now(), userId)
    }

    clear(userId: string): void {
        this.db.prepare('DELETE FROM conversation_sessions WHERE user_id = ?').run(userId)
    }

    isActive(userId: string): boolean {
        const row = this.db.prepare(
            'SELECT 1 FROM conversation_sessions WHERE user_id = ?'
        ).get(userId)
        return row !== undefined
    }

    /** Returns true if the session has been idle for longer than timeoutMs (default: 30 min) */
    isExpired(userId: string, timeoutMs = 30 * 60 * 1000): boolean {
        const row = this.db.prepare(
            'SELECT updated_at FROM conversation_sessions WHERE user_id = ?'
        ).get(userId) as { updated_at: number } | undefined
        return !row || Date.now() - row.updated_at > timeoutMs
    }

    /** Remove all expired sessions */
    pruneExpired(timeoutMs = 30 * 60 * 1000): void {
        const cutoff = Date.now() - timeoutMs
        this.db.prepare('DELETE FROM conversation_sessions WHERE updated_at < ?').run(cutoff)
    }
}
