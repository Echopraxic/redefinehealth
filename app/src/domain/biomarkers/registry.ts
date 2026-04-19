import type { BiomarkerDefinition } from './types.ts'

// -----------------------------------------------
// Marker registry — evidence-based reference ranges
// Sources: LabCorp/Quest standard ranges, Attia P4 medicine targets,
//          AHA/ACC cardiovascular guidelines, Endocrine Society guidelines
// -----------------------------------------------

const MARKERS: BiomarkerDefinition[] = [
    // -----------------------------------------------
    // Performance
    // -----------------------------------------------
    {
        name: 'hrv',
        displayName: 'Heart Rate Variability',
        unit: 'ms',
        category: 'performance',
        referenceRange: { low: 20, high: 200, optimalLow: 50, optimalHigh: 200 },
        higherIsBetter: true,
        description: 'RMSSD measured by wearable. Highly individual — trend matters more than absolute value.',
    },
    {
        name: 'resting_hr',
        displayName: 'Resting Heart Rate',
        unit: 'bpm',
        category: 'performance',
        referenceRange: { low: 40, high: 100, optimalLow: 40, optimalHigh: 65 },
        higherIsBetter: false,
        description: 'Measured on waking before getting out of bed.',
    },
    {
        name: 'vo2_max',
        displayName: 'VO2 Max',
        unit: 'ml/kg/min',
        category: 'performance',
        referenceRange: { low: 20, high: 80, optimalLow: 45, optimalHigh: 80 },
        higherIsBetter: true,
        description: 'Maximal aerobic capacity. Top longevity predictor after age 40.',
    },

    // -----------------------------------------------
    // Hormones
    // -----------------------------------------------
    {
        name: 'testosterone_total',
        displayName: 'Testosterone (Total)',
        unit: 'ng/dL',
        category: 'hormones',
        referenceRange: { low: 264, high: 916, optimalLow: 500, optimalHigh: 900 },
        higherIsBetter: true,
        description: 'Total testosterone. Optimal performance range is upper third of normal.',
    },
    {
        name: 'testosterone_free',
        displayName: 'Testosterone (Free)',
        unit: 'pg/mL',
        category: 'hormones',
        referenceRange: { low: 35, high: 155, optimalLow: 80, optimalHigh: 155 },
        higherIsBetter: true,
        description: 'Bioavailable fraction. More actionable than total when SHBG is elevated.',
    },
    {
        name: 'igf1',
        displayName: 'IGF-1',
        unit: 'ng/mL',
        category: 'hormones',
        referenceRange: { low: 88, high: 246, optimalLow: 150, optimalHigh: 220 },
        higherIsBetter: true,
        description: 'Growth hormone proxy. Rises during GH peptide cycles (Ipamorelin, Sermorelin).',
    },
    {
        name: 'dhea_s',
        displayName: 'DHEA-S',
        unit: 'μg/dL',
        category: 'hormones',
        referenceRange: { low: 80, high: 560, optimalLow: 200, optimalHigh: 450 },
        higherIsBetter: true,
        description: 'Adrenal androgen. Declines ~2% per year after 25. Epithalon may modulate.',
    },
    {
        name: 'cortisol_am',
        displayName: 'Cortisol (AM)',
        unit: 'μg/dL',
        category: 'hormones',
        referenceRange: { low: 6, high: 23, optimalLow: 10, optimalHigh: 18 },
        higherIsBetter: false,
        description: 'Morning cortisol (collected 7–9am). Chronically elevated cortisol suppresses testosterone and disrupts sleep.',
    },

    // -----------------------------------------------
    // Cardiovascular
    // -----------------------------------------------
    {
        name: 'ldl',
        displayName: 'LDL Cholesterol',
        unit: 'mg/dL',
        category: 'cardiovascular',
        referenceRange: { low: 0, high: 130, optimalLow: 0, optimalHigh: 100 },
        higherIsBetter: false,
        description: 'LDL-C. Optimal for longevity is <100; <70 if cardiovascular risk factors present.',
    },
    {
        name: 'hdl',
        displayName: 'HDL Cholesterol',
        unit: 'mg/dL',
        category: 'cardiovascular',
        referenceRange: { low: 40, high: 100, optimalLow: 60, optimalHigh: 100 },
        higherIsBetter: true,
        description: 'Protective lipoprotein. Fish oil and exercise are most reliable elevators.',
    },
    {
        name: 'triglycerides',
        displayName: 'Triglycerides',
        unit: 'mg/dL',
        category: 'cardiovascular',
        referenceRange: { low: 0, high: 150, optimalLow: 0, optimalHigh: 80 },
        higherIsBetter: false,
        description: 'Driven by refined carbs and fructose. Berberine and fish oil reduce significantly.',
    },
    {
        name: 'bp_systolic',
        displayName: 'Blood Pressure (Systolic)',
        unit: 'mmHg',
        category: 'cardiovascular',
        referenceRange: { low: 90, high: 130, optimalLow: 100, optimalHigh: 120 },
        higherIsBetter: false,
        description: 'Top number. Optimal <120 for longevity per SPRINT trial.',
    },
    {
        name: 'bp_diastolic',
        displayName: 'Blood Pressure (Diastolic)',
        unit: 'mmHg',
        category: 'cardiovascular',
        referenceRange: { low: 60, high: 85, optimalLow: 65, optimalHigh: 80 },
        higherIsBetter: false,
        description: 'Bottom number. <80 is the longevity target.',
    },

    // -----------------------------------------------
    // Inflammation
    // -----------------------------------------------
    {
        name: 'crp_hs',
        displayName: 'hsCRP',
        unit: 'mg/L',
        category: 'inflammation',
        referenceRange: { low: 0, high: 3, optimalLow: 0, optimalHigh: 1 },
        higherIsBetter: false,
        description: 'High-sensitivity CRP. Best cardiovascular and all-cause mortality predictor in inflammation panel.',
    },
    {
        name: 'homocysteine',
        displayName: 'Homocysteine',
        unit: 'μmol/L',
        category: 'inflammation',
        referenceRange: { low: 0, high: 15, optimalLow: 0, optimalHigh: 9 },
        higherIsBetter: false,
        description: 'Methylation marker. Elevated by low B12/folate. B-complex and TMG reliably lower it.',
    },

    // -----------------------------------------------
    // Vitamins & Minerals
    // -----------------------------------------------
    {
        name: 'vitamin_d',
        displayName: 'Vitamin D (25-OH)',
        unit: 'ng/mL',
        category: 'vitamins-minerals',
        referenceRange: { low: 30, high: 100, optimalLow: 50, optimalHigh: 80 },
        higherIsBetter: true,
        description: '25-hydroxyvitamin D. Most people are deficient. Optimal is 50–80 ng/mL.',
    },
    {
        name: 'ferritin',
        displayName: 'Ferritin',
        unit: 'ng/mL',
        category: 'vitamins-minerals',
        referenceRange: { low: 30, high: 300, optimalLow: 50, optimalHigh: 150 },
        higherIsBetter: false,
        description: 'Iron storage. Both extremes are harmful. High ferritin is an inflammation marker.',
    },

    // -----------------------------------------------
    // Metabolic
    // -----------------------------------------------
    {
        name: 'hba1c',
        displayName: 'HbA1c',
        unit: '%',
        category: 'metabolic',
        referenceRange: { low: 4, high: 5.7, optimalLow: 4, optimalHigh: 5.2 },
        higherIsBetter: false,
        description: '3-month glucose average. <5.2% is the longevity target; >5.7% is pre-diabetic.',
    },
    {
        name: 'fasting_glucose',
        displayName: 'Fasting Glucose',
        unit: 'mg/dL',
        category: 'metabolic',
        referenceRange: { low: 70, high: 100, optimalLow: 72, optimalHigh: 90 },
        higherIsBetter: false,
        description: 'Fasting blood sugar. Berberine and Metformin lower effectively. Collect after 10h fast.',
    },
]

// -----------------------------------------------
// Lookup helpers
// -----------------------------------------------

const MARKER_MAP = new Map<string, BiomarkerDefinition>(MARKERS.map(m => [m.name, m]))

export function findMarker(name: string): BiomarkerDefinition | null {
    return MARKER_MAP.get(name.toLowerCase()) ?? null
}

export function allMarkers(): BiomarkerDefinition[] {
    return MARKERS
}

export function markerNames(): string[] {
    return MARKERS.map(m => m.name)
}
