// -----------------------------------------------
// Side effect severity classification + response routing
// -----------------------------------------------

export type SideEffectSeverity = 'mild' | 'moderate' | 'severe' | 'emergency'

export interface SideEffectClassification {
    severity: SideEffectSeverity
    immediateAction: string
    continueProtocol: boolean
    escalate: boolean
    suggestPause: boolean
}

// -----------------------------------------------
// Pattern matching (evaluated in order — most severe first)
// -----------------------------------------------

const EMERGENCY = /chest pain|chest pressure|jaw pain|left arm|shortness of breath|can'?t breathe|cannot breathe|anaphyla|throat.*clos|swelling.*throat|passing out|unconscious|stroke|911|call.*ambulance|emergency room/i
const SEVERE = /severe|extreme|unbearable|can'?t move|can'?t walk|whole body|systemic|high fever|fever.*38|fever.*39|fever.*40|vomiting.*hours|significant swelling|blurry vision|vision.*loss|numbness.*face|numbness.*arm/i
const MODERATE = /persistent|getting worse|spreading|hives|swelling(?! throat)|dizziness|nausea(?! brief)|headache.*bad|won'?t go away|hours|increased heart rate|heart pounding|palpitations/i

export function classifySideEffect(report: string): SideEffectClassification {
    if (EMERGENCY.test(report)) {
        return {
            severity: 'emergency',
            immediateAction: 'Call 911 immediately. Do not wait.',
            continueProtocol: false,
            escalate: true,
            suggestPause: true,
        }
    }
    if (SEVERE.test(report)) {
        return {
            severity: 'severe',
            immediateAction: 'Stop all supplements and peptides immediately. Contact your healthcare provider today — do not wait until next appointment.',
            continueProtocol: false,
            escalate: true,
            suggestPause: true,
        }
    }
    if (MODERATE.test(report)) {
        return {
            severity: 'moderate',
            immediateAction: 'Pause the most recently added supplement or peptide for 48–72 hours and monitor. If symptoms persist or worsen, contact a healthcare provider.',
            continueProtocol: false,
            escalate: false,
            suggestPause: true,
        }
    }
    return {
        severity: 'mild',
        immediateAction: 'Log and monitor. Many mild symptoms (redness at injection site, mild GI upset, transient fatigue) resolve within 3–7 days as the body adapts.',
        continueProtocol: true,
        escalate: false,
        suggestPause: false,
    }
}

export function buildEscalationMessage(severity: SideEffectSeverity): string | null {
    switch (severity) {
        case 'emergency':
            return '🚨 EMERGENCY SYMPTOMS DETECTED. Call 911 NOW. Do not continue messaging — get help immediately.'
        case 'severe':
            return '⚠️ SEVERE REACTION. Stop all supplements immediately. Contact a healthcare provider today.'
        default:
            return null
    }
}

/**
 * Returns likely causative substances based on symptom keywords.
 * Heuristic only — AI analysis provides the real correlation.
 */
export function inferLikelyCauses(
    report: string,
    recentDoses: Array<{ name: string; type: 'supplement' | 'peptide'; takenAt: number }>,
): string[] {
    const text = report.toLowerCase()
    const candidates: string[] = []

    // Injection-site reactions → most recent peptide
    if (/redness|swelling|lump|hard.*site|bruise|injection site/.test(text)) {
        const peptides = recentDoses.filter(d => d.type === 'peptide')
        if (peptides[0]) candidates.push(`${peptides[0].name} (injection site reaction)`)
    }

    // GI symptoms → oral supplements
    if (/nausea|stomach|vomit|diarrhea|bloat|cramp|gut/.test(text)) {
        const supplements = recentDoses.filter(d => d.type === 'supplement')
        if (supplements[0]) candidates.push(`${supplements[0].name} (GI intolerance)`)
    }

    // Stimulatory → GH secretagogues or cognition peptides
    if (/heart racing|palpitation|anxious|jittery|wired/.test(text)) {
        const ghPeptides = recentDoses.filter(d => d.type === 'peptide')
        if (ghPeptides[0]) candidates.push(`${ghPeptides[0].name} (stimulatory effect)`)
    }

    // Fatigue/crash → general dose timing issue
    if (/tired|fatigue|crash|exhausted|low energy/.test(text)) {
        candidates.push('Possible dosing timing conflict — check supplement schedule')
    }

    return candidates
}
