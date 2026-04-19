import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { ComplianceStore } from '../../infrastructure/storage/compliance-store.ts'
import { generateReport, formatReportText, formatStreakSummary } from '../../domain/compliance/reporter.ts'
import { calculateStreak } from '../../domain/compliance/tracker.ts'

// -----------------------------------------------
// ReportingService
// -----------------------------------------------

export class ReportingService {
    constructor(
        private readonly users: UserRepository,
        private readonly compliance: ComplianceStore,
    ) {}

    /** Full 30-day compliance report for one user */
    generateUserReport(userId: string, periodDays = 30): string | null {
        const user = this.users.findById(userId)
        if (!user) return null

        const records = this.compliance.getAllComplianceHistory(userId, periodDays)
        const report = generateReport(userId, user.stack.map(s => s.name), records, periodDays)
        return formatReportText(report, user.name)
    }

    /** Streak summary only (lighter than full report) */
    generateStreakSummary(userId: string): string | null {
        const user = this.users.findById(userId)
        if (!user) return null

        const reports = user.stack.map(supplement => {
            const history = this.compliance.getComplianceHistory(userId, supplement.name, 30)
            const streak = calculateStreak(history, supplement.name)
            return {
                supplementName: supplement.name,
                streak,
                rate: streak.takenCount / Math.max(streak.totalLogged, 1),
                takenCount: streak.takenCount,
                totalLogged: streak.totalLogged,
            }
        })

        return `🔥 Compliance Streaks — ${user.name}\n\n${formatStreakSummary(reports)}`
    }

    /** Platform-wide digest (for admin use) */
    generatePlatformDigest(periodDays = 7): string {
        const users = this.users.findAll()
        if (users.length === 0) return 'No registered users.'

        const lines = [`📊 Platform Digest — ${new Date().toLocaleDateString()} (${periodDays}d)\n`]
        for (const user of users) {
            const records = this.compliance.getAllComplianceHistory(user.id, periodDays)
            const taken = records.filter(r => r.taken && r.supplementName !== '__side_effect__').length
            const total = records.filter(r => r.supplementName !== '__side_effect__').length
            const rate = total > 0 ? Math.round((taken / total) * 100) : 0
            lines.push(`${user.name}: ${rate}% (${taken}/${total} doses, ${user.stack.length} supplements)`)
        }
        return lines.join('\n')
    }
}
