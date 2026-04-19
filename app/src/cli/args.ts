// -----------------------------------------------
// Minimal argv parser — no dependencies
// -----------------------------------------------

export interface ParsedArgs {
    positional: string[]   // non-flag tokens
    flags: Map<string, string | true>
}

export function parseArgs(argv: string[]): ParsedArgs {
    const positional: string[] = []
    const flags = new Map<string, string | true>()

    let i = 0
    while (i < argv.length) {
        const token = argv[i]!
        if (token.startsWith('--')) {
            const key = token.slice(2)
            const next = argv[i + 1]
            if (next && !next.startsWith('--')) {
                flags.set(key, next)
                i += 2
            } else {
                flags.set(key, true)
                i++
            }
        } else {
            positional.push(token)
            i++
        }
    }

    return { positional, flags }
}

export function flagString(flags: Map<string, string | true>, key: string): string | null {
    const v = flags.get(key)
    return typeof v === 'string' ? v : null
}

export function flagInt(flags: Map<string, string | true>, key: string, fallback: number): number {
    const v = flags.get(key)
    if (typeof v !== 'string') return fallback
    const n = parseInt(v, 10)
    return isNaN(n) ? fallback : n
}

export function flagBool(flags: Map<string, string | true>, key: string): boolean {
    return flags.has(key)
}

// -----------------------------------------------
// User lookup helper — phone or UUID prefix
// -----------------------------------------------

import type { UserRepository } from '../infrastructure/storage/user-repository.ts'
import type { UserProfile } from '../domain/user-profile.ts'

export function resolveUser(query: string, users: UserRepository): UserProfile | null {
    if (!query) return null
    // Try exact phone match first
    const byPhone = users.findByPhone(query)
    if (byPhone) return byPhone
    // Try exact id
    const byId = users.findById(query)
    if (byId) return byId
    // Try id prefix (first 8 chars)
    const all = users.findAll()
    return all.find(u => u.id.startsWith(query)) ?? null
}
