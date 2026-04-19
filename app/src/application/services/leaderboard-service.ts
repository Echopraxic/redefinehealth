import { rankUsers, formatLeaderboardMessage, isEligible, OPT_IN_CONFIRMATION, OPT_OUT_CONFIRMATION } from '../../domain/leaderboard/engine.ts'
import type { LeaderboardCategory, LeaderboardPeriod, LeaderboardRanking } from '../../domain/leaderboard/types.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { ComplianceStore } from '../../infrastructure/storage/compliance-store.ts'

// -----------------------------------------------
// LeaderboardService
// -----------------------------------------------

export class LeaderboardService {
    constructor(
        private readonly users: UserRepository,
        private readonly compliance: ComplianceStore,
    ) {}

    // -----------------------------------------------
    // Compute rankings for a category + period
    // -----------------------------------------------

    getRankings(
        category: LeaderboardCategory = 'overall',
        period: LeaderboardPeriod = 7,
    ): LeaderboardRanking {
        const all = this.users.findAll()

        const inputs = all.map(user => ({
            user,
            records: this.compliance.getAllComplianceHistory(user.id, period),
        }))

        return rankUsers(inputs, category, period)
    }

    // -----------------------------------------------
    // Single-user rank within a category
    // -----------------------------------------------

    getUserRank(
        userId: string,
        category: LeaderboardCategory = 'overall',
        period: LeaderboardPeriod = 7,
    ): { rank: number; total: number; complianceRate: number; currentStreak: number } | null {
        const user = this.users.findById(userId)
        if (!user || !isEligible(user)) return null

        const ranking = this.getRankings(category, period)
        const entry = ranking.entries.find(e => e.userId === userId)
        if (!entry) return null

        return {
            rank:           entry.rank,
            total:          ranking.totalParticipants,
            complianceRate: entry.complianceRate,
            currentStreak:  entry.currentStreak,
        }
    }

    // -----------------------------------------------
    // iMessage-formatted leaderboard for a viewer
    // -----------------------------------------------

    formatForUser(
        viewerUserId: string,
        category: LeaderboardCategory = 'overall',
        period: LeaderboardPeriod = 7,
    ): string {
        const ranking = this.getRankings(category, period)
        return formatLeaderboardMessage(ranking, viewerUserId)
    }

    // -----------------------------------------------
    // Opt-in / opt-out
    // -----------------------------------------------

    optIn(userId: string, anonymous = false): string | null {
        const user = this.users.findById(userId)
        if (!user) return null

        this.users.update(userId, {
            preferences: {
                ...user.preferences,
                leaderboardOptIn: true,
                leaderboardAnonymous: anonymous,
            },
        })

        return OPT_IN_CONFIRMATION
    }

    optOut(userId: string): string | null {
        const user = this.users.findById(userId)
        if (!user) return null

        this.users.update(userId, {
            preferences: {
                ...user.preferences,
                leaderboardOptIn: false,
            },
        })

        return OPT_OUT_CONFIRMATION
    }

    setAnonymous(userId: string, anonymous: boolean): void {
        const user = this.users.findById(userId)
        if (!user) return

        this.users.update(userId, {
            preferences: { ...user.preferences, leaderboardAnonymous: anonymous },
        })
    }

    // -----------------------------------------------
    // Weekly broadcast — sends to all opted-in users
    // Returns number of messages sent
    // -----------------------------------------------

    async broadcastWeekly(
        send: (phone: string, text: string) => Promise<void>,
        category: LeaderboardCategory = 'overall',
    ): Promise<number> {
        const all = this.users.findAll()
        const eligible = all.filter(isEligible)

        if (eligible.length < 2) return 0  // no point broadcasting a 1-person leaderboard

        const ranking = this.getRankings(category, 7)
        let sent = 0

        for (const user of eligible) {
            const msg = formatLeaderboardMessage(ranking, user.id)
            await send(user.phone, msg)
            sent++
        }

        return sent
    }
}
