// -----------------------------------------------
// Types
// -----------------------------------------------

export type InteractionSeverity = 'info' | 'caution' | 'warning' | 'critical'

export interface InteractionWarning {
    severity: InteractionSeverity
    substances: [string, string]
    description: string
    recommendation: string
}

// -----------------------------------------------
// Interaction database
// -----------------------------------------------

const INTERACTIONS: InteractionWarning[] = [
    // Critical — contraindicated combinations
    {
        severity: 'critical',
        substances: ['Vitamin K2', 'Warfarin'],
        description: 'Vitamin K2 directly antagonizes warfarin anticoagulation — INR will be unpredictable.',
        recommendation: 'Do NOT combine without physician-supervised INR monitoring.',
    },
    {
        severity: 'critical',
        substances: ['Berberine', 'Metformin'],
        description: 'Additive blood glucose lowering creates hypoglycemia risk.',
        recommendation: 'Consult prescribing physician. Monitor blood glucose closely.',
    },

    // Warnings — use with caution, monitor
    {
        severity: 'warning',
        substances: ['Fish Oil', 'Aspirin'],
        description: 'Combined antiplatelet effect increases bleeding risk, especially at high fish oil doses.',
        recommendation: 'Keep fish oil ≤3g EPA+DHA/day if on daily aspirin therapy.',
    },
    {
        severity: 'warning',
        substances: ['Vitamin B6', 'neuropathy'],
        description: 'High-dose B6 (>100mg/day long-term) causes peripheral sensory neuropathy.',
        recommendation: 'Use P5P (pyridoxal-5-phosphate) form. Keep under 50mg/day for chronic use.',
    },
    {
        severity: 'warning',
        substances: ['PT-141', 'cardiovascular'],
        description: 'PT-141 (Bremelanotide) transiently increases blood pressure.',
        recommendation: 'Contraindicated in uncontrolled hypertension or cardiovascular disease.',
    },
    {
        severity: 'warning',
        substances: ['Alpha Lipoic Acid', 'thyroid'],
        description: 'ALA may reduce T3/T4 levels at high doses and interfere with thyroid medications.',
        recommendation: 'Monitor thyroid function with chronic ALA use >600mg/day.',
    },
    {
        severity: 'warning',
        substances: ['Ashwagandha', 'thyroid'],
        description: 'Ashwagandha increases T3/T4 — may alter thyroid medication requirements.',
        recommendation: 'Monitor thyroid labs with concurrent thyroid medication use.',
    },

    // Cautions — real interactions but manageable with timing
    {
        severity: 'caution',
        substances: ['Iron', 'Calcium'],
        description: 'Calcium significantly inhibits non-heme iron absorption when taken simultaneously.',
        recommendation: 'Separate Iron and Calcium by at least 2 hours.',
    },
    {
        severity: 'caution',
        substances: ['Zinc', 'Copper'],
        description: 'Chronic high-dose zinc (>40mg/day) depletes copper stores over time.',
        recommendation: 'Add 1–2mg copper if using zinc >40mg/day long-term.',
    },
    {
        severity: 'caution',
        substances: ['Magnesium', 'Zinc'],
        description: 'High-dose zinc competes with magnesium absorption at intestinal transporters.',
        recommendation: 'Take at different times of day (e.g., zinc evening, magnesium bedtime).',
    },
    {
        severity: 'caution',
        substances: ['BPC-157', 'NSAID'],
        description: 'NSAIDs may reduce BPC-157 healing efficacy by inhibiting prostaglandin-dependent repair.',
        recommendation: 'Avoid ibuprofen/aspirin within 4 hours of BPC-157 injection.',
    },
    {
        severity: 'caution',
        substances: ['Ipamorelin', 'insulin'],
        description: 'Insulin blunts GH response from GH secretagogues.',
        recommendation: 'Fast 2+ hours before Ipamorelin injection. Avoid peri-workout carbs.',
    },
    {
        severity: 'caution',
        substances: ['Melatonin', 'sedatives'],
        description: 'Additive CNS depression with benzodiazepines, Z-drugs, or alcohol.',
        recommendation: 'Avoid combining with prescription sedatives. Keep melatonin ≤1mg.',
    },
    {
        severity: 'caution',
        substances: ['Berberine', 'CYP2D6'],
        description: 'Berberine inhibits CYP2D6 — may raise blood levels of many medications metabolized by this enzyme.',
        recommendation: 'Review all prescription medications for CYP2D6 interactions.',
    },

    // Informational — synergistic or timing notes
    {
        severity: 'info',
        substances: ['NMN', 'Resveratrol'],
        description: 'Resveratrol inhibits CD38 (NAD+ consumer), amplifying NMN\'s NAD+-raising effect.',
        recommendation: 'Intentional stack — take together in the morning with a small amount of fat.',
    },
    {
        severity: 'info',
        substances: ['Vitamin D3', 'Vitamin K2'],
        description: 'K2 routes the calcium mobilized by D3 into bones rather than arteries.',
        recommendation: 'Always pair D3 with K2 (MK-7 form, 100–200mcg/day).',
    },
    {
        severity: 'info',
        substances: ['Collagen', 'Vitamin C'],
        description: 'Vitamin C is required for hydroxylation in collagen synthesis.',
        recommendation: 'Take together for maximum collagen production benefit.',
    },
    {
        severity: 'info',
        substances: ['GHK-Cu', 'Collagen'],
        description: 'GHK-Cu upregulates collagen synthesis — synergistic with collagen peptide supplementation.',
        recommendation: 'Stack intentionally. Take within same 2-hour window.',
    },
]

// -----------------------------------------------
// Public API
// -----------------------------------------------

export function checkInteractions(substanceNames: string[]): InteractionWarning[] {
    const normalized = substanceNames.map(n => n.toLowerCase().trim())
    const found: InteractionWarning[] = []

    for (const interaction of INTERACTIONS) {
        const [a, b] = interaction.substances.map(s => s.toLowerCase())
        const hasA = normalized.some(n => n.includes(a) || a.includes(n))
        const hasB = normalized.some(n => n.includes(b) || b.includes(n))
        if (hasA && hasB) found.push(interaction)
    }

    const severityOrder: Record<InteractionSeverity, number> = { critical: 0, warning: 1, caution: 2, info: 3 }
    return found.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

export function formatInteractionWarnings(warnings: InteractionWarning[]): string | null {
    if (warnings.length === 0) return null

    const icon: Record<InteractionSeverity, string> = {
        critical: '🚨',
        warning: '⚠️',
        caution: '⚡',
        info: 'ℹ️',
    }

    const lines = ['⚠️ STACK INTERACTION REVIEW:']
    for (const w of warnings) {
        lines.push(`\n${icon[w.severity]} ${w.substances.join(' + ')}`)
        lines.push(`   ${w.description}`)
        lines.push(`   → ${w.recommendation}`)
    }

    const hasSerious = warnings.some(w => w.severity === 'critical' || w.severity === 'warning')
    if (hasSerious) {
        lines.push('\n🔴 One or more serious interactions flagged. Consult a healthcare provider before proceeding.')
    }

    return lines.join('\n')
}
