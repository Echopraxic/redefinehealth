import { header, table, keyValue, failure, dim, green, yellow, red } from '../print.ts'
import { resolveUser, flagInt } from '../args.ts'
import { generateReport } from '../../domain/compliance/reporter.ts'
import { calculateStreak } from '../../domain/compliance/tracker.ts'
import type { ParsedArgs } from '../args.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { ComplianceStore } from '../../infrastructure/storage/compliance-store.ts'

export function cmdReport(
    query: string | undefined,
    args: ParsedArgs,
    users: UserRepository,
    compliance: ComplianceStore,
): void {
    if (!query) {
        console.log('Usage:')
        console.log('  admin report <phone|id> [--days 30]')
        return
    }

    const user = resolveUser(query, users)
    if (!user) { failure(`No user found for: ${query}`); return }

    const days = flagInt(args.flags, 'days', 30)
    const records = compliance.getAllComplianceHistory(user.id, days)
    const report = generateReport(user.id, user.stack.map(s => s.name), records, days)

    const trendIcon = { improving: green('↑ improving'), declining: red('↓ declining'), stable: dim('→ stable') }[report.weeklyTrend]
    const rate = Math.round(report.overallRate * 100)

    header(`Compliance Report — ${user.name}  (${days}d)`)

    keyValue([
        ['Overall rate',    `${rate}%  (${report.totalDosesTaken}/${report.totalDosesLogged} doses)`],
        ['Weekly trend',    trendIcon],
        ['Top performer',   report.topPerformer ?? '—'],
        ['Needs attention', report.worstPerformer ?? '—'],
        ['Generated',       new Date(report.generatedAt).toLocaleString()],
    ])

    if (report.supplementReports.length > 0) {
        console.log()
        table(
            report.supplementReports.map(s => {
                const pct = Math.round(s.rate * 100)
                const streakIcon = s.streak.current >= 14 ? '🔥' : s.streak.current >= 7 ? '✅' : s.streak.current >= 3 ? '⚡' : ' '
                const rateStr = pct >= 80 ? green(`${pct}%`) : pct >= 50 ? yellow(`${pct}%`) : red(`${pct}%`)
                return [
                    `${streakIcon} ${s.supplementName}`,
                    rateStr,
                    `${s.takenCount}/${s.totalLogged}`,
                    String(s.streak.current),
                    String(s.streak.best ?? s.streak.longest),
                ]
            }),
            ['SUPPLEMENT', 'RATE', 'DOSES', 'CURRENT STREAK', 'BEST STREAK'],
        )
    }

    if (user.peptides.filter(p => p.active).length > 0) {
        console.log()
        const peptideRows = user.peptides.filter(p => p.active).map(p => {
            const injections = compliance.getInjectionHistory(user.id, p.name, days)
            const taken = injections.filter(i => !i.skipped).length
            const total = injections.length
            const pct = total > 0 ? Math.round((taken / total) * 100) : 0
            const rateStr = pct >= 80 ? green(`${pct}%`) : pct >= 50 ? yellow(`${pct}%`) : total === 0 ? dim('no data') : red(`${pct}%`)
            return [p.name, rateStr, `${taken}/${total}`, `${p.cycleWeeks}w cycle`]
        })
        table(peptideRows, ['PEPTIDE', 'RATE', 'INJECTIONS', 'CYCLE'])
    }

    console.log()
}

// -----------------------------------------------
// Streak-only view (lighter)
// -----------------------------------------------

export function cmdStreak(
    query: string | undefined,
    users: UserRepository,
    compliance: ComplianceStore,
): void {
    if (!query) {
        console.log('Usage:  admin streak <phone|id>')
        return
    }

    const user = resolveUser(query, users)
    if (!user) { failure(`No user found for: ${query}`); return }

    header(`Streaks — ${user.name}`)

    if (user.stack.length === 0) { dim('  No supplements configured.'); return }

    table(
        user.stack.map(s => {
            const history = compliance.getComplianceHistory(user.id, s.name, 90)
            const streak = calculateStreak(history, s.name)
            const pct = streak.totalLogged > 0
                ? Math.round((streak.takenCount / streak.totalLogged) * 100)
                : 0
            const icon = streak.current >= 14 ? '🔥' : streak.current >= 7 ? '✅' : streak.current >= 3 ? '⚡' : '  '
            const rateStr = pct >= 80 ? green(`${pct}%`) : pct >= 50 ? yellow(`${pct}%`) : red(`${pct}%`)
            return [`${icon} ${s.name}`, String(streak.current), String(streak.longest), rateStr, `${streak.takenCount}/${streak.totalLogged}`]
        }),
        ['SUPPLEMENT', 'CURRENT', 'BEST', 'RATE (90d)', 'TAKEN/LOGGED'],
    )

    console.log()
}
