// -----------------------------------------------
// Value types
// -----------------------------------------------

export type BiomarkerSource = 'manual' | 'apple-health' | 'lab-upload'

export type BiomarkerCategory =
    | 'hormones'
    | 'metabolic'
    | 'cardiovascular'
    | 'inflammation'
    | 'vitamins-minerals'
    | 'performance'

export type TrendDirection = 'improving' | 'declining' | 'stable' | 'insufficient_data'

// -----------------------------------------------
// Core interfaces
// -----------------------------------------------

export interface BiomarkerEntry {
    id: number
    userId: string
    markerName: string
    value: number
    unit: string
    source: BiomarkerSource
    notes?: string
    recordedAt: number   // Unix ms
}

export interface ReferenceRange {
    low: number
    high: number
    optimalLow?: number  // tighter optimal band within normal
    optimalHigh?: number
}

export interface BiomarkerDefinition {
    name: string
    displayName: string
    unit: string
    category: BiomarkerCategory
    referenceRange: ReferenceRange
    higherIsBetter: boolean   // used to determine trend direction sign
    description: string
}

// -----------------------------------------------
// Analysis output
// -----------------------------------------------

export interface BiomarkerTrend {
    markerName: string
    displayName: string
    direction: TrendDirection
    percentChange: number    // signed, from perspective of "better" direction
    latest: number
    unit: string
    readings: number
    inRange: boolean
    inOptimal: boolean
}

export interface BiomarkerAlert {
    markerName: string
    displayName: string
    value: number
    unit: string
    severity: 'critical' | 'warning'
    message: string
}

export interface BiomarkerSnapshot {
    markerName: string
    displayName: string
    value: number
    unit: string
    source: BiomarkerSource
    recordedAt: number
    inRange: boolean
    inOptimal: boolean
}
