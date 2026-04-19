import { header, table, keyValue, warn, dim, green, red, yellow } from '../print.ts'
import { flagInt } from '../args.ts'
import { generateReport } from '../../domain/compliance/reporter.ts'
import type { ParsedArgs } from '../args.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { ComplianceStore } from '../../infrastructure/storage/compliance-store.ts'
import type { BiomarkerStore } from '../../infrastructure/storage/biomarker-store.ts'

export function cmdDigest(
    args: ParsedArgs,
    users: UserRepository,
    compliance: ComplianceStore,
    biomarkers: BiomarkerStore,
): void {
    const days = flagInt(args.flags, 'days', 7)
    const all  = users.findAll()

    header(`Platform Digest  (${days}d)  —  ${new Date().toLocaleString()}`)

    if (all.length === 0) { warn('No registered users.'); return }

    // -----------------------------------------------
    // Per-user summary table
    // -----------------------------------------------
    const rows = all.map(user => {
        const records = compliance.getAllComplianceHistory(user.id, days)
        const report  = generateReport(user.id, user.stack.map(s => s.name), records, days)
        const pct     = Math.round(report.overallRate * 100)

        const rateStr  = pct >= 80 ? green(`${pct}%`) : pct >= 50 ? yellow(`${pct}%`) : pct === 0 && report.totalDosesLogged === 0 ? dim('no data') : red(`${pct}%`)
        const trendStr = report.weeklyTrend === 'improving' ? green('↑') : report.weeklyTrend === 'declining' ? red('↓') : dim('→')

        const bioCount = biomarkers.getLatestAll(user.id).length

        return [
            user.name,
            rateStr,
            `${report.totalDosesTaken}/${report.totalDosesLogged}`,
            trendStr,
            String(user.stack.length),
            String(user.peptides.filter(p => p.active).length),
            bioCount > 0 ? String(bioCount) : dim('0'),
            user.onboarded ? green('✓') : yellow('pending'),
        ]
    })

    table(rows, ['USER', 'RATE', 'DOSES', 'TREND', 'SUPPS', 'PEPTIDES', 'BIOMARKERS', 'STATUS'])

    // -----------------------------------------------
    // Aggregate stats
    // -----------------------------------------------
    const allRecords = all.flatMap(u => compliance.getAllComplianceHistory(u.id, days))
    const totalTaken = allRecords.filter(r => r.taken && r.supplementName !== '__side_effect__').length
    const totalLogged = allRecords.filter(r => r.supplementName !== '__side_effect__').length
    const platformRate = totalLogged > 0 ? Math.round((totalTaken / totalLogged) * 100) : 0

    const onboardedCount = all.filter(u => u.onboarded).length
    const activeGoals = [...new Set(all.flatMap(u => u.goals))]

    console.log()
    keyValue([
        ['Users',           `${all.length} total, ${onboardedCount} onboarded`],
        ['Platform rate',   `${platformRate}% (${totalTaken}/${totalLogged} doses)`],
        ['Active goals',    activeGoals.join(', ') || '—'],
        ['Period',          `${days} days`],
    ])
    console.log()
}
