import { resolve } from 'node:path'
import { openDatabase } from '../infrastructure/storage/db-schema.ts'
import { UserRepository } from '../infrastructure/storage/user-repository.ts'
import { ComplianceStore } from '../infrastructure/storage/compliance-store.ts'
import { BiomarkerStore } from '../infrastructure/storage/biomarker-store.ts'
import { parseArgs } from './args.ts'
import { bold, dim, failure } from './print.ts'
import { cmdUsers } from './commands/users.ts'
import { cmdReport, cmdStreak } from './commands/report.ts'
import { cmdCompliance } from './commands/compliance.ts'
import { cmdBiomarkers } from './commands/biomarkers.ts'
import { cmdDigest } from './commands/digest.ts'

// -----------------------------------------------
// Bootstrap — DB only, no SDK, no AI key required
// -----------------------------------------------

const dbPath = process.env['DB_PATH'] ?? resolve(import.meta.dir, '../../data/healthspan.db')

let db: ReturnType<typeof openDatabase>
try {
    db = openDatabase(dbPath)
} catch (err) {
    failure(`Could not open database at ${dbPath}: ${err instanceof Error ? err.message : err}`)
    process.exit(1)
}

const users      = new UserRepository(db)
const compliance = new ComplianceStore(db)
const biomarkers = new BiomarkerStore(db)

// -----------------------------------------------
// Dispatch
// -----------------------------------------------

const argv = process.argv.slice(2)
const [group, ...rest] = argv

if (!group || group === 'help' || group === '--help' || group === '-h') {
    printHelp()
    process.exit(0)
}

const args = parseArgs(rest)
const [sub, ...positionalRest] = args.positional
const subArgs = { ...args, positional: positionalRest }

;(async () => {
    switch (group) {
        case 'users':
            await cmdUsers(sub, subArgs, users)
            break

        case 'report':
            cmdReport(sub, args, users, compliance)
            break

        case 'streak':
            cmdStreak(sub, users, compliance)
            break

        case 'compliance':
            cmdCompliance(sub, subArgs, users, compliance)
            break

        case 'biomarkers':
            cmdBiomarkers(sub, subArgs, users, biomarkers)
            break

        case 'digest':
            cmdDigest(args, users, compliance, biomarkers)
            break

        default:
            failure(`Unknown command: "${group}"`)
            console.log()
            printHelp()
            process.exit(1)
    }

    db.close()
})().catch(err => {
    failure(err instanceof Error ? err.message : String(err))
    db?.close()
    process.exit(1)
})

// -----------------------------------------------
// Help
// -----------------------------------------------

function printHelp(): void {
    console.log(`\n${bold('Healthspan OS — Admin CLI')}\n`)
    console.log('Usage:  bun admin <command> [subcommand] [args] [--flags]\n')
    const cmds: Array<[string, string]> = [
        ['users list',                      'List all registered users'],
        ['users get <phone|id>',            'Show full user profile'],
        ['users delete <phone|id>',         'Delete a user (with confirmation)'],
        ['report <phone|id> [--days 30]',   'Compliance report for one user'],
        ['streak <phone|id>',               'Supplement streak breakdown'],
        ['compliance list <phone|id>',      'Recent dose log (--days, --supplement)'],
        ['compliance log <phone|id> <supplement> taken|skip', 'Manual log entry'],
        ['compliance injections <phone|id>', 'Peptide injection log (--days, --peptide)'],
        ['biomarkers list <phone|id>',      'Latest biomarker readings + trends'],
        ['biomarkers history <phone|id> <marker>', 'Full reading history for one marker'],
        ['biomarkers log <phone|id> <marker> <value>', 'Record a biomarker reading'],
        ['biomarkers delete <entryId>',     'Remove a reading by id'],
        ['biomarkers markers',              'Show all valid marker keys'],
        ['digest [--days 7]',              'Platform-wide summary'],
    ]
    const keyWidth = Math.max(...cmds.map(([k]) => k.length))
    for (const [cmd, desc] of cmds) {
        console.log(`  ${bold(cmd.padEnd(keyWidth))}  ${dim(desc)}`)
    }
    console.log()
}
