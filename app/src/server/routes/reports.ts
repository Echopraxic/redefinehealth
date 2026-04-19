import { ok, NOT_FOUND, BAD_REQUEST } from '../response.ts'
import { generateReport } from '../../domain/compliance/reporter.ts'
import { calculateStreak } from '../../domain/compliance/tracker.ts'
import type { RouteHandler } from '../router.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { ComplianceStore } from '../../infrastructure/storage/compliance-store.ts'

export function makeReportsRoutes(users: UserRepository, compliance: ComplianceStore) {
    // GET /users/:id/report?days=30
    const getReport: RouteHandler = ({ params, searchParams }) => {
        const user = users.findById(params['id']!)
        if (!user) return NOT_FOUND

        const days = parseInt(searchParams.get('days') ?? '30', 10)
        if (isNaN(days) || days < 1 || days > 365) return BAD_REQUEST('days must be between 1 and 365')

        const records = compliance.getAllComplianceHistory(params['id']!, days)
        const report = generateReport(params['id']!, user.stack.map(s => s.name), records, days)

        return ok({
            userId: user.id,
            userName: user.name,
            periodDays: report.periodDays,
            generatedAt: new Date(report.generatedAt).toISOString(),
            overallRate: Math.round(report.overallRate * 100),
            totalDosesTaken: report.totalDosesTaken,
            totalDosesLogged: report.totalDosesLogged,
            weeklyTrend: report.weeklyTrend,
            topPerformer: report.topPerformer,
            worstPerformer: report.worstPerformer,
            supplements: report.supplementReports.map(s => ({
                name: s.supplementName,
                complianceRate: Math.round(s.rate * 100),
                takenCount: s.takenCount,
                totalLogged: s.totalLogged,
                currentStreak: s.streak.current,
                bestStreak: s.streak.best,
            })),
        })
    }

    // GET /users/:id/streak
    const getStreak: RouteHandler = ({ params }) => {
        const user = users.findById(params['id']!)
        if (!user) return NOT_FOUND

        const streaks = user.stack.map(supplement => {
            const history = compliance.getComplianceHistory(params['id']!, supplement.name, 90)
            const streak = calculateStreak(history, supplement.name)
            return {
                supplement: supplement.name,
                current: streak.current,
                best: streak.best,
                takenCount: streak.takenCount,
                totalLogged: streak.totalLogged,
                rate: streak.totalLogged > 0
                    ? Math.round((streak.takenCount / streak.totalLogged) * 100)
                    : 0,
            }
        })

        const overall = streaks.reduce((sum, s) => sum + s.rate, 0)
        const overallRate = streaks.length > 0 ? Math.round(overall / streaks.length) : 0

        return ok({ userId: user.id, userName: user.name, overallRate, streaks })
    }

    return { getReport, getStreak }
}
