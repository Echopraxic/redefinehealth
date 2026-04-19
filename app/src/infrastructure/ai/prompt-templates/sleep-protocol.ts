export const SLEEP_PROTOCOL_TEMPLATE = `You are a sleep and circadian biology coach within Healthspan OS.
Your knowledge covers: circadian rhythm optimization, sleep architecture (REM/NREM cycles), sleep supplement timing, HRV interpretation, chronobiology, and sleep hygiene evidence.

Key principles:
- Morning bright light (within 30 min of wake) is the most powerful circadian anchor
- Caffeine half-life ~5–6 hours — cutoff 8–10h before sleep
- Core body temperature must drop 1–2°F for sleep onset — room at 65–68°F
- Melatonin works best at 0.3–1mg (physiological dose) — higher doses blunt natural production
- Sleep consistency (same wake time every day) is more important than duration
- REM rebound occurs after restriction — 1 poor night doesn't undo months of good sleep
- HRV trends (not single readings) are what matter

On sleep score ratings (1–10): acknowledge the number, note trend, give one evidence-based tip.
Keep responses under 80 words on check-ins. Fuller answers for specific questions.`

export interface AppleHealthSleepContext {
    hrv?: number
    restingHr?: number
    sleepHours?: number
    sleepDeepHours?: number
    sleepRemHours?: number
}

export function buildSleepCheckInPrompt(params: {
    userName: string
    score: number
    previousScore?: number
    notes?: string
    wakeTime: string
    sleepTime: string
    appleHealth?: AppleHealthSleepContext
}): string {
    const { userName, score, previousScore, notes, wakeTime, sleepTime, appleHealth } = params
    const trend = previousScore
        ? (score > previousScore ? 'improved' : score < previousScore ? 'declined' : 'stable')
        : 'first check-in'

    const ahLines: string[] = []
    if (appleHealth) {
        if (appleHealth.sleepHours !== undefined)
            ahLines.push(`Total sleep: ${appleHealth.sleepHours}h`)
        if (appleHealth.sleepDeepHours !== undefined)
            ahLines.push(`Deep: ${appleHealth.sleepDeepHours}h`)
        if (appleHealth.sleepRemHours !== undefined)
            ahLines.push(`REM: ${appleHealth.sleepRemHours}h`)
        if (appleHealth.hrv !== undefined)
            ahLines.push(`HRV: ${appleHealth.hrv} ms`)
        if (appleHealth.restingHr !== undefined)
            ahLines.push(`Resting HR: ${appleHealth.restingHr} bpm`)
    }

    return [
        `User: ${userName} | Sleep check-in`,
        `Score: ${score}/10 (${trend})${previousScore ? ` from ${previousScore}` : ''}`,
        `Schedule: wake ${wakeTime} / sleep ${sleepTime}`,
        ahLines.length > 0 ? `Apple Health data: ${ahLines.join(' | ')}` : null,
        notes ? `Notes: "${notes}"` : null,
        'Give a brief, honest assessment referencing any objective data provided, and one specific improvement. Under 80 words.',
    ].filter(Boolean).join('\n')
}

export function buildSleepQuestionPrompt(question: string): string {
    return [
        `User question about sleep/circadian biology: "${question}"`,
        'Answer with evidence. Under 120 words.',
    ].join('\n')
}
