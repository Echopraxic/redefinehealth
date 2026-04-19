// -----------------------------------------------
// Core types
// -----------------------------------------------

export type SkinType = 'oily' | 'dry' | 'combination' | 'normal' | 'unknown'

export type SkinCondition =
    | 'acne'
    | 'rosacea'
    | 'eczema'
    | 'hyperpigmentation'
    | 'melasma'
    | 'perioral-dermatitis'
    | 'seborrheic-dermatitis'
    | 'psoriasis'
    | 'contact-dermatitis'

export type AssessmentSource = 'hybrid' | 'claude-only'

export type TrendDirection = 'improving' | 'declining' | 'stable' | 'insufficient_data'

// -----------------------------------------------
// Scoring — 7 observable dimensions, each 1–10
// -----------------------------------------------

export interface SkinDimensions {
    clarity:   number   // acne, blemishes, whiteheads
    hydration: number   // dullness, flakiness, shine balance
    texture:   number   // pore visibility, smoothness
    evenness:  number   // hyperpigmentation, dark spots, tone consistency
    radiance:  number   // overall glow, healthy colour
    redness:   number   // rosacea indicators, inflammation (10 = no redness)
    firmness:  number   // visible sagging, fine lines around eyes/mouth
}

export const DIMENSION_LABELS: Record<keyof SkinDimensions, string> = {
    clarity:   'Clarity',
    hydration: 'Hydration',
    texture:   'Texture',
    evenness:  'Evenness',
    radiance:  'Radiance',
    redness:   'Redness',
    firmness:  'Firmness',
}

// Weights used for overall score — clarity and hydration weighted higher
const DIMENSION_WEIGHTS: Record<keyof SkinDimensions, number> = {
    clarity:   0.22,
    hydration: 0.18,
    texture:   0.15,
    evenness:  0.15,
    radiance:  0.13,
    redness:   0.12,
    firmness:  0.05,
}

// -----------------------------------------------
// Assessment record
// -----------------------------------------------

export interface SkinAssessment {
    id:            number
    userId:        string
    photoHash:     string      // SHA-256 hex for deduplication
    assessedAt:    number      // Unix ms
    skinType:      SkinType
    conditions:    SkinCondition[]
    cnnConfidence: number | null  // 0–1, null when CNN not available
    scores:        SkinDimensions
    overallScore:  number         // 0–100 weighted
    aiNotes:       string
    source:        AssessmentSource
}

// -----------------------------------------------
// Trend comparison
// -----------------------------------------------

export interface SkinTrend {
    direction:       TrendDirection
    overallDelta:    number                        // positive = improvement
    dimensionDeltas: Partial<Record<keyof SkinDimensions, number>>
    periodsCompared: number                        // how many assessments in window
    message:         string
}

export interface SkinProgress {
    latest:    SkinAssessment
    prior7d:   SkinAssessment | null
    prior30d:  SkinAssessment | null
    trend7d:   SkinTrend
    trend30d:  SkinTrend
}

// -----------------------------------------------
// Scorer — pure functions
// -----------------------------------------------

export function computeOverallScore(scores: SkinDimensions): number {
    let weighted = 0
    for (const key of Object.keys(scores) as Array<keyof SkinDimensions>) {
        weighted += scores[key] * DIMENSION_WEIGHTS[key]
    }
    // Scale from 1–10 range to 0–100
    return Math.round(weighted * 10)
}

export function compareDimensions(
    latest: SkinDimensions,
    prior: SkinDimensions,
): Partial<Record<keyof SkinDimensions, number>> {
    const deltas: Partial<Record<keyof SkinDimensions, number>> = {}
    for (const key of Object.keys(latest) as Array<keyof SkinDimensions>) {
        const delta = latest[key] - prior[key]
        if (Math.abs(delta) >= 0.5) deltas[key] = Math.round(delta * 10) / 10
    }
    return deltas
}

export function computeTrend(
    latest: SkinAssessment,
    prior: SkinAssessment | null,
    periodsCompared: number,
): SkinTrend {
    if (!prior) {
        return {
            direction:       'insufficient_data',
            overallDelta:    0,
            dimensionDeltas: {},
            periodsCompared,
            message:         'Not enough history yet — keep logging weekly photos to track your trend.',
        }
    }

    const delta = latest.overallScore - prior.overallScore
    const dimensionDeltas = compareDimensions(latest.scores, prior.scores)

    let direction: TrendDirection
    if (Math.abs(delta) < 3)      direction = 'stable'
    else if (delta > 0)           direction = 'improving'
    else                          direction = 'declining'

    const sign = delta > 0 ? '+' : ''
    const message = buildTrendMessage(direction, delta, dimensionDeltas)

    return { direction, overallDelta: delta, dimensionDeltas, periodsCompared, message }
}

function buildTrendMessage(
    direction: TrendDirection,
    delta: number,
    deltas: Partial<Record<keyof SkinDimensions, number>>,
): string {
    const sign = delta > 0 ? '+' : ''

    if (direction === 'stable') {
        return `Holding steady — consistent protocol is working.`
    }

    const movers = Object.entries(deltas) as [keyof SkinDimensions, number][]
    const top = movers.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2)
    const highlights = top
        .map(([dim, d]) => `${DIMENSION_LABELS[dim]} ${d > 0 ? 'up' : 'down'} ${Math.abs(d).toFixed(1)}`)
        .join(', ')

    if (direction === 'improving') {
        return `Overall ${sign}${delta} pts — ${highlights || 'broad improvement across dimensions'}.`
    }
    return `Overall ${sign}${delta} pts — ${highlights || 'decline across dimensions'}. Check recent protocol changes.`
}

// -----------------------------------------------
// iMessage formatting
// -----------------------------------------------

const SCORE_ICON = (score: number): string => {
    if (score >= 8) return '🟢'
    if (score >= 6) return '🟡'
    if (score >= 4) return '🟠'
    return '🔴'
}

const TREND_ICON: Record<TrendDirection, string> = {
    improving:        '📈',
    declining:        '📉',
    stable:           '➡️',
    insufficient_data: '📊',
}

export function formatAssessmentMessage(
    assessment: SkinAssessment,
    trend: SkinTrend,
): string {
    const lines: string[] = [
        `🧴 Skin Assessment — Score ${assessment.overallScore}/100`,
        '',
    ]

    // Condition detection
    if (assessment.skinType !== 'unknown') {
        lines.push(`Skin type: ${assessment.skinType.charAt(0).toUpperCase() + assessment.skinType.slice(1)}`)
    }
    if (assessment.conditions.length > 0) {
        lines.push(`Conditions detected: ${assessment.conditions.join(', ')}`)
    }
    lines.push('')

    // Dimension breakdown
    lines.push('Dimension scores:')
    for (const [key, label] of Object.entries(DIMENSION_LABELS) as [keyof SkinDimensions, string][]) {
        const score = assessment.scores[key]
        const delta = trend.dimensionDeltas[key]
        const changeStr = delta !== undefined ? ` (${delta > 0 ? '+' : ''}${delta})` : ''
        lines.push(`  ${SCORE_ICON(score)} ${label}: ${score}/10${changeStr}`)
    }
    lines.push('')

    // Trend
    lines.push(`${TREND_ICON[trend.direction]} ${trend.message}`)
    lines.push('')

    // AI narrative
    if (assessment.aiNotes) lines.push(assessment.aiNotes)

    return lines.join('\n').trimEnd()
}

export function formatProgressTimeline(assessments: SkinAssessment[]): string {
    if (assessments.length === 0) return 'No skin assessments yet — send a selfie to get started.'

    const lines = ['📅 Skin Score History\n']
    const recent = [...assessments].sort((a, b) => b.assessedAt - a.assessedAt).slice(0, 6)

    for (let i = 0; i < recent.length; i++) {
        const a = recent[i]!
        const prev = recent[i + 1]
        const delta = prev ? a.overallScore - prev.overallScore : null
        const deltaStr = delta !== null ? ` (${delta > 0 ? '+' : ''}${delta})` : ''
        const date = new Date(a.assessedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        lines.push(`${SCORE_ICON(a.overallScore / 10)} ${date}: ${a.overallScore}/100${deltaStr}`)
    }

    const best = [...assessments].sort((a, b) => b.overallScore - a.overallScore)[0]!
    lines.push(`\n🏆 Best score: ${best.overallScore}/100 on ${new Date(best.assessedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)

    return lines.join('\n')
}
