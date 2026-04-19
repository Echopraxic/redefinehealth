import type { UserProfile } from '../../../domain/user-profile.ts'

export const ONBOARDING_TEMPLATE = `You are generating a personalized welcome message for a new Healthspan OS user.
The message should be warm, motivating, and specific to their goals.
Structure: (1) acknowledge their specific goals, (2) explain what they'll receive daily, (3) one concrete first action to take right now.
Under 150 words. Mobile reading format. No filler phrases.`

export function buildWelcomePrompt(user: UserProfile): string {
    const protocols = [
        user.goals.includes('skin') ? 'Skin health protocol' : null,
        user.goals.includes('sleep') ? 'Sleep & circadian protocol' : null,
        user.goals.includes('longevity') ? 'Longevity & NAD+ protocol' : null,
        user.goals.includes('energy') ? 'Energy optimization protocol' : null,
        user.goals.includes('cognition') ? 'Cognitive enhancement protocol' : null,
        user.goals.includes('body-composition') ? 'Body composition protocol' : null,
    ].filter(Boolean)

    return [
        `Name: ${user.name}`,
        `Goals: ${user.goals.join(', ')}`,
        `Wake time: ${user.wakeTime} | Sleep time: ${user.sleepTime}`,
        `Supplement stack: ${user.stack.length > 0 ? user.stack.map(s => s.name).join(', ') : 'not yet configured'}`,
        `Peptide protocols: ${user.peptides.length > 0 ? user.peptides.map(p => p.name).join(', ') : 'none yet'}`,
        `Active protocols: ${protocols.join(', ') || 'general wellness'}`,
        'Write personalized welcome message:',
    ].join('\n')
}

export function buildStackRecommendationPrompt(goals: string[], existingStack: string[]): string {
    return [
        `User goals: ${goals.join(', ')}`,
        `Already taking: ${existingStack.length > 0 ? existingStack.join(', ') : 'nothing yet'}`,
        'Recommend 3–5 foundational supplements for their goals. For each: name, dose, timing, why. Under 150 words total.',
    ].join('\n')
}
