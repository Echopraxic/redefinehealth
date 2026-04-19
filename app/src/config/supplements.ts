import type { SupplementTiming } from '../domain/user-profile.ts'

export interface SupplementDef {
    name: string
    aliases: string[]
    defaultDose: string
    timing: SupplementTiming
    purpose: string
    benefits: string[]
    interactions: string[]
    notes?: string
}

export const SUPPLEMENT_DATABASE: SupplementDef[] = [
    {
        name: 'Vitamin D3',
        aliases: ['D3', 'Vitamin D', 'cholecalciferol'],
        defaultDose: '5000 IU',
        timing: 'morning',
        purpose: 'Immune function, bone health, mood regulation',
        benefits: ['Immune support', 'Bone density', 'Testosterone support', 'Mood regulation', 'Cardiovascular health'],
        interactions: [],
        notes: 'Take with fat-containing meal for absorption. Pair with K2 to direct calcium away from arteries.',
    },
    {
        name: 'Vitamin K2 (MK-7)',
        aliases: ['K2', 'MK-7', 'menaquinone'],
        defaultDose: '100 mcg',
        timing: 'morning',
        purpose: 'Calcium routing, cardiovascular protection',
        benefits: ['Directs calcium to bones', 'Arterial health', 'Bone density'],
        interactions: ['Warfarin', 'blood thinners'],
        notes: 'Critical companion to D3. Contraindicated with warfarin — consult physician.',
    },
    {
        name: 'Omega-3 Fish Oil',
        aliases: ['fish oil', 'EPA', 'DHA', 'omega 3'],
        defaultDose: '2g EPA+DHA',
        timing: 'with-meal',
        purpose: 'Anti-inflammation, cardiovascular, brain health',
        benefits: ['Reduces systemic inflammation', 'Cardiovascular protection', 'Cognitive support', 'Joint health'],
        interactions: ['Aspirin', 'blood thinners'],
        notes: 'Take with largest meal to minimize fishy aftertaste and improve absorption.',
    },
    {
        name: 'Magnesium Glycinate',
        aliases: ['magnesium', 'mag glycinate', 'mag'],
        defaultDose: '400 mg',
        timing: 'bedtime',
        purpose: 'Sleep quality, muscle recovery, stress response',
        benefits: ['Deep sleep enhancement', 'Muscle relaxation', 'Cortisol regulation', 'Insulin sensitivity'],
        interactions: ['Zinc'],
        notes: 'Glycinate form is best absorbed and least likely to cause GI issues.',
    },
    {
        name: 'Zinc',
        aliases: ['zinc bisglycinate', 'zinc picolinate'],
        defaultDose: '25 mg',
        timing: 'evening',
        purpose: 'Testosterone support, immune function, wound healing',
        benefits: ['Testosterone optimization', 'Immune modulation', 'Skin health', 'Prostate health'],
        interactions: ['Magnesium', 'Iron', 'Copper'],
        notes: 'Take on an empty stomach or with a small meal. Long-term use >40mg/day requires copper supplementation.',
    },
    {
        name: 'NMN',
        aliases: ['nicotinamide mononucleotide', 'NMN powder'],
        defaultDose: '500 mg',
        timing: 'morning',
        purpose: 'NAD+ precursor, cellular energy, longevity signaling',
        benefits: ['Mitochondrial energy', 'DNA repair', 'Sirtuin activation', 'Metabolic health'],
        interactions: [],
        notes: 'Take sublingual or with water on empty stomach for best absorption. Stack with Resveratrol.',
    },
    {
        name: 'Resveratrol',
        aliases: ['trans-resveratrol'],
        defaultDose: '500 mg',
        timing: 'morning',
        purpose: 'Sirtuin activation, CD38 inhibition, NAD+ enhancement',
        benefits: ['Sirtuin pathway activation', 'Anti-aging signaling', 'Cardiovascular protection'],
        interactions: [],
        notes: 'Fat-soluble — take with a small amount of fat. Synergistic with NMN for NAD+ optimization.',
    },
    {
        name: 'CoQ10 (Ubiquinol)',
        aliases: ['CoQ10', 'ubiquinol', 'coenzyme Q10'],
        defaultDose: '200 mg',
        timing: 'with-meal',
        purpose: 'Mitochondrial electron transport, antioxidant protection',
        benefits: ['Mitochondrial energy production', 'Antioxidant protection', 'Cardiovascular support', 'Statin side-effect mitigation'],
        interactions: ['Statins', 'blood thinners'],
        notes: 'Ubiquinol is the reduced, active form — better absorbed than ubiquinone, especially over age 40.',
    },
    {
        name: 'Berberine',
        aliases: ['berberine HCl'],
        defaultDose: '500 mg',
        timing: 'with-meal',
        purpose: 'Blood glucose regulation, AMPK activation, metabolic optimization',
        benefits: ['Insulin sensitivity', 'Blood glucose control', 'AMPK activation', 'Gut microbiome support'],
        interactions: ['Metformin', 'blood sugar medications', 'CYP2D6 substrates'],
        notes: 'Functional analogue to Metformin. Cycle 8 weeks on, 4 weeks off to prevent tolerance.',
    },
    {
        name: 'Vitamin C',
        aliases: ['ascorbic acid', 'ascorbate'],
        defaultDose: '1000 mg',
        timing: 'morning',
        purpose: 'Antioxidant, collagen synthesis, immune support',
        benefits: ['Collagen synthesis', 'Immune support', 'Iron absorption', 'Oxidative stress reduction'],
        interactions: ['Iron'],
        notes: 'Liposomal form preferred for doses >1g. Avoid high doses pre-workout (may blunt adaptations).',
    },
    {
        name: 'Collagen Peptides',
        aliases: ['collagen', 'hydrolyzed collagen', 'collagen powder'],
        defaultDose: '15 g',
        timing: 'morning',
        purpose: 'Skin elasticity, joint health, tendon repair',
        benefits: ['Skin hydration and elasticity', 'Joint lubrication', 'Tendon and ligament health', 'Gut lining support'],
        interactions: [],
        notes: 'Take with Vitamin C for maximum collagen synthesis. Works synergistically with GHK-Cu.',
    },
    {
        name: 'Creatine Monohydrate',
        aliases: ['creatine', 'creatine mono'],
        defaultDose: '5 g',
        timing: 'morning',
        purpose: 'ATP resynthesis, strength, muscle mass, cognitive function',
        benefits: ['Strength and power output', 'Lean muscle mass', 'Cognitive function', 'Cellular hydration'],
        interactions: [],
        notes: 'Most researched performance supplement in existence. No loading phase necessary.',
    },
    {
        name: 'Ashwagandha',
        aliases: ['KSM-66', 'withania somnifera'],
        defaultDose: '600 mg',
        timing: 'bedtime',
        purpose: 'Cortisol regulation, stress adaptation, testosterone support',
        benefits: ['Cortisol reduction', 'Stress resilience', 'Testosterone optimization', 'Sleep quality'],
        interactions: ['thyroid medications', 'immunosuppressants'],
        notes: 'KSM-66 extract has best clinical evidence. Cycle 3 months on, 2 weeks off.',
    },
    {
        name: 'Alpha Lipoic Acid',
        aliases: ['ALA', 'alpha lipoic', 'R-ALA'],
        defaultDose: '300 mg',
        timing: 'with-meal',
        purpose: 'Mitochondrial antioxidant, glucose uptake, heavy metal chelation',
        benefits: ['Mitochondrial protection', 'Glucose disposal', 'Neuroprotection', 'Glutathione recycling'],
        interactions: ['blood sugar medications', 'thyroid medications'],
        notes: 'R-ALA is the biologically active form. Take before carbohydrate-rich meals.',
    },
    {
        name: 'Melatonin',
        aliases: ['melatonin extended release'],
        defaultDose: '0.5 mg',
        timing: 'bedtime',
        purpose: 'Circadian rhythm regulation, sleep onset, antioxidant',
        benefits: ['Sleep onset', 'Circadian entrainment', 'Antioxidant at mitochondria', 'Immune modulation'],
        interactions: ['sedatives', 'blood thinners'],
        notes: 'Less is more — 0.3–1mg is physiological. High doses (5–10mg) blunt the signal over time.',
    },
    {
        name: 'Vitamin B Complex',
        aliases: ['B vitamins', 'B-complex', 'methylated B'],
        defaultDose: '1 capsule',
        timing: 'morning',
        purpose: 'Energy metabolism, methylation, neurotransmitter synthesis',
        benefits: ['Energy metabolism', 'Methylation support', 'Neurological health', 'Stress response'],
        interactions: [],
        notes: 'Use methylated forms (methylfolate, methylcobalamin) for better utilization, especially with MTHFR variants.',
    },
    {
        name: 'Tongkat Ali',
        aliases: ['longjack', 'eurycoma longifolia', 'tongkat'],
        defaultDose: '200 mg',
        timing: 'morning',
        purpose: 'Testosterone optimization, SHBG reduction, libido',
        benefits: ['Free testosterone increase', 'SHBG reduction', 'Libido enhancement', 'Stress resilience'],
        interactions: [],
        notes: '200:1 extract standardized to 2% eurycomanone. Cycle 5 days on, 2 days off.',
    },
]

export function findSupplement(name: string): SupplementDef | undefined {
    const lower = name.toLowerCase()
    return SUPPLEMENT_DATABASE.find(
        s => s.name.toLowerCase() === lower || s.aliases.some(a => a.toLowerCase() === lower),
    )
}
