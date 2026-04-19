import { ok, BAD_REQUEST } from '../response.ts'
import { LeaderboardService } from '../../application/services/leaderboard-service.ts'
import type { LeaderboardCategory, LeaderboardPeriod } from '../../domain/leaderboard/types.ts'
import type { RouteHandler } from '../router.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { ComplianceStore } from '../../infrastructure/storage/compliance-store.ts'

const VALID_CATEGORIES = new Set<LeaderboardCategory>([
    'overall', 'skin', 'sleep', 'longevity', 'energy', 'cognition', 'body-composition',
])

const VALID_PERIODS = new Set<number>([7, 30])

export function makeLeaderboardRoutes(users: UserRepository, compliance: ComplianceStore) {
    const service = new LeaderboardService(users, compliance)

    // -----------------------------------------------
    // GET /leaderboard?category=overall&period=7&userId=
    // -----------------------------------------------
    const getLeaderboard: RouteHandler = ({ searchParams }) => {
        const categoryParam = searchParams.get('category') ?? 'overall'
        const periodParam   = parseInt(searchParams.get('period') ?? '7', 10)

        if (!VALID_CATEGORIES.has(categoryParam as LeaderboardCategory)) {
            return BAD_REQUEST(`Invalid category. Valid values: ${[...VALID_CATEGORIES].join(', ')}`)
        }

        if (!VALID_PERIODS.has(periodParam)) {
            return BAD_REQUEST('period must be 7 or 30')
        }

        const category = categoryParam as LeaderboardCategory
        const period   = periodParam as LeaderboardPeriod

        // Optional: personalise the leaderboard for a specific viewer
        const viewerUserId = searchParams.get('userId') ?? undefined
        const viewerUser   = viewerUserId
            ? (users.findById(viewerUserId) ?? users.findByPhone(viewerUserId) ?? undefined)
            : undefined

        const ranking = service.getRankings(category, period)

        return ok({
            category: ranking.category,
            period: ranking.period,
            generatedAt: new Date(ranking.generatedAt).toISOString(),
            totalParticipants: ranking.totalParticipants,
            viewer: viewerUser
                ? { userId: viewerUser.id, rank: ranking.entries.find(e => e.userId === viewerUser.id)?.rank ?? null }
                : null,
            entries: ranking.entries.slice(0, 10).map(e => ({
                rank:           e.rank,
                displayName:    e.displayName,
                complianceRate: e.complianceRate,
                currentStreak:  e.currentStreak,
                bestStreak:     e.bestStreak,
                goals:          e.goals,
                // Never expose userId in API responses — display only
            })),
        })
    }

    return { getLeaderboard }
}
