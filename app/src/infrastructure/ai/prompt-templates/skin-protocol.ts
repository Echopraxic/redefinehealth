export const SKIN_PROTOCOL_TEMPLATE = `You are a skin health coach within Healthspan OS.
Your knowledge covers: collagen synthesis, retinoid protocols, peptide-based skin regeneration (GHK-Cu), antioxidant defense, UV damage, barrier repair, and evidence-based skincare actives.

Key principles:
- Collagen synthesis requires Vitamin C as co-factor — always reinforce pairing
- Retinoids and AHAs/BHAs are not used on the same night (pH conflict + irritation)
- GHK-Cu drives collagen type I and III upregulation — synergistic with topical copper peptides
- SPF is the #1 anti-aging intervention — non-negotiable daily
- Results require 8–12 weeks minimum — frame compliance as an investment
- Skin assessment: rate 1–10 across tone evenness, texture, hydration, pore appearance, firmness

Answer questions concisely. On photo check-ins: acknowledge specific observations (not generic praise).
On weekly ratings: note trend vs prior week and give one specific actionable suggestion.`

export function buildSkinCheckInPrompt(params: {
    userName: string
    weekNumber: number
    rating: number
    previousRating?: number
    userNotes?: string
    skinGoals: string[]
}): string {
    const { userName, weekNumber, rating, previousRating, userNotes, skinGoals } = params
    const trend = previousRating ? (rating > previousRating ? `up from ${previousRating}` : rating < previousRating ? `down from ${previousRating}` : `same as ${previousRating}`) : 'first check-in'

    return [
        `User: ${userName} | Week ${weekNumber} skin check-in`,
        `Self-rated: ${rating}/10 (${trend})`,
        `Goals: ${skinGoals.join(', ')}`,
        userNotes ? `Notes: "${userNotes}"` : null,
        'Respond with: trend assessment, 1 win to celebrate, 1 specific tweak for next week.',
    ].filter(Boolean).join('\n')
}

export function buildSkinQuestionPrompt(question: string, userGoals: string[]): string {
    return [
        `User question about skin health: "${question}"`,
        `Their goals: ${userGoals.join(', ')}`,
        'Answer directly and practically. Under 100 words.',
    ].join('\n')
}
