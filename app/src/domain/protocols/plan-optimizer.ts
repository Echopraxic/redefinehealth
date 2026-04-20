import type { Supplement, PeptideProtocol } from '../user-profile.ts'
import type { ComplianceRecord } from '../compliance/tracker.ts'
import type { BiomarkerTrend } from '../biomarkers/types.ts'

// -----------------------------------------------
// Types
// -----------------------------------------------

export type ProtocolRecommendation =
    | 'continue'
    | 'review-dose'
    | 'improve-timing'
    | 'address-adherence'
    | 'pause-consider'
    | 'titrate-up'

export interface ProtocolScore {
    name: string
    type: 'supplement' | 'peptide'
    complianceRate: number
    currentStreak: number
    recommendation: ProtocolRecommendation
    rationale: string
    titrationEligible: boolean
    biomarkerCorrelation: string | null
}

export interface TitrationNote {
    peptideName: string
    currentDoseMcg: number
    complianceRate: number
    message: string
}

export interface CycleEvent {
    date: Date
    label: string
    peptideName: string
    type: 'injection' | 'cycle-end' | 'rest-end'
    daysFromNow: number
}

// -----------------------------------------------
// Supplement scoring
// -----------------------------------------------

export function scoreSupplementFit(
    supplement: Supplement,
    records: ComplianceRecord[],
): ProtocolScore {
    const filtered = records.filter(r => r.supplementName === supplement.name)
    const total = filtered.length
    const taken = filtered.filter(r => r.taken).length
    const rate = total > 0 ? taken / total : 0

    const sorted = [...filtered].sort((a, b) => a.loggedAt - b.loggedAt)
    let streak = 0
    for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i]?.taken) streak++
        else break
    }

    let recommendation: ProtocolRecommendation
    let rationale: string

    if (rate >= 0.95) {
        recommendation = 'continue'
        rationale = `Excellent adherence (${Math.round(rate * 100)}%)`
    } else if (rate >= 0.8) {
        recommendation = 'continue'
        rationale = `Good adherence (${Math.round(rate * 100)}%) — minor consistency gap`
    } else if (rate >= 0.6) {
        recommendation = 'improve-timing'
        rationale = `Moderate adherence (${Math.round(rate * 100)}%) — timing adjustment may help`
    } else if (rate >= 0.4) {
        recommendation = 'address-adherence'
        rationale = `Low adherence (${Math.round(rate * 100)}%) — protocol fit or friction issue`
    } else {
        recommendation = 'pause-consider'
        rationale = `Very low adherence (${Math.round(rate * 100)}%) — consider simplifying stack`
    }

    return {
        name: supplement.name,
        type: 'supplement',
        complianceRate: rate,
        currentStreak: streak,
        recommendation,
        rationale,
        titrationEligible: false,
        biomarkerCorrelation: null,
    }
}

// -----------------------------------------------
// Peptide scoring — includes titration eligibility
// -----------------------------------------------

export function scorePeptideFit(
    peptide: PeptideProtocol,
    records: ComplianceRecord[],
    periodDays = 30,
): ProtocolScore {
    const cutoff = Date.now() - periodDays * 86_400_000
    const filtered = records.filter(
        r => r.supplementName === peptide.name && r.loggedAt >= cutoff,
    )
    const total = filtered.length
    const taken = filtered.filter(r => r.taken).length
    const rate = total > 0 ? taken / total : 0

    const sorted = [...filtered].sort((a, b) => a.loggedAt - b.loggedAt)
    let streak = 0
    for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i]?.taken) streak++
        else break
    }

    // Eligible if >95% compliance over at least 20 logged doses (~30 days)
    const titrationEligible = rate >= 0.95 && total >= 20

    let recommendation: ProtocolRecommendation
    let rationale: string

    if (titrationEligible) {
        recommendation = 'titrate-up'
        rationale = `Exceptional adherence (${Math.round(rate * 100)}% over ${periodDays}d) — dose review opportunity`
    } else if (rate >= 0.8) {
        recommendation = 'continue'
        rationale = `Strong adherence (${Math.round(rate * 100)}%)`
    } else if (rate >= 0.6) {
        recommendation = 'improve-timing'
        rationale = `Moderate adherence (${Math.round(rate * 100)}%) — injection scheduling may help`
    } else {
        recommendation = 'address-adherence'
        rationale = `Low adherence (${Math.round(rate * 100)}%) — cycle management friction`
    }

    return {
        name: peptide.name,
        type: 'peptide',
        complianceRate: rate,
        currentStreak: streak,
        recommendation,
        rationale,
        titrationEligible,
        biomarkerCorrelation: null,
    }
}

// -----------------------------------------------
// Biomarker correlation enrichment
// Known supplement/peptide → biomarker relationships
// -----------------------------------------------

const BIOMARKER_CORRELATIONS: Record<string, string[]> = {
    'Vitamin D3':          ['vitamin_d'],
    'Omega-3 Fish Oil':    ['crp_hs', 'triglycerides'],
    'Magnesium Glycinate': ['hrv'],
    'Ipamorelin':          ['igf1'],
    'CJC-1295 No-DAC':    ['igf1'],
    'BPC-157':             ['crp_hs'],
    'Zinc':                ['testosterone_total'],
    'Ashwagandha':         ['cortisol_am'],
    'NMN':                 ['vo2_max'],
    'Testosterone':        ['testosterone_total', 'testosterone_free'],
}

export function enrichWithBiomarkers(
    scores: ProtocolScore[],
    trends: BiomarkerTrend[],
): ProtocolScore[] {
    return scores.map(score => {
        const markers = BIOMARKER_CORRELATIONS[score.name]
        if (!markers) return score

        const relevant = trends.filter(t => markers.includes(t.markerName))
        if (relevant.length === 0) return score

        const improving = relevant.filter(t => t.direction === 'improving')
        const declining  = relevant.filter(t => t.direction === 'declining')

        let correlation: string | null = null
        if (improving.length > 0) {
            correlation = `${improving.map(t => t.displayName).join(', ')} trending up ↑`
        } else if (declining.length > 0) {
            correlation = `${declining.map(t => t.displayName).join(', ')} declining ↓`
        }
        return { ...score, biomarkerCorrelation: correlation }
    })
}

// -----------------------------------------------
// Cycle calendar — upcoming events for active peptides
// -----------------------------------------------

export function buildCycleCalendar(
    peptides: PeptideProtocol[],
    lookaheadDays = 14,
): CycleEvent[] {
    const events: CycleEvent[] = []
    const now = Date.now()
    const lookaheadMs = lookaheadDays * 86_400_000

    for (const peptide of peptides) {
        if (!peptide.active) continue
        const start = new Date(peptide.startDate).getTime()
        if (isNaN(start)) continue

        const cycleLengthMs = peptide.cycleWeeks * 7 * 86_400_000
        const restLengthMs  = peptide.restWeeks  * 7 * 86_400_000
        const cycleEndMs    = start + cycleLengthMs
        const restEndMs     = cycleEndMs + restLengthMs

        if (cycleEndMs >= now && cycleEndMs <= now + lookaheadMs) {
            events.push({
                date:        new Date(cycleEndMs),
                label:       `${peptide.name} cycle ends`,
                peptideName: peptide.name,
                type:        'cycle-end',
                daysFromNow: Math.round((cycleEndMs - now) / 86_400_000),
            })
        }

        if (restEndMs >= now && restEndMs <= now + lookaheadMs) {
            events.push({
                date:        new Date(restEndMs),
                label:       `${peptide.name} rest ends — ready to restart`,
                peptideName: peptide.name,
                type:        'rest-end',
                daysFromNow: Math.round((restEndMs - now) / 86_400_000),
            })
        }

        // Next injection within the lookahead window
        const freq = Math.max(1, Math.min(7, Math.round(peptide.frequencyPerWeek)))
        const intervalMs = (7 / freq) * 86_400_000
        let nextMs = start
        while (nextMs < now) nextMs += intervalMs

        if (nextMs <= now + lookaheadMs) {
            events.push({
                date:        new Date(nextMs),
                label:       `${peptide.name} injection`,
                peptideName: peptide.name,
                type:        'injection',
                daysFromNow: Math.round((nextMs - now) / 86_400_000),
            })
        }
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function formatCycleCalendar(events: CycleEvent[]): string {
    if (events.length === 0) return 'No upcoming cycle events in the next 14 days.'
    const lines = ['📅 Upcoming Cycle Events\n']
    for (const e of events) {
        const dayLabel = e.daysFromNow === 0
            ? 'Today'
            : e.daysFromNow === 1
                ? 'Tomorrow'
                : `In ${e.daysFromNow}d`
        const icon = e.type === 'injection' ? '💉' : e.type === 'cycle-end' ? '🔄' : '✅'
        lines.push(`${icon} ${dayLabel} — ${e.label}`)
    }
    return lines.join('\n')
}

// -----------------------------------------------
// Titration notes — surface to user when eligible
// -----------------------------------------------

export function checkTitration(
    peptides: PeptideProtocol[],
    scores: ProtocolScore[],
): TitrationNote[] {
    return scores
        .filter(s => s.titrationEligible && s.type === 'peptide')
        .flatMap(s => {
            const peptide = peptides.find(p => p.name === s.name)
            if (!peptide) return []
            return [{
                peptideName:    peptide.name,
                currentDoseMcg: peptide.doseMcg,
                complianceRate: s.complianceRate,
                message:        `${peptide.name} at ${peptide.doseMcg}mcg — ${Math.round(s.complianceRate * 100)}% compliance. Eligible for dose review with your provider.`,
            }]
        })
}
