import { header, table, keyValue, success, failure, warn, dim, green, red, yellow } from '../print.ts'
import { resolveUser } from '../args.ts'
import { maskPhone } from '../../utils/phone-mask.ts'
import type { ParsedArgs } from '../args.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'

export async function cmdUsers(
    sub: string | undefined,
    args: ParsedArgs,
    users: UserRepository,
): Promise<void> {
    switch (sub) {
        case 'list': return listUsers(users)
        case 'get':  return getUser(args.positional[0], users)
        case 'delete': return deleteUser(args.positional[0], users)
        default: {
            console.log('Usage:')
            console.log('  admin users list')
            console.log('  admin users get <phone|id>')
            console.log('  admin users delete <phone|id>')
        }
    }
}

// -----------------------------------------------
// list
// -----------------------------------------------

function listUsers(users: UserRepository): void {
    const all = users.findAll()
    header(`Users  (${all.length} total)`)

    if (all.length === 0) { warn('No registered users.'); return }

    table(
        all.map(u => [
            u.name,
            maskPhone(u.phone),
            u.goals.join(', ') || dim('—'),
            String(u.stack.length),
            u.peptides.filter(p => p.active).length > 0
                ? String(u.peptides.filter(p => p.active).length)
                : dim('0'),
            u.onboarded ? green('✓') : yellow('pending'),
            new Date(u.createdAt).toLocaleDateString(),
        ]),
        ['NAME', 'PHONE', 'GOALS', 'SUPPS', 'PEPTIDES', 'STATUS', 'JOINED'],
    )
}

// -----------------------------------------------
// get
// -----------------------------------------------

function getUser(query: string | undefined, users: UserRepository): void {
    if (!query) { failure('Provide a phone number or user id.'); return }

    const user = resolveUser(query, users)
    if (!user) { failure(`No user found for: ${query}`); return }

    header(`User — ${user.name}`)

    keyValue([
        ['ID',       user.id],
        ['Name',     user.name],
        ['Phone',    maskPhone(user.phone)],
        ['Timezone', user.timezone],
        ['Wake',     user.wakeTime],
        ['Sleep',    user.sleepTime],
        ['Goals',    user.goals.join(', ') || '—'],
        ['Onboarded', user.onboarded ? 'yes' : 'no'],
        ['Created',  new Date(user.createdAt).toLocaleString()],
        ['Updated',  new Date(user.updatedAt).toLocaleString()],
    ])

    if (user.stack.length > 0) {
        console.log('\n  Supplement Stack:')
        table(
            user.stack.map(s => [s.name, s.dose, s.timing, s.frequency]),
            ['SUPPLEMENT', 'DOSE', 'TIMING', 'FREQUENCY'],
        )
    }

    if (user.peptides.length > 0) {
        console.log('\n  Peptide Protocols:')
        table(
            user.peptides.map(p => [
                p.name,
                `${p.doseMcg} mcg`,
                `${p.frequencyPerWeek}x/wk`,
                `${p.cycleWeeks}w on / ${p.restWeeks}w off`,
                p.active ? green('active') : red('inactive'),
            ]),
            ['PEPTIDE', 'DOSE', 'FREQUENCY', 'CYCLE', 'STATUS'],
        )
    }

    console.log()
}

// -----------------------------------------------
// delete
// -----------------------------------------------

async function deleteUser(query: string | undefined, users: UserRepository): Promise<void> {
    if (!query) { failure('Provide a phone number or user id.'); return }

    const user = resolveUser(query, users)
    if (!user) { failure(`No user found for: ${query}`); return }

    process.stdout.write(
        yellow(`Delete ${user.name} (${maskPhone(user.phone)})? This cannot be undone. [y/N] `)
    )

    const answer = await new Promise<string>(resolve => {
        process.stdin.setEncoding('utf8')
        process.stdin.once('data', (chunk) => resolve(String(chunk).trim().toLowerCase()))
    })

    if (answer !== 'y' && answer !== 'yes') {
        dim('Cancelled.')
        return
    }

    users.delete(user.id)
    success(`Deleted user ${user.name} (${user.id})`)
}
