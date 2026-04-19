// -----------------------------------------------
// Types
// -----------------------------------------------

export type CommandType =
    | 'compliance_taken'
    | 'compliance_skip'
    | 'status'
    | 'streak'
    | 'reconstitute'
    | 'side_effect'
    | 'skin_checkin'
    | 'sleep_checkin'
    | 'protocol_list'
    | 'adjustment'
    | 'start_onboarding'
    | 'help'
    | 'general'

// -----------------------------------------------
// Pattern table — evaluated in order; first match wins
// -----------------------------------------------

const PATTERNS: Array<{ type: CommandType; pattern: RegExp }> = [
    // Onboarding trigger
    { type: 'start_onboarding', pattern: /^\s*(start|join|onboard|sign up|register)\s*$/i },

    // Compliance — exact short replies first to avoid false positives
    { type: 'compliance_taken',  pattern: /\b(taken|done|yes|yep|y|took it|took them|injected|did it|confirmed|complete|finished|ready)\b/i },
    { type: 'compliance_skip',   pattern: /\b(skip|skipping|skipped|no|nah|n|not today|missed|forgot|forgetting)\b/i },

    // Peptide reconstitution
    { type: 'reconstitute',      pattern: /\b(reconstitut|mix|bac water|bacteriostatic|vial|syringe|units|ml|mcg|how much water|how to mix)\b/i },

    // Side effects / symptoms — before general so "side effect" doesn't fall to general
    { type: 'side_effect',       pattern: /\b(pain|sore|ache|nausea|diz+y|fatigue|headache|swelling|redness|itch|reaction|side effect|felt weird|feeling weird|not feeling|adverse|bruise|lump|nodule|post.injection)\b/i },

    // Protocol-specific check-ins
    { type: 'skin_checkin',      pattern: /\b(skin|complexion|face|acne|wrinkle|glow|texture|pore|hyperpig|collagen.*progress|photo)\b/i },
    { type: 'sleep_checkin',     pattern: /\b(sleep|hrv|rest|recovery|dream|wake up|insomnia|bed|bedtime|circadian|tired this morning)\b/i },

    // Reporting
    { type: 'status',            pattern: /\b(status|progress|how am i|report|summary|overview|check.?in)\b/i },
    { type: 'streak',            pattern: /\b(streak|stats|score|compliance|rate|history|log)\b/i },

    // Protocol management
    { type: 'protocol_list',     pattern: /\b(protocol|protocols|what.*active|my plan|schedule|what do I take)\b/i },
    { type: 'adjustment',        pattern: /\b(adjust|change|modify|update|different|less|more|reduce|increase|lower|higher|new dose|switch|pause|stop)\b/i },

    // Help
    { type: 'help',              pattern: /\b(help|commands|what can|options|menu|instructions|how do I)\b/i },
]

export function routeCommand(text: string): CommandType {
    const cleaned = text.trim()
    for (const { type, pattern } of PATTERNS) {
        if (pattern.test(cleaned)) return type
    }
    return 'general'
}

// -----------------------------------------------
// Help text
// -----------------------------------------------

export function buildHelpMessage(): string {
    return [
        '🧬 Healthspan OS — Commands',
        '',
        '✅  "done" / "taken" — Log supplement or injection',
        '⏭️  "skip [reason]" — Log a missed dose',
        '📊  "status" — 30-day progress report',
        '🔥  "streak" — Per-supplement compliance streaks',
        '💉  "reconstitute [peptide]" — Mixing guide + AI Q&A',
        '🩹  "side effects [symptoms]" — Log & analyze symptoms',
        '🧴  "skin [notes/rating]" — Skin protocol check-in',
        '🌙  "sleep [score]" — Sleep quality check-in',
        '📋  "protocols" — List your active protocols',
        '⚙️  "adjust [what]" — Request protocol change',
        '',
        'Or ask anything about your health protocol.',
    ].join('\n')
}

export function buildProtocolListMessage(
    stack: Array<{ name: string; dose: string; timing: string }>,
    peptides: Array<{ name: string; active: boolean; cycleWeeks: number }>,
    activeProtocols: string[],
): string {
    const lines = ['📋 Your Active Protocols\n']

    if (stack.length > 0) {
        lines.push('💊 Supplements:')
        for (const s of stack) lines.push(`  • ${s.name} (${s.dose}) — ${s.timing}`)
        lines.push('')
    }

    if (peptides.filter(p => p.active).length > 0) {
        lines.push('💉 Peptides:')
        for (const p of peptides.filter(p => p.active)) {
            lines.push(`  • ${p.name} — ${p.cycleWeeks}-week cycle (active)`)
        }
        lines.push('')
    }

    if (activeProtocols.length > 0) {
        lines.push('🔬 Health Protocols:')
        for (const p of activeProtocols) lines.push(`  • ${p}`)
    }

    return lines.join('\n')
}
