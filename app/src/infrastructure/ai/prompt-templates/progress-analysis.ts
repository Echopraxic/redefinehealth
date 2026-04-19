import type { ComplianceRecord, StreakResult } from '../../../domain/compliance/tracker.ts'

export const PROGRESS_ANALYSIS_TEMPLATE = `You are generating a 30-day compliance progress report.
Format: mobile-friendly, under 150 words.
Structure: (1) one-line overall assessment, (2) top 1–2 wins, (3) one gentle gap to address, (4) one specific actionable tip.
Tone: honest, warm, motivating — no toxic positivity.`

export function buildProgressPrompt(params: {
    userName: string
    goals: string[]
    records: ComplianceRecord[]
    streaks: Record<string, StreakResult>
}): string {
    const { userName, goals, records, streaks } = params

    const totalTaken = records.filter(r => r.taken).length
    const total = records.length
    const overallRate = total > 0 ? Math.round((totalTaken / total) * 100) : 0

    const streakSummary = Object.entries(streaks)
        .map(([name, s]) =>
            `${name}: ${s.current}d current streak, ${Math.round(s.rate * 100)}% compliance (${s.takenCount}/${s.totalLogged} doses)`
        )
        .join('; ')

    return [
        `User: ${userName}`,
        `Goals: ${goals.join(', ')}`,
        `30-day overall: ${overallRate}% compliance (${totalTaken}/${total} doses taken)`,
        `Per-supplement: ${streakSummary || 'No data yet — first week!'}`,
        'Generate progress report:',
    ].join('\n')
}
