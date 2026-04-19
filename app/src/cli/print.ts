// -----------------------------------------------
// ANSI helpers
// -----------------------------------------------

const c = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    dim:    '\x1b[2m',
    red:    '\x1b[31m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
    white:  '\x1b[37m',
}

const NO_COLOR = process.env['NO_COLOR'] !== undefined || process.env['TERM'] === 'dumb'

function paint(code: string, text: string): string {
    return NO_COLOR ? text : `${code}${text}${c.reset}`
}

export const bold   = (s: string) => paint(c.bold,   s)
export const dim    = (s: string) => paint(c.dim,    s)
export const green  = (s: string) => paint(c.green,  s)
export const red    = (s: string) => paint(c.red,    s)
export const yellow = (s: string) => paint(c.yellow, s)
export const cyan   = (s: string) => paint(c.cyan,   s)

// -----------------------------------------------
// Semantic output
// -----------------------------------------------

export function success(msg: string): void { console.log(green(`✓ ${msg}`) ) }
export function failure(msg: string): void { console.error(red(`✗ ${msg}`)) }
export function warn(msg: string):    void { console.warn(yellow(`⚠ ${msg}`)) }
export function info(msg: string):    void { console.log(dim(msg)) }

export function header(title: string): void {
    const line = '─'.repeat(Math.min(process.stdout.columns ?? 72, 72))
    console.log(`\n${bold(title)}`)
    console.log(dim(line))
}

// -----------------------------------------------
// Table formatter
// Strips ANSI codes when measuring column widths so colors don't break alignment
// -----------------------------------------------

const ANSI_RE = /\x1b\[[0-9;]*m/g

function visibleLen(s: string): number {
    return s.replace(ANSI_RE, '').length
}

function padEnd(s: string, width: number): string {
    const vis = visibleLen(s)
    return s + ' '.repeat(Math.max(0, width - vis))
}

export function table(rows: string[][], headers: string[]): void {
    if (rows.length === 0) { info('  (no results)'); return }

    const allRows = [headers, ...rows]
    const widths = headers.map((_, ci) =>
        Math.max(...allRows.map(r => visibleLen(r[ci] ?? '')))
    )

    const header = headers.map((h, i) => bold(padEnd(h, widths[i]!))).join('  ')
    const divider = widths.map(w => '─'.repeat(w)).join('  ')

    console.log(header)
    console.log(dim(divider))
    for (const row of rows) {
        console.log(row.map((cell, i) => padEnd(cell, widths[i]!)).join('  '))
    }
}

// -----------------------------------------------
// Key-value block
// -----------------------------------------------

export function keyValue(pairs: Array<[string, string | number | boolean | null | undefined]>): void {
    const keyWidth = Math.max(...pairs.map(([k]) => k.length))
    for (const [k, v] of pairs) {
        const key = cyan(k.padEnd(keyWidth))
        const val = v === null || v === undefined ? dim('—') : String(v)
        console.log(`  ${key}  ${val}`)
    }
}
