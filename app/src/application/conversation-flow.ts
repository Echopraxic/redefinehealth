// -----------------------------------------------
// Multi-step conversation state machine
// In-memory for MVP — survives process restarts via SQLite extension if needed later.
// -----------------------------------------------

export type FlowState =
    | 'idle'
    | 'onboarding_name'
    | 'onboarding_goals'
    | 'onboarding_wake_time'
    | 'onboarding_sleep_time'
    | 'onboarding_timezone'
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
    private readonly sessions = new Map<string, ConversationContext>()

    /** Start a new flow, overwriting any existing session */
    start(userId: string, state: FlowState, pending: Record<string, unknown> = {}): void {
        this.sessions.set(userId, { userId, state, pending, updatedAt: Date.now() })
    }

    get(userId: string): ConversationContext | null {
        return this.sessions.get(userId) ?? null
    }

    update(userId: string, updates: Partial<Pick<ConversationContext, 'state' | 'pending'>>): void {
        const existing = this.sessions.get(userId)
        if (!existing) return
        this.sessions.set(userId, {
            ...existing,
            ...updates,
            pending: { ...existing.pending, ...(updates.pending ?? {}) },
            updatedAt: Date.now(),
        })
    }

    clear(userId: string): void {
        this.sessions.delete(userId)
    }

    isActive(userId: string): boolean {
        return this.sessions.has(userId)
    }

    /** Returns true if the session has been idle for longer than timeoutMs (default: 30 min) */
    isExpired(userId: string, timeoutMs = 30 * 60 * 1000): boolean {
        const ctx = this.sessions.get(userId)
        return !ctx || Date.now() - ctx.updatedAt > timeoutMs
    }

    /** Remove all expired sessions (call periodically to prevent memory leak) */
    pruneExpired(timeoutMs = 30 * 60 * 1000): void {
        for (const [id] of this.sessions) {
            if (this.isExpired(id, timeoutMs)) this.sessions.delete(id)
        }
    }
}
