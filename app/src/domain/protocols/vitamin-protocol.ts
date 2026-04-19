import type { UserProfile, Supplement, ReminderFrequency, SupplementTiming } from '../user-profile.ts'
import { nextOccurrence } from '../../utils/time.ts'

// -----------------------------------------------
// Types
// -----------------------------------------------

export interface DailyReminder {
    userId: string
    phone: string
    supplementName: string
    /** 24-hour clock hour in the user's timezone */
    hour: number
    minute: number
    message: string
}

// -----------------------------------------------
// Timing resolution
// -----------------------------------------------

function timingToTime(
    timing: SupplementTiming,
    wakeTime: string,
    sleepTime: string,
): { hour: number; minute: number } {
    const [wakeHour, wakeMin = 0] = wakeTime.split(':').map(Number)
    const [sleepHour] = sleepTime.split(':').map(Number)

    switch (timing) {
        case 'morning':
            return { hour: wakeHour, minute: wakeMin }
        case 'with-meal':
            return { hour: wakeHour + 1, minute: 30 }
        case 'afternoon':
            return { hour: 13, minute: 0 }
        case 'evening':
            return { hour: 18, minute: 0 }
        case 'bedtime':
            return { hour: Math.max(sleepHour - 1, 20), minute: 0 }
    }
}

// -----------------------------------------------
// Message generation
// -----------------------------------------------

function buildReminderText(
    supplement: Supplement,
    userName: string,
    frequency: ReminderFrequency,
): string {
    const dose = `${supplement.name} (${supplement.dose})`
    switch (frequency) {
        case 'gentle':
            return `Hey ${userName} — time for your ${dose}. ${supplement.purpose}. Reply "done" when taken 💊`
        case 'strict':
            return `${supplement.name} reminder: ${supplement.dose} now. ${supplement.purpose}. Reply "done" or "skip".`
        case 'aggressive':
            return `⚠️ ${dose} — take it now. ${supplement.purpose}. Reply "done".`
    }
}

// -----------------------------------------------
// Public API
// -----------------------------------------------

export function buildDailyReminders(profile: UserProfile): DailyReminder[] {
    return profile.stack
        .filter(s => s.frequency === 'daily')
        .map(supplement => {
            const { hour, minute } = timingToTime(supplement.timing, profile.wakeTime, profile.sleepTime)
            return {
                userId: profile.id,
                phone: profile.phone,
                supplementName: supplement.name,
                hour,
                minute,
                message: buildReminderText(supplement, profile.name, profile.preferences.reminderFrequency),
            }
        })
}

export { nextOccurrence }
