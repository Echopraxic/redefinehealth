import type { PeptideType } from '../domain/user-profile.ts'

export interface PeptideDef {
    name: string
    aliases: string[]
    type: PeptideType
    mechanism: string
    commonDoseMcg: { low: number; standard: number; high: number }
    frequencyOptions: number[]
    defaultCycleWeeks: number
    defaultRestWeeks: number
    preferredTiming: string
    rotationSites: string[]
    contraindications: string[]
    ghContext?: string
    notes: string
}

// Default subcutaneous rotation sites used unless peptide-specific sites are defined
const STANDARD_SC_SITES = [
    'Left abdomen (2 inches from navel)',
    'Right abdomen (2 inches from navel)',
    'Left outer thigh',
    'Right outer thigh',
]

export const PEPTIDE_DATABASE: PeptideDef[] = [
    {
        name: 'Ipamorelin',
        aliases: ['Ipa', 'Ipamorelin acetate'],
        type: 'growth-hormone',
        mechanism: 'GHRP-6 analogue — selective pituitary GH secretagogue with no cortisol or prolactin spike',
        commonDoseMcg: { low: 100, standard: 200, high: 300 },
        frequencyOptions: [5, 7],
        defaultCycleWeeks: 12,
        defaultRestWeeks: 4,
        preferredTiming: 'Bedtime — 2+ hours fasted for maximum GH pulse amplitude',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['active cancer', 'pregnancy', 'breastfeeding', 'pituitary tumors'],
        ghContext: 'Fast for 2+ hours? This maximizes GH pulse amplitude.',
        notes: 'Stack with CJC-1295 no-DAC (GHRH analogue) for synergistic GH amplification. Most selective GHRP available.',
    },
    {
        name: 'CJC-1295 No-DAC',
        aliases: ['CJC-1295', 'Mod GRF 1-29', 'CJC no DAC'],
        type: 'growth-hormone',
        mechanism: 'GHRH analogue — stimulates endogenous GHRH receptors to amplify GH pulse',
        commonDoseMcg: { low: 100, standard: 100, high: 200 },
        frequencyOptions: [5, 7],
        defaultCycleWeeks: 12,
        defaultRestWeeks: 4,
        preferredTiming: 'Bedtime — co-inject with Ipamorelin for synergistic pulse',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['active cancer', 'pregnancy', 'pituitary disorders'],
        ghContext: 'Fast for 2+ hours? This maximizes GH pulse amplitude.',
        notes: 'Short half-life (~30 min) mimics natural GHRH pulsatility. Always pair with a GHRP like Ipamorelin.',
    },
    {
        name: 'BPC-157',
        aliases: ['BPC 157', 'Body Protection Compound', 'BPC'],
        type: 'healing',
        mechanism: 'Stable gastric pentadecapeptide — angiogenesis, tendon/muscle repair, gut lining restoration',
        commonDoseMcg: { low: 200, standard: 500, high: 1000 },
        frequencyOptions: [5, 7],
        defaultCycleWeeks: 8,
        defaultRestWeeks: 2,
        preferredTiming: 'Post-workout or before bed — inject near injury site for localized healing',
        rotationSites: [
            'Near injury site (preferred for localized healing)',
            'Left abdomen',
            'Right abdomen',
        ],
        contraindications: ['active cancer (anti-angiogenesis concerns)', 'pregnancy'],
        notes: 'Exceptional safety profile in research. Also available in oral form for systemic gut/liver benefit.',
    },
    {
        name: 'TB-500',
        aliases: ['TB500', 'Thymosin Beta-4', 'thymosin beta 4'],
        type: 'healing',
        mechanism: 'Actin-sequestering protein fragment — systemic tissue repair, anti-inflammatory, angiogenesis',
        commonDoseMcg: { low: 2000, standard: 5000, high: 10000 },
        frequencyOptions: [2],
        defaultCycleWeeks: 6,
        defaultRestWeeks: 4,
        preferredTiming: '2x per week — can be taken any time of day',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['active cancer', 'pregnancy'],
        notes: 'Longer acting than BPC-157. Particularly effective for chronic injuries and systemic inflammation. Often stacked with BPC-157.',
    },
    {
        name: 'GHK-Cu',
        aliases: ['GHK Cu', 'copper peptide', 'glycyl-histidyl-lysine copper'],
        type: 'healing',
        mechanism: 'Copper-binding tripeptide — collagen synthesis, wound healing, skin regeneration, anti-aging',
        commonDoseMcg: { low: 1000, standard: 2000, high: 4000 },
        frequencyOptions: [5, 7],
        defaultCycleWeeks: 8,
        defaultRestWeeks: 4,
        preferredTiming: 'Bedtime — sub-Q injection or topical application to target areas',
        rotationSites: [
            'Face/neck (topical or sub-Q)',
            'Left abdomen',
            'Right abdomen',
            'Target skin area',
        ],
        contraindications: ['Wilson\'s disease (copper metabolism disorder)'],
        notes: 'Exceptional for skin remodeling, scar reduction, and hair growth. Synergistic with collagen supplementation.',
    },
    {
        name: 'Epithalon',
        aliases: ['Epitalon', 'Epithalamin', 'tetrapeptide'],
        type: 'healing',
        mechanism: 'Telomerase activator — pineal gland peptide, circadian rhythm regulation, anti-aging',
        commonDoseMcg: { low: 5000, standard: 10000, high: 20000 },
        frequencyOptions: [7],
        defaultCycleWeeks: 2,
        defaultRestWeeks: 22,
        preferredTiming: 'Daily injection — morning preferred for circadian alignment',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['active cancer (telomerase activation concern)'],
        notes: 'Typically run as 10-day or 2-week intensive course, 1-2x per year. Strong anti-aging and circadian profile.',
    },
    {
        name: 'PT-141',
        aliases: ['Bremelanotide', 'PT141'],
        type: 'libido',
        mechanism: 'Melanocortin receptor agonist (MC3R/MC4R) — central nervous system sexual arousal',
        commonDoseMcg: { low: 500, standard: 1000, high: 2000 },
        frequencyOptions: [2, 3],
        defaultCycleWeeks: 4,
        defaultRestWeeks: 4,
        preferredTiming: '45–90 minutes before desired effect — nasal spray or sub-Q',
        rotationSites: ['Left abdomen', 'Right abdomen'],
        contraindications: ['cardiovascular disease', 'uncontrolled hypertension', 'pregnancy'],
        notes: 'Works centrally — does not require sexual stimulation. Nausea at high doses (start low). Monitor blood pressure.',
    },
    {
        name: 'Semax',
        aliases: ['ACTH 4-7 Pro8-Gly9-Pro10', 'semax nasal'],
        type: 'cognition',
        mechanism: 'ACTH-derived nootropic — BDNF upregulation, dopamine/serotonin modulation, neuroprotection',
        commonDoseMcg: { low: 300, standard: 600, high: 1200 },
        frequencyOptions: [5, 7],
        defaultCycleWeeks: 4,
        defaultRestWeeks: 4,
        preferredTiming: 'Morning — intranasal delivery, peak cognitive window',
        rotationSites: ['Intranasal (left nostril)', 'Intranasal (right nostril)'],
        contraindications: ['history of psychosis', 'epilepsy'],
        notes: 'Russian neuropeptide with strong BDNF-enhancing profile. Often paired with Selank for anxiolytic balance. Intranasal delivery bypasses BBB.',
    },
    {
        name: 'Selank',
        aliases: ['tuftsin analogue', 'selank nasal'],
        type: 'cognition',
        mechanism: 'Anxiolytic nootropic — GABA modulation, BDNF upregulation, immune regulation',
        commonDoseMcg: { low: 250, standard: 500, high: 750 },
        frequencyOptions: [5, 7],
        defaultCycleWeeks: 4,
        defaultRestWeeks: 4,
        preferredTiming: 'Morning or as-needed for anxiety — intranasal delivery',
        rotationSites: ['Intranasal (left nostril)', 'Intranasal (right nostril)'],
        contraindications: ['pregnancy'],
        notes: 'Anxiolytic without sedation or dependence. Pairs well with Semax for balanced cognitive enhancement.',
    },
    {
        name: 'Sermorelin',
        aliases: ['GHRH 1-29', 'sermorelin acetate'],
        type: 'growth-hormone',
        mechanism: 'GHRH analogue — stimulates pituitary GH release via GHRH receptor, preserves pituitary function',
        commonDoseMcg: { low: 200, standard: 300, high: 500 },
        frequencyOptions: [5, 7],
        defaultCycleWeeks: 12,
        defaultRestWeeks: 4,
        preferredTiming: 'Bedtime — fasted for GH pulse optimization',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['active cancer', 'pregnancy', 'hypothyroidism (untreated)'],
        ghContext: 'Fast for 2+ hours? This maximizes GH pulse amplitude.',
        notes: 'FDA-approved (historically). Preserves pituitary feedback loop unlike exogenous HGH. Good entry-level GH secretagogue.',
    },
]

export function findPeptide(name: string): PeptideDef | undefined {
    const lower = name.toLowerCase()
    return PEPTIDE_DATABASE.find(
        p => p.name.toLowerCase() === lower || p.aliases.some(a => a.toLowerCase() === lower),
    )
}
