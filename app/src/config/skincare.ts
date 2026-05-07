import type { SkincareStep, SkincareRoutine } from '../domain/user-profile.ts'

export interface SkincareDef {
    name: string
    aliases: string[]
    step: SkincareStep
    routine: SkincareRoutine
    purpose: string
    benefits: string[]
    /** Ingredient names that should NOT be layered with this product */
    interactions: string[]
    notes?: string
}

export const SKINCARE_DATABASE: SkincareDef[] = [
    // -----------------------------------------------
    // Hydration
    // -----------------------------------------------
    {
        name: 'Hyaluronic Acid',
        aliases: ['HA', 'hyaluronate', 'sodium hyaluronate', 'hyaluronic acid serum'],
        step: 'serum',
        routine: 'both',
        purpose: 'Humectant hydration — draws moisture into skin at multiple depths',
        benefits: ['Plumping and volumizing', 'Barrier moisture retention', 'Wound healing support', 'Reduces fine lines via hydration'],
        interactions: [],
        notes: 'Apply to damp skin and seal with moisturizer — humectants pull moisture from the environment and dermis if the air is too dry.',
    },
    {
        name: 'Squalane',
        aliases: ['squalane oil', 'sugarcane squalane'],
        step: 'oil',
        routine: 'both',
        purpose: 'Lightweight emollient — replenishes skin-identical lipids without clogging pores',
        benefits: ['Barrier repair', 'Locks in hydration', 'Non-comedogenic', 'Antioxidant stability'],
        interactions: [],
        notes: 'Apply after water-based serums, before or mixed into moisturizer. Stable and non-oxidizing unlike most plant oils.',
    },
    {
        name: 'Snail Mucin',
        aliases: ['snail secretion filtrate', 'COSRX snail', 'snail mucin serum'],
        step: 'serum',
        routine: 'both',
        purpose: 'Multi-functional repair serum — hydration, regeneration, and soothing',
        benefits: ['Wound healing acceleration', 'Collagen stimulation', 'Hydration', 'Calming redness', 'Scar fading'],
        interactions: [],
        notes: 'Layering-friendly. Works well with most actives. Can be used morning and evening.',
    },

    // -----------------------------------------------
    // Antioxidants
    // -----------------------------------------------
    {
        name: 'Vitamin C Serum',
        aliases: ['L-ascorbic acid', 'ascorbic acid', 'vitamin C', 'vit C serum', 'ascorbyl glucoside', 'MAP vitamin C'],
        step: 'serum',
        routine: 'morning',
        purpose: 'Antioxidant defense, brightening, collagen stimulation',
        benefits: ['Neutralizes UV-generated free radicals', 'Brightens hyperpigmentation', 'Stimulates collagen synthesis', 'Photoprotection synergy with SPF'],
        interactions: ['Retinol', 'Tretinoin', 'Retinaldehyde', 'Glycolic Acid', 'Lactic Acid', 'Salicylic Acid', 'Copper Peptide Serum', 'Niacinamide'],
        notes: 'L-ascorbic acid requires pH <3.5 to be effective — keep away from high-pH products. Apply before SPF. Stable derivatives (MAP, ascorbyl glucoside) are less irritating but weaker.',
    },
    {
        name: 'Ferulic Acid',
        aliases: ['ferulic', 'ferulic acid serum'],
        step: 'serum',
        routine: 'morning',
        purpose: 'Antioxidant potentiator — stabilizes and doubles the efficacy of Vitamin C and E',
        benefits: ['Doubles photoprotection of Vit C+E', 'Stabilizes ascorbic acid', 'Free radical scavenging', 'Mild anti-aging effects standalone'],
        interactions: [],
        notes: 'Rarely used alone — almost always combined with Vitamin C (15%) + Vitamin E (1%) + Ferulic Acid (0.5%) as the gold-standard antioxidant serum. Apply in the morning before SPF.',
    },
    {
        name: 'Astaxanthin Serum',
        aliases: ['astaxanthin topical', 'astaxanthin cream'],
        step: 'serum',
        routine: 'both',
        purpose: 'Exceptionally potent carotenoid antioxidant — 6000x stronger than Vitamin C topically',
        benefits: ['UV protection amplification', 'Anti-inflammatory', 'Collagen protection', 'Photoaging prevention'],
        interactions: [],
        notes: 'One of the most potent topical antioxidants available. Layer under sunscreen in the morning.',
    },

    // -----------------------------------------------
    // Retinoids
    // -----------------------------------------------
    {
        name: 'Retinol',
        aliases: ['retinol serum', 'retinol cream', 'vitamin A', 'OTC retinol'],
        step: 'treatment',
        routine: 'evening',
        purpose: 'OTC retinoid — gold-standard anti-aging, acne, and skin renewal',
        benefits: ['Increases cell turnover', 'Stimulates collagen', 'Reduces fine lines', 'Clears acne', 'Fades hyperpigmentation'],
        interactions: ['Glycolic Acid', 'Lactic Acid', 'Mandelic Acid', 'Salicylic Acid', 'Benzoyl Peroxide', 'Vitamin C Serum', 'Copper Peptide Serum', 'AHA', 'BHA'],
        notes: 'Start 1–2x/week, increase frequency slowly over 8–12 weeks. Apply to dry skin (buffer with moisturizer if sensitive). Use SPF daily — increases photosensitivity.',
    },
    {
        name: 'Tretinoin',
        aliases: ['Retin-A', 'retinoic acid', 'tretinoin cream', 'tretinoin gel', 'Renova'],
        step: 'treatment',
        routine: 'evening',
        purpose: 'Prescription retinoic acid — the most clinically validated anti-aging compound',
        benefits: ['Maximum collagen induction', 'FDA-approved for wrinkles and photodamage', 'Acne clearance', 'Skin renewal', 'Hyperpigmentation correction'],
        interactions: ['Glycolic Acid', 'Lactic Acid', 'Salicylic Acid', 'Benzoyl Peroxide', 'Vitamin C Serum', 'Copper Peptide Serum', 'AHA', 'BHA', 'Niacinamide'],
        notes: 'Requires prescription. Purge phase 4–8 weeks. Apply pea-size to entire face. SPF is non-negotiable. Most irritating retinoid — moisturizer sandwich technique helps.',
    },
    {
        name: 'Retinaldehyde',
        aliases: ['retinal', 'retinaldehyde serum', 'RALD'],
        step: 'treatment',
        routine: 'evening',
        purpose: 'Retinoid one conversion step from retinoic acid — near-prescription efficacy with less irritation',
        benefits: ['11x more potent than retinol', 'Collagen stimulation', 'Anti-aging', 'Acne treatment', 'Less irritating than tretinoin'],
        interactions: ['Glycolic Acid', 'Lactic Acid', 'Salicylic Acid', 'Benzoyl Peroxide', 'Vitamin C Serum', 'AHA', 'BHA'],
        notes: 'The sweet spot between OTC retinol and prescription tretinoin. 0.05–0.1% is standard. Apply to dry skin. Refrigerate for stability.',
    },
    {
        name: 'Adapalene',
        aliases: ['Differin', 'adapalene gel', 'adapalene 0.1%'],
        step: 'treatment',
        routine: 'evening',
        purpose: 'Third-generation synthetic retinoid — primarily anti-acne with lower irritation profile',
        benefits: ['Acne prevention and clearance', 'Anti-comedogenic', 'Mild anti-aging', 'Better tolerated than tretinoin'],
        interactions: ['Benzoyl Peroxide', 'Glycolic Acid', 'Salicylic Acid', 'AHA', 'BHA'],
        notes: 'OTC in US (Differin). Best retinoid for acne-prone or sensitive skin. Can combine with benzoyl peroxide in the morning / adapalene in the evening.',
    },
    {
        name: 'Bakuchiol',
        aliases: ['bakuchiol serum', 'bakuchiol oil', 'psoralea corylifolia'],
        step: 'treatment',
        routine: 'both',
        purpose: 'Plant-derived retinol functional analogue — retinoid-like benefits without photosensitivity',
        benefits: ['Cell turnover increase', 'Collagen stimulation', 'Anti-aging', 'Pregnancy-safe retinol alternative', 'Can be used AM and PM'],
        interactions: [],
        notes: 'Suitable during pregnancy (unlike retinoids). Can be used morning and evening. Stacks well with vitamin C and AHAs unlike true retinoids.',
    },

    // -----------------------------------------------
    // Exfoliants
    // -----------------------------------------------
    {
        name: 'Glycolic Acid',
        aliases: ['glycolic', 'AHA toner', 'glycolic acid toner', 'glycolic peel'],
        step: 'treatment',
        routine: 'evening',
        purpose: 'Alpha hydroxy acid — chemical exfoliation, texture refinement, brightening',
        benefits: ['Surface cell turnover', 'Texture smoothing', 'Brightening', 'Stimulates collagen at higher concentrations', 'Enhances penetration of subsequent products'],
        interactions: ['Retinol', 'Tretinoin', 'Retinaldehyde', 'Vitamin C Serum', 'Salicylic Acid', 'Benzoyl Peroxide', 'Copper Peptide Serum'],
        notes: 'Smallest AHA — deepest penetration. 5–10% for daily use; 20–30% for weekly peels. Increases photosensitivity — SPF mandatory.',
    },
    {
        name: 'Lactic Acid',
        aliases: ['lactic acid serum', 'lactic acid toner', 'AHA lactic'],
        step: 'treatment',
        routine: 'evening',
        purpose: 'Gentle AHA exfoliant — hydrating, brightening, NMF stimulation',
        benefits: ['Exfoliation with hydrating properties', 'Brightening', 'Barrier improvement via NMF stimulation', 'Hyperpigmentation fading'],
        interactions: ['Retinol', 'Tretinoin', 'Vitamin C Serum', 'Copper Peptide Serum'],
        notes: 'Gentler than glycolic. Good entry-point AHA for sensitive skin. Larger molecule = less penetration, less irritation.',
    },
    {
        name: 'Salicylic Acid',
        aliases: ['BHA', 'salicylic', 'salicylic acid toner', 'salicylic cleanser', 'BHA exfoliant'],
        step: 'treatment',
        routine: 'evening',
        purpose: 'Beta hydroxy acid — oil-soluble exfoliant, pore clearing, anti-acne',
        benefits: ['Penetrates pores to dissolve sebum', 'Acne prevention', 'Blackhead and whitehead clearing', 'Anti-inflammatory', 'Mild exfoliation'],
        interactions: ['Retinol', 'Tretinoin', 'Glycolic Acid', 'Vitamin C Serum'],
        notes: '0.5–2% for leave-on use. Oil-soluble — the only exfoliant that actually gets inside pores. Ideal for oily, acne-prone, or congested skin.',
    },
    {
        name: 'Mandelic Acid',
        aliases: ['mandelic', 'mandelic acid serum'],
        step: 'treatment',
        routine: 'evening',
        purpose: 'Gentle large-molecule AHA — brightening and mild exfoliation for sensitive skin',
        benefits: ['Hyperpigmentation fading', 'Gentle exfoliation', 'Anti-bacterial properties', 'Suitable for darker skin tones (lower PIH risk)'],
        interactions: ['Retinol', 'Tretinoin', 'Vitamin C Serum'],
        notes: 'Largest AHA molecule = least penetration = most tolerable. Good for sensitive skin or skin of color where glycolic causes PIH.',
    },
    {
        name: 'Azelaic Acid',
        aliases: ['azelaic acid cream', 'azelaic acid gel', 'azelaic serum', 'Finacea', 'Skinoren'],
        step: 'treatment',
        routine: 'both',
        purpose: 'Multi-target treatment — rosacea, acne, hyperpigmentation, brightening',
        benefits: ['Reduces redness and rosacea', 'Fades hyperpigmentation via tyrosinase inhibition', 'Anti-acne', 'Anti-inflammatory', 'Pregnancy-safe'],
        interactions: [],
        notes: 'One of the most versatile actives. Can be used AM and PM. 10% OTC; 15–20% prescription. Pregnancy-safe. Excellent for rosacea and post-inflammatory hyperpigmentation.',
    },

    // -----------------------------------------------
    // Brightening / Pigmentation
    // -----------------------------------------------
    {
        name: 'Niacinamide',
        aliases: ['niacinamide serum', 'vitamin B3', 'niacin amide', 'nicotinamide'],
        step: 'serum',
        routine: 'both',
        purpose: 'Barrier strengthening, pore minimizing, brightening, anti-inflammatory',
        benefits: ['Reduces pore appearance', 'Brightening via melanin transfer inhibition', 'Strengthens skin barrier', 'Reduces excess sebum', 'Anti-inflammatory for acne', 'Reduces fine lines'],
        interactions: ['Vitamin C Serum', 'Tretinoin'],
        notes: 'One of the most well-tolerated and multi-functional ingredients. 5–10% is the effective range. Myth: niacinamide + vitamin C causes flushing — only relevant at very high concentrations with niacin contamination.',
    },
    {
        name: 'Alpha Arbutin',
        aliases: ['alpha-arbutin', 'arbutin', 'alpha arbutin serum'],
        step: 'serum',
        routine: 'both',
        purpose: 'Stable tyrosinase inhibitor — fades dark spots and hyperpigmentation',
        benefits: ['Hyperpigmentation correction', 'Dark spot fading', 'Brightening', 'Stable and non-irritating'],
        interactions: [],
        notes: '2% alpha arbutin is the clinical standard. Works synergistically with Vitamin C and niacinamide for brightening. More stable and less risky than hydroquinone.',
    },
    {
        name: 'Tranexamic Acid',
        aliases: ['TXA', 'tranexamic acid serum'],
        step: 'serum',
        routine: 'both',
        purpose: 'Plasminogen inhibitor — disrupts melanin synthesis pathway for stubborn pigmentation',
        benefits: ['Melasma treatment', 'Post-inflammatory hyperpigmentation', 'Brightening', 'Redness reduction', 'Works on multiple pigmentation pathways'],
        interactions: [],
        notes: '3–5% effective concentration. Works differently from arbutin/Vit C — targets the UV-melanocyte signaling pathway. Excellent for melasma and Asian skin tones.',
    },
    {
        name: 'Kojic Acid',
        aliases: ['kojic acid serum', 'kojic acid cream'],
        step: 'serum',
        routine: 'evening',
        purpose: 'Fungal-derived tyrosinase inhibitor — brightening and dark spot treatment',
        benefits: ['Dark spot fading', 'Brightening', 'Hyperpigmentation treatment', 'Antifungal properties'],
        interactions: ['Glycolic Acid'],
        notes: '1–2% effective range. Can cause contact dermatitis — patch test first. Often combined with glycolic acid or vitamin C for enhanced pigmentation control.',
    },

    // -----------------------------------------------
    // Barrier / Repair
    // -----------------------------------------------
    {
        name: 'Ceramide Moisturizer',
        aliases: ['ceramide cream', 'ceramide lotion', 'CeraVe', 'ceramide barrier cream'],
        step: 'moisturizer',
        routine: 'both',
        purpose: 'Barrier repair and maintenance — replenishes structural lipids',
        benefits: ['Restores compromised skin barrier', 'Locks in hydration', 'Reduces transepidermal water loss (TEWL)', 'Calms irritation from actives'],
        interactions: [],
        notes: 'Critical for anyone using retinoids or AHAs. Ceramides 1, 3, and 6-II most important. Use as the final step to seal the barrier.',
    },
    {
        name: 'Centella Asiatica',
        aliases: ['cica', 'centella', 'gotu kola', 'CICA cream', 'madecassoside', 'asiaticoside'],
        step: 'serum',
        routine: 'both',
        purpose: 'Wound-healing botanical — calming, barrier repair, collagen stimulation',
        benefits: ['Wound healing acceleration', 'Redness and sensitivity reduction', 'Collagen stimulation', 'Barrier support', 'Post-procedure recovery'],
        interactions: [],
        notes: 'Excellent alongside retinoids and AHAs to reduce irritation. Active compounds: madecassoside, asiaticoside, asiatic acid.',
    },
    {
        name: 'Rosehip Oil',
        aliases: ['rosehip seed oil', 'rosehip'],
        step: 'oil',
        routine: 'evening',
        purpose: 'Nutrient-rich facial oil — vitamin A, C, and essential fatty acids for regeneration',
        benefits: ['Scar fading', 'Anti-aging', 'Hyperpigmentation fading', 'Barrier repair', 'Rich in linoleic acid for acne-prone skin'],
        interactions: [],
        notes: 'High in vitamin A (retinol precursors) — avoid layering with prescription retinoids. Cold-pressed, unrefined preferred. Refrigerate to prevent oxidation.',
    },

    // -----------------------------------------------
    // Peptide / Regenerative
    // -----------------------------------------------
    {
        name: 'Peptide Serum',
        aliases: ['matrixyl', 'argireline', 'peptide cream', 'multi-peptide serum', 'copper tripeptide serum'],
        step: 'serum',
        routine: 'both',
        purpose: 'Signal peptides — communicate with fibroblasts to increase collagen and elastin production',
        benefits: ['Collagen stimulation', 'Fine line reduction', 'Elasticity improvement', 'Non-irritating anti-aging'],
        interactions: ['Glycolic Acid', 'Lactic Acid', 'Salicylic Acid'],
        notes: 'Matrixyl 3000 (palmitoyl tripeptide-1 + palmitoyl tetrapeptide-7) is best studied. Avoid layering directly with acidic products (pH denatures peptide bonds). Apply after toning.',
    },
    {
        name: 'Copper Peptide Serum',
        aliases: ['GHK-Cu topical', 'copper peptide', 'blue copper peptide', 'copper serum'],
        step: 'serum',
        routine: 'evening',
        purpose: 'Copper-tripeptide regeneration — collagen synthesis, wound healing, anti-aging',
        benefits: ['Collagen and elastin stimulation', 'Wound healing', 'Skin tightening', 'Antioxidant via SOD upregulation', 'Scar remodeling'],
        interactions: ['Vitamin C Serum', 'Glycolic Acid', 'Lactic Acid', 'Salicylic Acid', 'Retinol', 'Tretinoin'],
        notes: 'Vitamin C oxidizes the copper and deactivates GHK-Cu — never layer these. Use copper peptides in PM, Vitamin C in AM. AHAs can destabilize the peptide.',
    },

    // -----------------------------------------------
    // SPF
    // -----------------------------------------------
    {
        name: 'Sunscreen',
        aliases: ['SPF', 'sunscreen', 'SPF 50', 'mineral sunscreen', 'chemical sunscreen', 'broad spectrum SPF'],
        step: 'spf',
        routine: 'morning',
        purpose: 'UV protection — the single most evidence-backed anti-aging intervention',
        benefits: ['Prevents photoaging', 'Reduces skin cancer risk', 'Preserves collagen', 'Prevents hyperpigmentation', 'Protects active ingredient results'],
        interactions: [],
        notes: 'SPF 30+ broad-spectrum, every morning regardless of weather. Last step of AM routine. Reapply every 2 hours outdoors. Non-negotiable with any retinoid use.',
    },

    // -----------------------------------------------
    // Acne-specific
    // -----------------------------------------------
    {
        name: 'Benzoyl Peroxide',
        aliases: ['BPO', 'benzoyl peroxide wash', 'BP gel', 'benzoyl peroxide cream'],
        step: 'treatment',
        routine: 'evening',
        purpose: 'Antibacterial keratolytic — kills P. acnes bacteria, unclogs pores',
        benefits: ['Kills acne-causing bacteria', 'Reduces inflammatory acne', 'Prevents antibiotic resistance', 'Keratolytic exfoliation'],
        interactions: ['Retinol', 'Tretinoin', 'Retinaldehyde', 'Glycolic Acid'],
        notes: '2.5% is as effective as 5–10% with less irritation. Bleaches fabric — use white pillowcase. Can combine with adapalene (AM benzoyl peroxide / PM adapalene). Deactivates retinol.',
    },
]

export function findSkincare(name: string): SkincareDef | undefined {
    const lower = name.toLowerCase()
    return SKINCARE_DATABASE.find(
        s => s.name.toLowerCase() === lower || s.aliases.some(a => a.toLowerCase() === lower),
    )
}
