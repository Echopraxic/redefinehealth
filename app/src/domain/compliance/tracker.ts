import type { SupplementTiming } from '../user-profile.ts'

// -----------------------------------------------
// Types
// -----------------------------------------------

export interface ComplianceRecord {
    userId: string
    supplementName: string
    loggedAt: number  // Unix ms
    taken: boolean
    notes?: string
}

export interface StreakResult {
    current: number
    longest: number
    totalLogged: number
    takenCount: number
    /** Compliance rate 0–1 */
    rate: number
}

// -----------------------------------------------
// Streak calculation
// -----------------------------------------------

export function calculateStreak(records: ComplianceRecord[], supplementName: string): StreakResult {
    const sorted = records
        .filter(r => r.supplementName === supplementName)
        .sort((a, b) => a.loggedAt - b.loggedAt)

    if (sorted.length === 0) {
        return { current: 0, longest: 0, totalLogged: 0, takenCount: 0, rate: 0 }
    }

    const takenCount = sorted.filter(r => r.taken).length

    let longest = 0
    let running = 0
    for (const r of sorted) {
        if (r.taken) {
            running++
            if (running > longest) longest = running
        } else {
            running = 0
        }
    }

    let current = 0
    for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i]?.taken) {
            current++
        } else {
            break
        }
    }

    return {
        current,
        longest,
        totalLogged: sorted.length,
        takenCount,
        rate: sorted.length > 0 ? takenCount / sorted.length : 0,
    }
}

// -----------------------------------------------
// Time-of-day supplement detection
// -----------------------------------------------

export function detectCurrentSupplement(
    stack: Array<{ name: string; timing: SupplementTiming }>,
    wakeTime: string,
    sleepTime: string,
): string | null {
    const now = new Date()
    const hour = now.getHours()

    const [wakeHour = 7] = wakeTime.split(':').map(Number)
    const [sleepHour = 22] = sleepTime.split(':').map(Number)

    const timingHours: Record<SupplementTiming, number> = {
        morning: wakeHour,
        'with-meal': wakeHour + 1,
        afternoon: 13,
        evening: 18,
        bedtime: sleepHour - 1,
    }

    let closest: { name: string; diff: number } | null = null
    for (const s of stack) {
        const target = timingHours[s.timing] ?? 8
        const diff = Math.abs(hour - target)
        if (diff <= 2 && (!closest || diff < closest.diff)) {
            closest = { name: s.name, diff }
        }
    }

    return closest?.name ?? null
}
