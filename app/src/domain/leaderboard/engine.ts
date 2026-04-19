import { calculateStreak } from '../compliance/tracker.ts'
import type { UserProfile, Goal } from '../user-profile.ts'
import type { ComplianceRecord } from '../compliance/tracker.ts'
import type { LeaderboardCategory, LeaderboardEntry, LeaderboardPeriod, LeaderboardRanking } from './types.ts'

// -----------------------------------------------
// Eligibility
// -----------------------------------------------

export function isEligible(user: UserProfile): boolean {
    return user.onboarded && (user.preferences.leaderboardOptIn ?? false)
}

function matchesCategory(user: UserProfile, category: LeaderboardCategory): boolean {
    if (category === 'overall') return true
    return user.goals.includes(category as Goal)
}

// Display name respects the anonymous preference.
// Anon users show as "Anonymous" — no rank number leak since rank is visible anyway.
function displayName(user: UserProfile): string {
    if (user.preferences.leaderboardAnonymous ?? false) return 'Anonymous'
    // Use first name only
    return user.name.split(' ')[0] ?? user.name
}

// -----------------------------------------------
// Ranking engine — pure function, no I/O
// -----------------------------------------------

export interface UserComplianceInput {
    user: UserProfile
    records: ComplianceRecord[]
}

export function rankUsers(
    inputs: UserComplianceInput[],
    category: LeaderboardCategory,
    period: LeaderboardPeriod,
): LeaderboardRanking {
    const now = Date.now()
    const since = now - period * 86_400_000
    const SIDE_EFFECT_KEY = '__side_effect__'

    const eligible = inputs.filter(({ user }) => isEligible(user) && matchesCategory(user, category))

    const scored = eligible.map(({ user, records }) => {
        const periodRecords = records.filter(
            r => r.loggedAt >= since && r.supplementName !== SIDE_EFFECT_KEY,
        )
        const taken  = periodRecords.filter(r => r.taken).length
        const total  = periodRecords.length
        const rate   = total > 0 ? Math.round((taken / total) * 100) : 0

        // Best current streak across all supplements
        const supplementNames = [...new Set(records.map(r => r.supplementName).filter(n => n !== SIDE_EFFECT_KEY))]
        let currentStreak = 0
        let bestStreak = 0
        for (const name of supplementNames) {
            const s = calculateStreak(records, name)
            currentStreak = Math.max(currentStreak, s.current)
            bestStreak    = Math.max(bestStreak,    s.longest)
        }

        return { user, rate, currentStreak, bestStreak, total }
    })

    // Sort: compliance rate DESC → current streak DESC → total logged DESC
    scored.sort((a, b) =>
        b.rate - a.rate ||
        b.currentStreak - a.currentStreak ||
        b.total - a.total
    )

    // Assign ranks (ties share the same rank)
    const entries: LeaderboardEntry[] = []
    let rank = 1
    for (let i = 0; i < scored.length; i++) {
        const prev = scored[i - 1]
        const curr = scored[i]!
        if (i > 0 && prev && (curr.rate !== prev.rate || curr.currentStreak !== prev.currentStreak)) {
            rank = i + 1
        }
        entries.push({
            rank,
            userId:         curr.user.id,
            displayName:    displayName(curr.user),
            complianceRate: curr.rate,
            currentStreak:  curr.currentStreak,
            bestStreak:     curr.bestStreak,
            totalLogged:    curr.total,
            goals:          curr.user.goals,
        })
    }

    return {
        category,
        period,
        generatedAt: now,
        totalParticipants: entries.length,
        entries,
    }
}

// -----------------------------------------------
// iMessage broadcast format
// -----------------------------------------------

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
const CATEGORY_LABELS: Record<LeaderboardCategory, string> = {
    overall:            'Overall',
    skin:               'Skin Health',
    sleep:              'Sleep & Recovery',
    longevity:          'Longevity',
    energy:             'Energy',
    cognition:          'Cognition',
    'body-composition': 'Body Composition',
}

export function formatLeaderboardMessage(
    ranking: LeaderboardRanking,
    viewerUserId?: string,
): string {
    const label = CATEGORY_LABELS[ranking.category] ?? ranking.category
    const periodLabel = ranking.period === 7 ? 'Weekly' : '30-Day'

    const lines = [`🏆 ${periodLabel} Leaderboard — ${label}\n`]

    if (ranking.entries.length === 0) {
        lines.push('No participants yet. Reply "leaderboard join" to opt in!')
        return lines.join('\n')
    }

    const top = ranking.entries.slice(0, 10)
    for (const entry of top) {
        const icon    = RANK_ICONS[entry.rank] ?? `${entry.rank}.`
        const streak  = entry.currentStreak > 0 ? ` · 🔥${entry.currentStreak}d` : ''
        const me      = entry.userId === viewerUserId ? ' ← you' : ''
        lines.push(`${icon} ${entry.displayName.padEnd(12)} ${entry.complianceRate}%${streak}${me}`)
    }

    if (viewerUserId) {
        const viewerEntry = ranking.entries.find(e => e.userId === viewerUserId)
        if (viewerEntry && viewerEntry.rank > 10) {
            lines.push(`\n...`)
            lines.push(`${viewerEntry.rank}. ${viewerEntry.displayName.padEnd(12)} ${viewerEntry.complianceRate}% ← you`)
        }

        if (viewerEntry) {
            lines.push('')
            const above = ranking.entries.find(e => e.rank === viewerEntry.rank - 1)
            if (viewerEntry.rank === 1) {
                lines.push(`You're #1 this ${ranking.period === 7 ? 'week' : 'month'}. Defend it! 🔒`)
            } else if (above) {
                const gap = above.complianceRate - viewerEntry.complianceRate
                lines.push(`You're #${viewerEntry.rank}. ${gap}% behind #${above.rank} — ${above.displayName}.`)
            }
        }
    }

    return lines.join('\n')
}

// -----------------------------------------------
// Opt-in / opt-out messages
// -----------------------------------------------

export const OPT_IN_CONFIRMATION = `🏆 You're on the leaderboard! Your compliance will be ranked weekly against other Healthspan OS members.

Reply "leaderboard anon" to show as Anonymous, or "leaderboard leave" to opt out anytime.`

export const OPT_OUT_CONFIRMATION = `👋 Removed from leaderboard. Your data stays private. Reply "leaderboard join" anytime to rejoin.`
