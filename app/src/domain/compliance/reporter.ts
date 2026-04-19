import { calculateStreak } from './tracker.ts'
import type { ComplianceRecord, StreakResult } from './tracker.ts'

// -----------------------------------------------
// Types
// -----------------------------------------------

export interface SupplementReport {
    supplementName: string
    streak: StreakResult
    rate: number          // 0–1
    takenCount: number
    totalLogged: number
}

export interface ProtocolReport {
    userId: string
    generatedAt: number
    periodDays: number
    overallRate: number
    supplementReports: SupplementReport[]
    topPerformer: string | null
    worstPerformer: string | null
    weeklyTrend: 'improving' | 'declining' | 'stable'
    totalDosesTaken: number
    totalDosesLogged: number
}

// -----------------------------------------------
// Report generation
// -----------------------------------------------

const SIDE_EFFECT_KEY = '__side_effect__'

export function generateReport(
    userId: string,
    supplementNames: string[],
    allRecords: ComplianceRecord[],
    periodDays = 30,
): ProtocolReport {
    const now = Date.now()
    const since = now - periodDays * 86_400_000
    const periodRecords = allRecords.filter(r => r.loggedAt >= since && r.supplementName !== SIDE_EFFECT_KEY)

    const supplementReports: SupplementReport[] = supplementNames.map(name => {
        const forSupplement = periodRecords.filter(r => r.supplementName === name)
        const takenCount = forSupplement.filter(r => r.taken).length
        return {
            supplementName: name,
            streak: calculateStreak(allRecords, name),
            rate: forSupplement.length > 0 ? takenCount / forSupplement.length : 0,
            takenCount,
            totalLogged: forSupplement.length,
        }
    })

    const totalDosesTaken = periodRecords.filter(r => r.taken).length
    const totalDosesLogged = periodRecords.length
    const overallRate = totalDosesLogged > 0 ? totalDosesTaken / totalDosesLogged : 0

    const sorted = [...supplementReports].sort((a, b) => b.rate - a.rate)
    const topPerformer = sorted[0]?.supplementName ?? null
    const worstPerformer = sorted[sorted.length - 1]?.supplementName ?? null

    // Trend: last 7 days vs preceding 7 days
    const last7Since = now - 7 * 86_400_000
    const prev7Since = now - 14 * 86_400_000
    const recent = periodRecords.filter(r => r.loggedAt >= last7Since)
    const prev = periodRecords.filter(r => r.loggedAt >= prev7Since && r.loggedAt < last7Since)
    const recentRate = recent.length > 0 ? recent.filter(r => r.taken).length / recent.length : 0
    const prevRate = prev.length > 0 ? prev.filter(r => r.taken).length / prev.length : 0

    let weeklyTrend: 'improving' | 'declining' | 'stable'
    if (recentRate > prevRate + 0.08) weeklyTrend = 'improving'
    else if (recentRate < prevRate - 0.08) weeklyTrend = 'declining'
    else weeklyTrend = 'stable'

    return {
        userId,
        generatedAt: now,
        periodDays,
        overallRate,
        supplementReports,
        topPerformer,
        worstPerformer,
        weeklyTrend,
        totalDosesTaken,
        totalDosesLogged,
    }
}

// -----------------------------------------------
// Formatting
// -----------------------------------------------

export function formatReportText(report: ProtocolReport, userName: string): string {
    const rate = Math.round(report.overallRate * 100)
    const trendIcon = { improving: '📈', declining: '📉', stable: '➡️' }[report.weeklyTrend]

    const lines = [
        `📊 ${report.periodDays}-Day Report — ${userName}`,
        `${trendIcon} Overall compliance: ${rate}% (${report.totalDosesTaken}/${report.totalDosesLogged} doses)`,
        '',
    ]

    for (const s of report.supplementReports) {
        const pct = Math.round(s.rate * 100)
        const icon = s.streak.current >= 14 ? '🔥' : s.streak.current >= 7 ? '✅' : s.streak.current >= 3 ? '⚡' : '·'
        lines.push(`${icon} ${s.supplementName}: ${pct}% · ${s.streak.current}d streak`)
    }

    if (report.topPerformer && report.worstPerformer && report.topPerformer !== report.worstPerformer) {
        lines.push('')
        lines.push(`💪 Strongest: ${report.topPerformer}`)
        lines.push(`🎯 Opportunity: ${report.worstPerformer}`)
    }

    return lines.join('\n')
}

export function formatStreakSummary(supplementReports: SupplementReport[]): string {
    return supplementReports
        .map(s => {
            const pct = Math.round(s.rate * 100)
            const icon = s.streak.current >= 14 ? '🔥' : s.streak.current >= 7 ? '✅' : '⚡'
            return `${icon} ${s.supplementName}: ${s.streak.current}d streak · ${pct}% (30d)`
        })
        .join('\n')
}
