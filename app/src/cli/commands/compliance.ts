import { header, table, success, failure, warn, dim, green, red } from '../print.ts'
import { resolveUser, flagInt, flagString } from '../args.ts'
import type { ParsedArgs } from '../args.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { ComplianceStore } from '../../infrastructure/storage/compliance-store.ts'

export function cmdCompliance(
    sub: string | undefined,
    args: ParsedArgs,
    users: UserRepository,
    compliance: ComplianceStore,
): void {
    switch (sub) {
        case 'list': return listLogs(args, users, compliance)
        case 'log':  return manualLog(args, users, compliance)
        case 'injections': return listInjections(args, users, compliance)
        default: {
            console.log('Usage:')
            console.log('  admin compliance list <phone|id> [--days 30] [--supplement NAME]')
            console.log('  admin compliance log  <phone|id> <supplement> taken|skip [--note TEXT]')
            console.log('  admin compliance injections <phone|id> [--days 30] [--peptide NAME]')
        }
    }
}

// -----------------------------------------------
// list supplement logs
// -----------------------------------------------

function listLogs(args: ParsedArgs, users: UserRepository, compliance: ComplianceStore): void {
    const query = args.positional[0]
    if (!query) { failure('Provide a phone number or user id.'); return }

    const user = resolveUser(query, users)
    if (!user) { failure(`No user found for: ${query}`); return }

    const days       = flagInt(args.flags, 'days', 30)
    const supplement = flagString(args.flags, 'supplement')

    const records = supplement
        ? compliance.getComplianceHistory(user.id, supplement, days)
        : compliance.getAllComplianceHistory(user.id, days)

    header(`Compliance Log — ${user.name}  (${days}d${supplement ? `, ${supplement}` : ''})`)

    if (records.length === 0) { warn('No records in this period.'); return }

    const recent = [...records].sort((a, b) => b.loggedAt - a.loggedAt).slice(0, 50)

    table(
        recent.map(r => [
            new Date(r.loggedAt).toLocaleDateString(),
            new Date(r.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            r.supplementName,
            r.taken ? green('taken') : red('skipped'),
            r.notes ?? dim('—'),
        ]),
        ['DATE', 'TIME', 'SUPPLEMENT', 'STATUS', 'NOTES'],
    )

    const taken = records.filter(r => r.taken).length
    const pct   = Math.round((taken / records.length) * 100)
    console.log(dim(`\n  ${records.length} records — ${taken} taken (${pct}%)`))
    console.log()
}

// -----------------------------------------------
// manual log (admin override)
// -----------------------------------------------

function manualLog(args: ParsedArgs, users: UserRepository, compliance: ComplianceStore): void {
    const [query, supplement, statusRaw] = args.positional
    if (!query || !supplement || !statusRaw) {
        failure('Usage: admin compliance log <phone|id> <supplement> taken|skip [--note TEXT]')
        return
    }

    const user = resolveUser(query, users)
    if (!user) { failure(`No user found for: ${query}`); return }

    const taken = statusRaw === 'taken' || statusRaw === 'take' || statusRaw === 'yes'
    if (!taken && statusRaw !== 'skip' && statusRaw !== 'skipped' && statusRaw !== 'no') {
        failure(`Status must be "taken" or "skip", got: ${statusRaw}`)
        return
    }

    const note = flagString(args.flags, 'note')

    compliance.logCompliance({
        userId: user.id,
        supplementName: supplement,
        taken,
        notes: note ?? undefined,
    })

    success(`Logged ${taken ? 'taken' : 'skip'} for ${supplement} (${user.name})`)
}

// -----------------------------------------------
// list injection logs
// -----------------------------------------------

function listInjections(args: ParsedArgs, users: UserRepository, compliance: ComplianceStore): void {
    const query = args.positional[0]
    if (!query) { failure('Provide a phone number or user id.'); return }

    const user = resolveUser(query, users)
    if (!user) { failure(`No user found for: ${query}`); return }

    const days   = flagInt(args.flags, 'days', 30)
    const peptide = flagString(args.flags, 'peptide')

    const targets = peptide
        ? user.peptides.filter(p => p.name.toLowerCase().includes(peptide.toLowerCase()))
        : user.peptides

    if (targets.length === 0) { warn('No matching peptide protocols.'); return }

    const records = targets
        .flatMap(p => compliance.getInjectionHistory(user.id, p.name, days))
        .sort((a, b) => b.scheduledAt - a.scheduledAt)
        .slice(0, 50)

    header(`Injection Log — ${user.name}  (${days}d)`)

    if (records.length === 0) { warn('No injection records in this period.'); return }

    table(
        records.map(r => [
            new Date(r.scheduledAt).toLocaleDateString(),
            r.peptideName,
            r.skipped ? red('skipped') : green('injected'),
            r.injectionSite ?? dim('—'),
            r.skipReason ?? r.sideEffects ?? dim('—'),
        ]),
        ['DATE', 'PEPTIDE', 'STATUS', 'SITE', 'NOTES'],
    )

    const taken = records.filter(r => !r.skipped).length
    console.log(dim(`\n  ${records.length} scheduled — ${taken} injected`))
    console.log()
}
