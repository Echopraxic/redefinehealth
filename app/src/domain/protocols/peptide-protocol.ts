import type { PeptideProtocol } from '../user-profile.ts'

// -----------------------------------------------
// Types
// -----------------------------------------------

export interface InjectionEvent {
    userId: string
    phone: string
    peptideName: string
    scheduledAt: Date
    injectionSite: string
    preReminderAt: Date
    postCheckAt: Date
}

export interface ReconstitutionGuide {
    peptideName: string
    vialMg: number
    bacWaterMl: number
    concentrationMgPerMl: number
    doseVolumeInsulinUnits: number
    doseVolumeMl: number
    doseMcg: number
}

// -----------------------------------------------
// Injection schedule
// -----------------------------------------------

function injectionSiteForIndex(sites: string[], index: number): string {
    return sites[index % sites.length] ?? sites[0] ?? 'Abdomen'
}

export function buildInjectionSchedule(
    userId: string,
    phone: string,
    peptide: PeptideProtocol,
): InjectionEvent[] {
    if (!peptide.active) return []

    const events: InjectionEvent[] = []
    const start = new Date(peptide.startDate + 'T00:00:00')
    const [hours, minutes] = peptide.injectionTime.split(':').map(Number)
    const totalInjections = peptide.frequencyPerWeek * peptide.cycleWeeks
    const daysPerInjection = 7 / peptide.frequencyPerWeek

    for (let i = 0; i < totalInjections; i++) {
        const scheduledAt = new Date(start)
        scheduledAt.setDate(start.getDate() + Math.round(i * daysPerInjection))
        scheduledAt.setHours(hours ?? 21, minutes ?? 0, 0, 0)

        events.push({
            userId,
            phone,
            peptideName: peptide.name,
            scheduledAt,
            injectionSite: injectionSiteForIndex(peptide.rotationSites, i),
            preReminderAt: new Date(scheduledAt.getTime() - 30 * 60 * 1000),
            postCheckAt: new Date(scheduledAt.getTime() + 2 * 60 * 60 * 1000),
        })
    }

    return events
}

// -----------------------------------------------
// Reconstitution
// -----------------------------------------------

export function buildReconstitutionGuide(peptide: PeptideProtocol): ReconstitutionGuide {
    const { vialMg, bacWaterMl, doseUnits } = peptide.reconstitution
    const concentrationMgPerMl = vialMg / bacWaterMl
    const doseVolumeMl = doseUnits / 100
    const doseMcg = doseVolumeMl * concentrationMgPerMl * 1000

    return { peptideName: peptide.name, vialMg, bacWaterMl, concentrationMgPerMl, doseVolumeInsulinUnits: doseUnits, doseVolumeMl, doseMcg }
}

export function formatReconstitutionMessage(guide: ReconstitutionGuide, rotationSites: string[]): string {
    const siteList = rotationSites.map((s, i) => `  ${i + 1}. ${s}`).join('\n')

    return [
        `📋 ${guide.peptideName.toUpperCase()} — RECONSTITUTION`,
        '',
        '1. Wash hands 20 seconds. Clean vial stopper with alcohol pad.',
        `2. Draw ${guide.bacWaterMl}ml bacteriostatic water into the syringe.`,
        '3. Inject BAC water SLOWLY down the side of the vial (not directly on powder).',
        '4. GENTLY swirl until clear. Never shake — peptides denature.',
        '5. Refrigerate at 2–8°C. Label with today\'s date. Stable 30 days.',
        '',
        `💉 YOUR DOSE: ${guide.doseVolumeInsulinUnits} units = ${guide.doseVolumeMl.toFixed(2)}ml = ${guide.doseMcg.toFixed(0)}mcg`,
        `📊 Concentration: ${guide.concentrationMgPerMl.toFixed(2)}mg/ml`,
        '',
        '🔄 ROTATION SITES:',
        siteList,
        '',
        'Reply "ready" when reconstituted, or ask any questions.',
    ].join('\n')
}

// -----------------------------------------------
// Cycle management
// -----------------------------------------------

export function getCycleEndDate(peptide: PeptideProtocol): Date {
    const end = new Date(peptide.startDate + 'T00:00:00')
    end.setDate(end.getDate() + peptide.cycleWeeks * 7)
    return end
}

export function getRestEndDate(peptide: PeptideProtocol): Date {
    const end = getCycleEndDate(peptide)
    end.setDate(end.getDate() + peptide.restWeeks * 7)
    return end
}

export function peptideContextLine(type: string): string {
    switch (type) {
        case 'growth-hormone': return '⚡ Fasted 2+ hours? This maximizes GH pulse amplitude.'
        case 'healing':        return '🔄 Post-workout or before bed optimizes tissue repair.'
        case 'cognition':      return '🧠 Morning injection aligns with peak cognitive window.'
        default:               return ''
    }
}
