import type { RecentDose } from '../../storage/compliance-store.ts'

export const SIDE_EFFECT_TEMPLATE = `You are assessing a reported side effect in context of the user's recent supplement and peptide doses.
Be medically conservative — safety over reassurance.
Output format (3 parts, under 100 words total):
1. Likely correlation with recent doses (or "unclear")
2. Immediate recommendation (monitor / adjust timing / pause / seek care)
3. Continue / pause / adjust protocol — be specific`

export function buildSideEffectPrompt(params: {
    report: string
    userName: string
    recentDoses: RecentDose[]
}): string {
    const { report, userName, recentDoses } = params

    const doseContext = recentDoses.length > 0
        ? recentDoses
            .map(d => {
                const hoursAgo = Math.round((Date.now() - d.takenAt) / 3_600_000)
                return `${d.name} (${d.type}, ${hoursAgo}h ago)`
            })
            .join(', ')
        : 'No doses logged in last 6 hours'

    return [
        `User ${userName} reports: "${report}"`,
        `Recent doses (last 6h): ${doseContext}`,
        'Assess:',
    ].join('\n')
}

const SEVERE_PATTERN = /severe|intense|can't breathe|cannot breathe|chest pain|chest pressure|jaw pain|left arm|swelling.*throat|anaphyla|passing out|unconscious|911|emergency/i

export function isSevereSymptom(text: string): boolean {
    return SEVERE_PATTERN.test(text)
}
