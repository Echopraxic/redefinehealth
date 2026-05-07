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
    // -----------------------------------------------
    // Foundational / Micronutrients
    // -----------------------------------------------
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
        aliases: ['fish oil', 'EPA', 'DHA', 'omega 3', 'omega-3'],
        defaultDose: '2g EPA+DHA',
        timing: 'with-meal',
        purpose: 'Anti-inflammation, cardiovascular, brain health',
        benefits: ['Reduces systemic inflammation', 'Cardiovascular protection', 'Cognitive support', 'Joint health'],
        interactions: ['Aspirin', 'blood thinners'],
        notes: 'Take with largest meal to minimize fishy aftertaste and improve absorption.',
    },
    {
        name: 'Magnesium Glycinate',
        aliases: ['magnesium', 'mag glycinate', 'mag', 'magnesium bisglycinate'],
        defaultDose: '400 mg',
        timing: 'bedtime',
        purpose: 'Sleep quality, muscle recovery, stress response',
        benefits: ['Deep sleep enhancement', 'Muscle relaxation', 'Cortisol regulation', 'Insulin sensitivity'],
        interactions: ['Zinc'],
        notes: 'Glycinate form is best absorbed and least likely to cause GI issues.',
    },
    {
        name: 'Zinc',
        aliases: ['zinc bisglycinate', 'zinc picolinate', 'zinc gluconate'],
        defaultDose: '25 mg',
        timing: 'evening',
        purpose: 'Testosterone support, immune function, wound healing',
        benefits: ['Testosterone optimization', 'Immune modulation', 'Skin health', 'Prostate health'],
        interactions: ['Magnesium', 'Iron', 'Copper'],
        notes: 'Take on an empty stomach or with a small meal. Long-term use >40mg/day requires copper supplementation.',
    },
    {
        name: 'Vitamin C',
        aliases: ['ascorbic acid', 'ascorbate', 'vitamin c'],
        defaultDose: '1000 mg',
        timing: 'morning',
        purpose: 'Antioxidant, collagen synthesis, immune support',
        benefits: ['Collagen synthesis', 'Immune support', 'Iron absorption', 'Oxidative stress reduction'],
        interactions: ['Iron'],
        notes: 'Liposomal form preferred for doses >1g. Avoid high doses pre-workout (may blunt adaptations).',
    },
    {
        name: 'Vitamin B Complex',
        aliases: ['B vitamins', 'B-complex', 'methylated B', 'b12', 'b6', 'folate'],
        defaultDose: '1 capsule',
        timing: 'morning',
        purpose: 'Energy metabolism, methylation, neurotransmitter synthesis',
        benefits: ['Energy metabolism', 'Methylation support', 'Neurological health', 'Stress response'],
        interactions: [],
        notes: 'Use methylated forms (methylfolate, methylcobalamin) for better utilization, especially with MTHFR variants.',
    },
    {
        name: 'Selenium',
        aliases: ['selenomethionine', 'selenium selenate'],
        defaultDose: '200 mcg',
        timing: 'morning',
        purpose: 'Antioxidant enzyme co-factor, thyroid function, immune modulation',
        benefits: ['Glutathione peroxidase activation', 'Thyroid hormone conversion (T4→T3)', 'Cancer risk reduction', 'Immune support'],
        interactions: [],
        notes: 'Selenomethionine is the best-absorbed organic form. Do not exceed 400mcg/day — toxicity risk.',
    },
    {
        name: 'Boron',
        aliases: ['boron glycinate', 'calcium fructoborate'],
        defaultDose: '6 mg',
        timing: 'morning',
        purpose: 'Testosterone optimization, bone density, cognitive function',
        benefits: ['Raises free testosterone and DHT', 'Lowers SHBG', 'Bone mineralization', 'Cognitive function', 'Reduces inflammation'],
        interactions: [],
        notes: '3–10mg/day effective range. Synergistic with magnesium and vitamin D3.',
    },
    {
        name: 'Lutein + Zeaxanthin',
        aliases: ['lutein', 'zeaxanthin', 'marigold extract', 'eye health supplement'],
        defaultDose: '20 mg lutein / 4 mg zeaxanthin',
        timing: 'with-meal',
        purpose: 'Macular pigment, blue light protection, visual acuity',
        benefits: ['Macular degeneration prevention', 'Blue light filtering', 'Visual contrast sensitivity', 'Skin photoprotection'],
        interactions: [],
        notes: 'Fat-soluble — take with a meal. Protective for screen-heavy individuals and outdoor athletes.',
    },

    // -----------------------------------------------
    // Longevity / NAD+ Pathway
    // -----------------------------------------------
    {
        name: 'NMN',
        aliases: ['nicotinamide mononucleotide', 'NMN powder', 'NMN capsule'],
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
        name: 'Fisetin',
        aliases: ['fisetin supplement', 'strawberry fisetin'],
        defaultDose: '100 mg',
        timing: 'with-meal',
        purpose: 'Senolytic — clears senescent cells, NAD+ support, anti-inflammatory',
        benefits: ['Senescent cell clearance', 'Neurogenesis support', 'Anti-aging', 'Anti-inflammatory', 'NAD+ support'],
        interactions: [],
        notes: 'Most potent senolytic among polyphenols (stronger than quercetin in studies). Pulse dosing: 500mg–1000mg for 2–3 consecutive days monthly more effective than daily low dose.',
    },
    {
        name: 'Quercetin',
        aliases: ['quercetin dihydrate', 'quercetin phytosome'],
        defaultDose: '500 mg',
        timing: 'with-meal',
        purpose: 'Senolytic, anti-inflammatory, antioxidant, immune modulator',
        benefits: ['Senescent cell clearance', 'Mast cell stabilization', 'Antioxidant', 'Antiviral', 'AMPK activation'],
        interactions: [],
        notes: 'Phytosome form has dramatically better bioavailability than standard quercetin. Often stacked with Fisetin. Inhibits zinc ionophore — synergistic with zinc for antiviral effects.',
    },
    {
        name: 'Spermidine',
        aliases: ['spermidine trihydrochloride', 'wheat germ extract spermidine'],
        defaultDose: '1 mg',
        timing: 'morning',
        purpose: 'Autophagy inducer — cellular recycling, longevity pathway activation',
        benefits: ['Autophagy induction (mTOR inhibition)', 'Cardiovascular health', 'Hair and nail growth', 'Neuroprotection', 'Anti-aging'],
        interactions: [],
        notes: 'Endogenous polyamine that declines with age. 1–5mg effective range. Found naturally in aged cheese and wheat germ at lower concentrations.',
    },
    {
        name: 'Apigenin',
        aliases: ['apigenin supplement', 'chamomile apigenin'],
        defaultDose: '50 mg',
        timing: 'bedtime',
        purpose: 'CD38 inhibitor, NAD+ protector, anxiolytic, sleep support',
        benefits: ['Inhibits CD38 (major NAD+ consumer)', 'Amplifies NMN/NR effectiveness', 'Mild sedation', 'Anti-inflammatory', 'Aromatase inhibition'],
        interactions: [],
        notes: "Andrew Huberman stack: 50mg apigenin at bedtime for sleep. Synergistic with NMN by blocking CD38-mediated NAD+ degradation.",
    },
    {
        name: 'CoQ10 (Ubiquinol)',
        aliases: ['CoQ10', 'ubiquinol', 'coenzyme Q10', 'ubiquinone'],
        defaultDose: '200 mg',
        timing: 'with-meal',
        purpose: 'Mitochondrial electron transport, antioxidant protection',
        benefits: ['Mitochondrial energy production', 'Antioxidant protection', 'Cardiovascular support', 'Statin side-effect mitigation'],
        interactions: ['Statins', 'blood thinners'],
        notes: 'Ubiquinol is the reduced, active form — better absorbed than ubiquinone, especially over age 40.',
    },

    // -----------------------------------------------
    // Metabolic / Blood Sugar
    // -----------------------------------------------
    {
        name: 'Berberine',
        aliases: ['berberine HCl', 'berberine hydrochloride'],
        defaultDose: '500 mg',
        timing: 'with-meal',
        purpose: 'Blood glucose regulation, AMPK activation, metabolic optimization',
        benefits: ['Insulin sensitivity', 'Blood glucose control', 'AMPK activation', 'Gut microbiome support'],
        interactions: ['Metformin', 'blood sugar medications', 'CYP2D6 substrates'],
        notes: 'Functional analogue to Metformin. Cycle 8 weeks on, 4 weeks off to prevent tolerance.',
    },
    {
        name: 'Alpha Lipoic Acid',
        aliases: ['ALA', 'alpha lipoic', 'R-ALA', 'R-alpha lipoic acid'],
        defaultDose: '300 mg',
        timing: 'with-meal',
        purpose: 'Mitochondrial antioxidant, glucose uptake, heavy metal chelation',
        benefits: ['Mitochondrial protection', 'Glucose disposal', 'Neuroprotection', 'Glutathione recycling'],
        interactions: ['blood sugar medications', 'thyroid medications'],
        notes: 'R-ALA is the biologically active form. Take before carbohydrate-rich meals.',
    },

    // -----------------------------------------------
    // Antioxidants / Detox
    // -----------------------------------------------
    {
        name: 'NAC',
        aliases: ['N-Acetyl Cysteine', 'N-acetylcysteine', 'acetylcysteine'],
        defaultDose: '600 mg',
        timing: 'morning',
        purpose: 'Glutathione precursor, mucolytic, detoxification, anti-oxidant',
        benefits: ['Glutathione synthesis', 'Liver protection', 'Lung health', 'Heavy metal chelation', 'OCD/addiction support (NMDA modulation)'],
        interactions: ['nitroglycerin', 'activated charcoal'],
        notes: 'Most effective glutathione precursor (better than direct glutathione supplementation). 1200mg/day studied for OCD and compulsive behaviors.',
    },
    {
        name: 'Glutathione',
        aliases: ['reduced glutathione', 'GSH', 'liposomal glutathione', 'S-acetyl glutathione'],
        defaultDose: '500 mg',
        timing: 'morning',
        purpose: 'Master cellular antioxidant, detoxification, immune function',
        benefits: ['Detoxification of heavy metals and toxins', 'Immune activation', 'Antioxidant protection', 'Skin brightening', 'Mitochondrial protection'],
        interactions: [],
        notes: 'Liposomal or S-acetyl forms have meaningfully better bioavailability than standard reduced glutathione. NAC is often a better value for raising intracellular GSH.',
    },
    {
        name: 'Astaxanthin',
        aliases: ['astaxanthin supplement', 'krill astaxanthin', 'haematococcus pluvialis'],
        defaultDose: '12 mg',
        timing: 'with-meal',
        purpose: 'Exceptionally potent carotenoid antioxidant — photoprotection, anti-inflammatory',
        benefits: ['6000x stronger antioxidant than Vitamin C', 'Skin photoprotection', 'Endurance performance', 'Eye health', 'Anti-inflammatory'],
        interactions: [],
        notes: 'Fat-soluble — take with meal. One of the few antioxidants shown to cross the blood-brain barrier and blood-retinal barrier.',
    },

    // -----------------------------------------------
    // Performance / Body Composition
    // -----------------------------------------------
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
        name: 'Collagen Peptides',
        aliases: ['collagen', 'hydrolyzed collagen', 'collagen powder', 'grass-fed collagen'],
        defaultDose: '15 g',
        timing: 'morning',
        purpose: 'Skin elasticity, joint health, tendon repair',
        benefits: ['Skin hydration and elasticity', 'Joint lubrication', 'Tendon and ligament health', 'Gut lining support'],
        interactions: [],
        notes: 'Take with Vitamin C for maximum collagen synthesis. Works synergistically with GHK-Cu.',
    },
    {
        name: 'Taurine',
        aliases: ['taurine powder', 'taurine capsule'],
        defaultDose: '2 g',
        timing: 'morning',
        purpose: 'Longevity, mitochondrial function, cardiovascular health, exercise performance',
        benefits: ['Mitochondrial biogenesis', 'Cardiovascular protection', 'Longevity signaling (2023 Science paper)', 'Reduces exercise-induced oxidative stress', 'Electrolyte balance'],
        interactions: [],
        notes: 'Recent Science paper (2023) showed taurine supplementation extended lifespan in mice and worms. Naturally declines 80% from age 5 to 60. 3–6g/day studied range.',
    },

    // -----------------------------------------------
    // Cognitive / Nootropic
    // -----------------------------------------------
    {
        name: 'L-Theanine',
        aliases: ['theanine', 'l theanine', 'suntheanine'],
        defaultDose: '200 mg',
        timing: 'morning',
        purpose: 'Anxiolytic, alpha-wave induction, caffeine synergy',
        benefits: ['Calm focus without sedation', 'Synergistic with caffeine (reduces jitters)', 'Alpha brain wave induction', 'Sleep quality at night'],
        interactions: [],
        notes: 'Classic 2:1 ratio with caffeine (200mg L-theanine : 100mg caffeine) for clean cognitive enhancement without anxiety.',
    },
    {
        name: 'Citicoline',
        aliases: ['CDP-Choline', 'citicoline sodium', 'Cognizin'],
        defaultDose: '300 mg',
        timing: 'morning',
        purpose: 'Choline precursor, acetylcholine synthesis, dopamine receptor upregulation',
        benefits: ['Acetylcholine synthesis', 'Dopamine receptor density increase', 'Memory and learning', 'Neuroprotection', 'Reduces dopamine dependency with stimulant use'],
        interactions: [],
        notes: 'Superior to choline bitartrate — also provides cytidine which converts to uridine. Cognizin is the most studied branded form.',
    },
    {
        name: 'Alpha-GPC',
        aliases: ['alpha GPC', 'alpha glycerophosphocholine', 'L-Alpha glycerylphosphorylcholine'],
        defaultDose: '300 mg',
        timing: 'morning',
        purpose: 'Choline precursor, acetylcholine, growth hormone release',
        benefits: ['Highest-bioavailability choline source', 'Acetylcholine synthesis', 'Growth hormone secretion', 'Power output', 'Cognitive function'],
        interactions: [],
        notes: 'Best choline source for crossing the blood-brain barrier. GH secretagogue effect at 1000mg pre-workout. Use citicoline for cognitive, alpha-GPC for athletic performance.',
    },
    {
        name: 'Phosphatidylserine',
        aliases: ['PS', 'phosphatidylserine complex', 'sharp-ps'],
        defaultDose: '300 mg',
        timing: 'morning',
        purpose: 'Cell membrane integrity, cortisol blunting, cognitive function',
        benefits: ['Reduces cortisol after exercise (>600mg)', 'Memory and cognitive function', 'Neuronal membrane fluidity', 'ADHD support'],
        interactions: [],
        notes: 'One of the few supplements with FDA-qualified health claim for cognitive function. Soy-derived or sunflower-derived available.',
    },
    {
        name: 'Lion\'s Mane',
        aliases: ['lions mane', "lion's mane mushroom", 'hericium erinaceus', 'lion mane'],
        defaultDose: '1000 mg',
        timing: 'morning',
        purpose: 'NGF and BDNF stimulation — neurogenesis, cognitive enhancement, nerve repair',
        benefits: ['Nerve growth factor (NGF) production', 'Neurogenesis', 'Cognitive enhancement', 'Peripheral nerve repair', 'Mood improvement'],
        interactions: [],
        notes: 'Full-spectrum fruiting body extract preferred over mycelium-on-grain. 500mg–1500mg effective. Dual extract (water + alcohol) for maximum hericenones and erinacines.',
    },

    // -----------------------------------------------
    // Adaptogenic / Hormonal
    // -----------------------------------------------
    {
        name: 'Ashwagandha',
        aliases: ['KSM-66', 'withania somnifera', 'sensoril', 'ashwagandha root'],
        defaultDose: '600 mg',
        timing: 'bedtime',
        purpose: 'Cortisol regulation, stress adaptation, testosterone support',
        benefits: ['Cortisol reduction', 'Stress resilience', 'Testosterone optimization', 'Sleep quality'],
        interactions: ['thyroid medications', 'immunosuppressants'],
        notes: 'KSM-66 extract has best clinical evidence. Cycle 3 months on, 2 weeks off.',
    },
    {
        name: 'Rhodiola Rosea',
        aliases: ['rhodiola', 'golden root', 'roseroot', 'SHR-5'],
        defaultDose: '400 mg',
        timing: 'morning',
        purpose: 'Adaptogen — fatigue reduction, HPA axis regulation, cognitive resilience',
        benefits: ['Reduces mental and physical fatigue', 'Stress resilience', 'Cognitive performance under stress', 'Exercise performance', 'Anti-depressant effects'],
        interactions: [],
        notes: '3% rosavins + 1% salidroside standardization preferred. Take on empty stomach 30 min before meals. Do not take at night — mildly stimulating.',
    },
    {
        name: 'Cordyceps',
        aliases: ['cordyceps militaris', 'cordyceps sinensis', 'CS-4 cordyceps'],
        defaultDose: '1000 mg',
        timing: 'morning',
        purpose: 'ATP production, VO2 max improvement, adaptogen',
        benefits: ['Increases ATP synthesis', 'Improves VO2 max and endurance', 'Testosterone support', 'Kidney and lung health', 'Anti-fatigue'],
        interactions: [],
        notes: 'Cordyceps militaris (farmed) is preferred over sinensis (wild-harvested) for consistent cordycepin content. Take pre-workout for performance benefits.',
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

    // -----------------------------------------------
    // Sleep
    // -----------------------------------------------
    {
        name: 'Melatonin',
        aliases: ['melatonin extended release', 'melatonin 0.3mg', 'melatonin 5mg'],
        defaultDose: '0.5 mg',
        timing: 'bedtime',
        purpose: 'Circadian rhythm regulation, sleep onset, antioxidant',
        benefits: ['Sleep onset', 'Circadian entrainment', 'Antioxidant at mitochondria', 'Immune modulation'],
        interactions: ['sedatives', 'blood thinners'],
        notes: 'Less is more — 0.3–1mg is physiological. High doses (5–10mg) blunt the signal over time.',
    },
]

export function findSupplement(name: string): SupplementDef | undefined {
    const lower = name.toLowerCase()
    return SUPPLEMENT_DATABASE.find(
        s => s.name.toLowerCase() === lower || s.aliases.some(a => a.toLowerCase() === lower),
    )
}
