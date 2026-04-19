// -----------------------------------------------
// Timezone-aware time utilities
// -----------------------------------------------

export function parseHHMM(time: string): { hour: number; minute: number } {
    const [h = '0', m = '0'] = time.split(':')
    return { hour: parseInt(h, 10), minute: parseInt(m, 10) }
}

export function formatHHMM(hour: number, minute: number): string {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

/**
 * Returns the next UTC Date for a given local hour:minute in the user's timezone.
 * Simple heuristic — for production, replace with luxon or date-fns-tz.
 */
export function nextOccurrence(hour: number, minute: number, timezone: string): Date {
    const now = new Date()
    const tzString = now.toLocaleString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
    })
    const [tzHourStr, tzMinStr] = tzString.split(':')
    const tzHour = parseInt(tzHourStr ?? '0', 10)
    const tzMin = parseInt(tzMinStr ?? '0', 10)

    const candidate = new Date(now)
    candidate.setHours(hour, minute, 0, 0)

    if (tzHour > hour || (tzHour === hour && tzMin >= minute)) {
        candidate.setDate(candidate.getDate() + 1)
    }

    return candidate
}

/** Returns midnight N days ago */
export function daysAgo(n: number): Date {
    const d = new Date()
    d.setDate(d.getDate() - n)
    d.setHours(0, 0, 0, 0)
    return d
}

export function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function daysBetween(a: number, b: number): number {
    return Math.abs(Math.round((b - a) / 86_400_000))
}

/** Returns the current hour (0–23) in the given IANA timezone */
export function getCurrentHourInTimezone(timezone: string): number {
    const str = new Date().toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', hour12: false })
    return parseInt(str, 10)
}
