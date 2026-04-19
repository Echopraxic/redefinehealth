import { header, table, success, failure, warn, dim, green, red, yellow } from '../print.ts'
import { resolveUser, flagInt, flagString } from '../args.ts'
import { findMarker, allMarkers } from '../../domain/biomarkers/registry.ts'
import { analyzeTrend, checkAlert } from '../../domain/biomarkers/analyzer.ts'
import type { BiomarkerSource } from '../../domain/biomarkers/types.ts'
import type { ParsedArgs } from '../args.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { BiomarkerStore } from '../../infrastructure/storage/biomarker-store.ts'

export function cmdBiomarkers(
    sub: string | undefined,
    args: ParsedArgs,
    users: UserRepository,
    biomarkers: BiomarkerStore,
): void {
    switch (sub) {
        case 'list':     return listBiomarkers(args, users, biomarkers)
        case 'history':  return markerHistory(args, users, biomarkers)
        case 'log':      return logBiomarker(args, users, biomarkers)
        case 'delete':   return deleteBiomarker(args, biomarkers)
        case 'markers':  return listMarkers()
        default: {
            console.log('Usage:')
            console.log('  admin biomarkers list    <phone|id> [--days 90]')
            console.log('  admin biomarkers history <phone|id> <marker> [--days 90]')
            console.log('  admin biomarkers log     <phone|id> <marker> <value> [--source manual|lab-upload] [--date ISO] [--notes TEXT]')
            console.log('  admin biomarkers delete  <entryId>')
            console.log('  admin biomarkers markers')
        }
    }
}

// -----------------------------------------------
// list — latest reading per marker + trend
// -----------------------------------------------

function listBiomarkers(args: ParsedArgs, users: UserRepository, biomarkers: BiomarkerStore): void {
    const query = args.positional[0]
    if (!query) { failure('Provide a phone number or user id.'); return }

    const user = resolveUser(query, users)
    if (!user) { failure(`No user found for: ${query}`); return }

    const days = flagInt(args.flags, 'days', 90)
    const latest = biomarkers.getLatestAll(user.id)

    header(`Biomarkers — ${user.name}  (${days}d window)`)

    if (latest.length === 0) { warn('No biomarker readings logged yet.'); return }

    const history = biomarkers.getAllHistory(user.id, days)
    const byMarker = new Map<string, typeof history>()
    for (const e of history) {
        const arr = byMarker.get(e.markerName) ?? []
        arr.push(e)
        byMarker.set(e.markerName, arr)
    }

    const rows = latest.map(entry => {
        const def    = findMarker(entry.markerName)
        const trend  = analyzeTrend(byMarker.get(entry.markerName) ?? [entry], entry.markerName)
        const alert  = checkAlert(entry)

        const rangeStr = def
            ? `${def.referenceRange.low}–${def.referenceRange.high}`
            : '—'

        const valueStr = alert
            ? (alert.severity === 'critical' ? red(String(entry.value)) : yellow(String(entry.value)))
            : green(String(entry.value))

        const trendIcon =
            trend.direction === 'improving'         ? green('↑')  :
            trend.direction === 'declining'         ? red('↓')    :
            trend.direction === 'stable'            ? dim('→')    : dim('?')

        const optStr = trend.inOptimal ? green('optimal') : trend.inRange ? yellow('in range') : red('out of range')

        return [
            def?.displayName ?? entry.markerName,
            `${valueStr} ${entry.unit}`,
            rangeStr,
            optStr,
            trendIcon,
            new Date(entry.recordedAt).toLocaleDateString(),
        ]
    })

    table(rows, ['MARKER', 'VALUE', 'RANGE', 'STATUS', 'TREND', 'DATE'])

    const alerts = latest.map(checkAlert).filter(Boolean)
    if (alerts.length > 0) {
        console.log()
        for (const a of alerts) {
            const icon = a!.severity === 'critical' ? red('🚨') : yellow('⚠️')
            console.log(`  ${icon}  ${a!.message}`)
        }
    }
    console.log()
}

// -----------------------------------------------
// history — all readings for one marker
// -----------------------------------------------

function markerHistory(args: ParsedArgs, users: UserRepository, biomarkers: BiomarkerStore): void {
    const [query, markerName] = args.positional
    if (!query || !markerName) {
        failure('Usage: admin biomarkers history <phone|id> <marker>')
        return
    }

    const user = resolveUser(query, users)
    if (!user) { failure(`No user found for: ${query}`); return }

    const def = findMarker(markerName)
    if (!def) {
        failure(`Unknown marker: "${markerName}". Run "admin biomarkers markers" for valid names.`)
        return
    }

    const days    = flagInt(args.flags, 'days', 90)
    const entries = biomarkers.getHistory(user.id, markerName, days)

    header(`${def.displayName} — ${user.name}  (${days}d)`)

    if (entries.length === 0) { warn('No readings in this period.'); return }

    const trend = analyzeTrend(entries, markerName)
    const trendStr = trend.direction === 'improving' ? green(`↑ +${trend.percentChange}%`) :
                     trend.direction === 'declining'  ? red(`↓ ${trend.percentChange}%`)    :
                     trend.direction === 'stable'     ? dim('→ stable') : dim('insufficient data')

    console.log(dim(`  Range: ${def.referenceRange.low}–${def.referenceRange.high} ${def.unit}`) +
        (def.referenceRange.optimalLow !== undefined ? dim(`  |  Optimal: ${def.referenceRange.optimalLow}–${def.referenceRange.optimalHigh}`) : ''))
    console.log(dim(`  Trend: ${trendStr}  (${entries.length} readings)\n`))

    table(
        [...entries].reverse().map(e => {
            const alert = checkAlert(e)
            const valStr = alert
                ? (alert.severity === 'critical' ? red(String(e.value)) : yellow(String(e.value)))
                : green(String(e.value))
            return [
                new Date(e.recordedAt).toLocaleDateString(),
                `${valStr} ${e.unit}`,
                e.source,
                e.notes ?? dim('—'),
                String(e.id),
            ]
        }),
        ['DATE', 'VALUE', 'SOURCE', 'NOTES', 'ID'],
    )
    console.log()
}

// -----------------------------------------------
// log — record a new reading
// -----------------------------------------------

function logBiomarker(args: ParsedArgs, users: UserRepository, biomarkers: BiomarkerStore): void {
    const [query, markerName, valueStr] = args.positional
    if (!query || !markerName || !valueStr) {
        failure('Usage: admin biomarkers log <phone|id> <marker> <value> [--source manual|lab-upload] [--date ISO] [--notes TEXT]')
        return
    }

    const user = resolveUser(query, users)
    if (!user) { failure(`No user found for: ${query}`); return }

    const def = findMarker(markerName)
    if (!def) {
        failure(`Unknown marker: "${markerName}". Run "admin biomarkers markers" for valid names.`)
        return
    }

    const value = parseFloat(valueStr)
    if (isNaN(value)) { failure(`Value must be a number, got: ${valueStr}`); return }

    const sourceRaw = flagString(args.flags, 'source') ?? 'manual'
    const source: BiomarkerSource = sourceRaw === 'lab-upload' ? 'lab-upload' :
                                    sourceRaw === 'apple-health' ? 'apple-health' : 'manual'

    const dateStr   = flagString(args.flags, 'date')
    const recordedAt = dateStr ? new Date(dateStr).getTime() : Date.now()
    if (isNaN(recordedAt)) { failure(`Invalid date: ${dateStr}`); return }

    const notes = flagString(args.flags, 'notes')

    const entry = biomarkers.log({
        userId: user.id,
        markerName: def.name,
        value,
        unit: def.unit,
        source,
        notes: notes ?? undefined,
        recordedAt,
    })

    success(`Logged ${def.displayName}: ${value} ${def.unit} for ${user.name}  (id: ${entry.id})`)

    const alert = checkAlert(entry)
    if (alert) {
        const icon = alert.severity === 'critical' ? red('🚨 CRITICAL') : yellow('⚠️  Warning')
        console.log(`  ${icon}  ${alert.message}`)
    }
}

// -----------------------------------------------
// delete — remove a reading by id
// -----------------------------------------------

function deleteBiomarker(args: ParsedArgs, biomarkers: BiomarkerStore): void {
    const idStr = args.positional[0]
    if (!idStr) { failure('Provide a biomarker entry id.'); return }

    const id = parseInt(idStr, 10)
    if (isNaN(id)) { failure(`Entry id must be a number, got: ${idStr}`); return }

    const deleted = biomarkers.delete(id)
    if (!deleted) { failure(`No biomarker entry found with id: ${id}`); return }

    success(`Deleted biomarker entry ${id}`)
}

// -----------------------------------------------
// markers — show the full registry
// -----------------------------------------------

function listMarkers(): void {
    header('Biomarker Registry')
    table(
        allMarkers().map(m => [
            m.name,
            m.displayName,
            m.unit,
            m.category,
            `${m.referenceRange.low}–${m.referenceRange.high}`,
            m.higherIsBetter ? green('↑ higher') : red('↓ lower'),
        ]),
        ['MARKER KEY', 'DISPLAY NAME', 'UNIT', 'CATEGORY', 'RANGE', 'DIRECTION'],
    )
    console.log()
}
