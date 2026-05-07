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
    // -----------------------------------------------
    // GH Secretagogues
    // -----------------------------------------------
    {
        name: 'Ipamorelin',
        aliases: ['Ipa', 'Ipamorelin acetate'],
        type: 'growth-hormone',
        mechanism: 'Selective GHRP — pituitary GH secretagogue with no cortisol or prolactin spike',
        commonDoseMcg: { low: 100, standard: 200, high: 300 },
        frequencyOptions: [5, 7],
        defaultCycleWeeks: 12,
        defaultRestWeeks: 4,
        preferredTiming: 'Bedtime — 2+ hours fasted for maximum GH pulse amplitude',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['active cancer', 'pregnancy', 'breastfeeding', 'pituitary tumors'],
        ghContext: 'Fast for 2+ hours? This maximizes GH pulse amplitude.',
        notes: 'Stack with CJC-1295 no-DAC (GHRH analogue) for synergistic GH amplification. Most selective GHRP available — no cortisol or prolactin side effects.',
    },
    {
        name: 'CJC-1295 No-DAC',
        aliases: ['CJC-1295', 'Mod GRF 1-29', 'CJC no DAC', 'Modified GRF'],
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
    {
        name: 'Tesamorelin',
        aliases: ['EGRIFTA', 'tesamorelin acetate'],
        type: 'growth-hormone',
        mechanism: 'Stabilized GHRH analogue — potent GH release, FDA-approved for visceral adiposity reduction',
        commonDoseMcg: { low: 1000, standard: 2000, high: 2000 },
        frequencyOptions: [7],
        defaultCycleWeeks: 12,
        defaultRestWeeks: 6,
        preferredTiming: 'Bedtime — fasted, most potent GHRH analogue available',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['active cancer', 'pregnancy', 'pituitary pathology', 'hypothyroidism (untreated)'],
        ghContext: 'Fast for 2+ hours? This maximizes GH pulse amplitude.',
        notes: 'FDA-approved for HIV-associated lipodystrophy. Most potent GHRH analogue — strong IGF-1 increase and visceral fat reduction. 26-amino-acid GHRH with trans-3-hexenoic acid for stability.',
    },
    {
        name: 'GHRP-2',
        aliases: ['growth hormone releasing peptide 2', 'GHRP2'],
        type: 'growth-hormone',
        mechanism: 'Ghrelin mimetic — GHSR agonist with stronger GH release than Ipamorelin, mild cortisol/prolactin spike',
        commonDoseMcg: { low: 100, standard: 200, high: 300 },
        frequencyOptions: [3, 5, 7],
        defaultCycleWeeks: 12,
        defaultRestWeeks: 4,
        preferredTiming: 'Bedtime or pre-workout — fasted preferred',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['active cancer', 'pregnancy', 'hypercorticism'],
        ghContext: 'Fast for 2+ hours? This maximizes GH pulse amplitude.',
        notes: 'More potent GH release than Ipamorelin but causes mild cortisol and prolactin elevation. Consider Ipamorelin if managing cortisol. Often paired with CJC-1295 no-DAC.',
    },
    {
        name: 'GHRP-6',
        aliases: ['growth hormone releasing peptide 6', 'GHRP6'],
        type: 'growth-hormone',
        mechanism: 'First-generation ghrelin mimetic — strong GH pulse, significant appetite stimulation',
        commonDoseMcg: { low: 100, standard: 200, high: 300 },
        frequencyOptions: [3, 5],
        defaultCycleWeeks: 8,
        defaultRestWeeks: 4,
        preferredTiming: 'Pre-workout or bedtime — hunger side effect strongest within 30 min of injection',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['active cancer', 'pregnancy', 'eating disorders (appetite stimulation)'],
        ghContext: 'Fast for 2+ hours? This maximizes GH pulse amplitude.',
        notes: 'Hunger side effect is pronounced — best for those wanting to increase caloric intake. Older compound with significant research. Less popular now that Ipamorelin is available.',
    },
    {
        name: 'Hexarelin',
        aliases: ['hexarelin acetate', 'examorelin'],
        type: 'growth-hormone',
        mechanism: 'Most potent synthetic GHRP — strong GH pulse but significant desensitization and cortisol/prolactin spike',
        commonDoseMcg: { low: 100, standard: 200, high: 300 },
        frequencyOptions: [3, 5],
        defaultCycleWeeks: 6,
        defaultRestWeeks: 6,
        preferredTiming: 'Pre-workout or bedtime — fasted',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['active cancer', 'pregnancy', 'hypercorticism', 'cardiovascular disease'],
        ghContext: 'Fast for 2+ hours? This maximizes GH pulse amplitude.',
        notes: 'Most potent GHRP available. Significant downregulation occurs rapidly — short cycles essential. Also has direct cardiac effects (cardioprotection). Less commonly used than Ipamorelin due to side effect profile.',
    },

    // -----------------------------------------------
    // Healing / Repair
    // -----------------------------------------------
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
        notes: 'Exceptional safety profile in research. Also available in oral form for systemic gut/liver benefit. Fastest-acting healing peptide — noticeable within days for acute injuries.',
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
        notes: 'Longer acting than BPC-157. Particularly effective for chronic injuries and systemic inflammation. Often stacked with BPC-157 for synergistic healing.',
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
        name: 'KPV',
        aliases: ['KPV peptide', 'Lys-Pro-Val'],
        type: 'anti-inflammatory',
        mechanism: 'Alpha-MSH C-terminal tripeptide — anti-inflammatory via NF-κB inhibition, gut healing',
        commonDoseMcg: { low: 500, standard: 1000, high: 2000 },
        frequencyOptions: [5, 7],
        defaultCycleWeeks: 8,
        defaultRestWeeks: 4,
        preferredTiming: 'Bedtime or post-workout — oral or sub-Q equally effective',
        rotationSites: [
            'Left abdomen',
            'Right abdomen',
            'Can be taken orally for gut-specific effects',
        ],
        contraindications: ['pregnancy'],
        notes: 'Potent anti-inflammatory — effective for IBD, Crohn\'s, and systemic inflammation. Oral dosing penetrates GI mucosa directly. Often combined with BPC-157 for gut healing protocols.',
    },

    // -----------------------------------------------
    // Skin / Anti-Aging
    // -----------------------------------------------
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
        notes: 'Typically run as 10-day or 2-week intensive course, 1-2x per year. Strong anti-aging and circadian profile. One of the most researched anti-aging peptides.',
    },
    {
        name: 'AOD-9604',
        aliases: ['AOD 9604', 'anti-obesity drug 9604', 'hGH fragment 176-191'],
        type: 'fat-loss',
        mechanism: 'GH C-terminal fragment — stimulates lipolysis and inhibits lipogenesis without IGF-1 elevation',
        commonDoseMcg: { low: 250, standard: 500, high: 1000 },
        frequencyOptions: [5, 7],
        defaultCycleWeeks: 12,
        defaultRestWeeks: 4,
        preferredTiming: 'Fasted morning or 30 min before exercise — no food 30 min pre/post injection',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['pregnancy', 'active cancer'],
        notes: 'FDA-approved food status. No insulin resistance, no IGF-1 increase — fat loss without growth effects. Most effective fasted and combined with exercise.',
    },

    // -----------------------------------------------
    // Cognition / CNS
    // -----------------------------------------------
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

    // -----------------------------------------------
    // Libido / Sexual Health
    // -----------------------------------------------
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

    // -----------------------------------------------
    // Sleep
    // -----------------------------------------------
    {
        name: 'DSIP',
        aliases: ['delta sleep-inducing peptide', 'delta sleep inducing peptide'],
        type: 'sleep',
        mechanism: 'Neuropeptide — modulates stress response and promotes slow-wave sleep via hypothalamic action',
        commonDoseMcg: { low: 100, standard: 300, high: 600 },
        frequencyOptions: [3, 5],
        defaultCycleWeeks: 4,
        defaultRestWeeks: 4,
        preferredTiming: '30–60 min before sleep — sub-Q injection',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['pregnancy'],
        notes: 'Also reduces stress hormones (ACTH, corticosteroids) and has mild analgesic properties. Effects can be subtle — best results with consistent use over 2+ weeks.',
    },

    // -----------------------------------------------
    // Immune / Antimicrobial
    // -----------------------------------------------
    {
        name: 'Thymosin Alpha-1',
        aliases: ['Ta1', 'thymosin alpha 1', 'Zadaxin', 'thymalfasin'],
        type: 'antimicrobial',
        mechanism: 'Thymic peptide — T-cell maturation, NK cell activation, innate and adaptive immune modulation',
        commonDoseMcg: { low: 900, standard: 1600, high: 3200 },
        frequencyOptions: [2, 3],
        defaultCycleWeeks: 8,
        defaultRestWeeks: 4,
        preferredTiming: '2–3x per week — sub-Q, any time of day',
        rotationSites: STANDARD_SC_SITES,
        contraindications: ['organ transplant recipients on immunosuppressants', 'autoimmune disease (relative)'],
        notes: 'FDA-approved (Zadaxin) in multiple countries for hepatitis B/C, cancer immunotherapy. Dramatically enhances immune surveillance. Used in longevity protocols for immune rejuvenation.',
    },
]

export function findPeptide(name: string): PeptideDef | undefined {
    const lower = name.toLowerCase()
    return PEPTIDE_DATABASE.find(
        p => p.name.toLowerCase() === lower || p.aliases.some(a => a.toLowerCase() === lower),
    )
}
