import type { MessageScheduler } from '@photon-ai/imessage-kit'
import type { UserProfile } from '../../domain/user-profile.ts'
import { buildDailyReminders, nextOccurrence } from '../../domain/protocols/vitamin-protocol.ts'
import {
    buildInjectionSchedule,
    buildReconstitutionGuide,
    formatReconstitutionMessage,
    getCycleEndDate,
    peptideContextLine,
} from '../../domain/protocols/peptide-protocol.ts'

// -----------------------------------------------
// ReminderService
// -----------------------------------------------

export class ReminderService {
    private readonly scheduler: MessageScheduler

    constructor(scheduler: MessageScheduler) {
        this.scheduler = scheduler
    }

    // -----------------------------------------------
    // Supplements — recurring daily reminders
    // -----------------------------------------------

    scheduleSupplementReminders(profile: UserProfile): void {
        const reminders = buildDailyReminders(profile)

        for (const reminder of reminders) {
            const startAt = nextOccurrence(reminder.hour, reminder.minute, profile.timezone)

            this.scheduler.scheduleRecurring({
                to: profile.phone,
                content: reminder.message,
                startAt,
                interval: 'daily',
            })
        }
    }

    // -----------------------------------------------
    // Peptide injections — one-shot per event
    // -----------------------------------------------

    async schedulePeptideInjections(
        profile: UserProfile,
        sendFn: (phone: string, text: string) => Promise<void>,
    ): Promise<void> {
        const now = Date.now()

        for (const peptide of profile.peptides) {
            if (!peptide.active) continue

            // Send reconstitution guide immediately on setup
            const guide = buildReconstitutionGuide(peptide)
            const msg = formatReconstitutionMessage(guide, peptide.rotationSites)
            await sendFn(profile.phone, msg)

            // Schedule all injection events
            const events = buildInjectionSchedule(profile.id, profile.phone, peptide)

            for (const event of events) {
                if (event.scheduledAt.getTime() <= now) continue

                // 30-min pre-injection heads-up
                if (event.preReminderAt.getTime() > now) {
                    this.scheduler.schedule({
                        to: profile.phone,
                        content: `⏰ ${peptide.name} injection in 30 minutes.\n📍 Site: ${event.injectionSite}\n\nGet your kit ready. Reply "skip" to miss this one.`,
                        sendAt: event.preReminderAt,
                    })
                }

                // Main injection prompt
                const context = peptideContextLine(peptide.type)
                this.scheduler.schedule({
                    to: profile.phone,
                    content: [
                        `💉 ${peptide.name.toUpperCase()} TIME`,
                        '',
                        `📍 Site: ${event.injectionSite}`,
                        context ? context : null,
                        '',
                        'Reply "done" when injected, or "skip [reason]".',
                    ].filter(Boolean).join('\n'),
                    sendAt: event.scheduledAt,
                })

                // 2h post-injection check-in
                this.scheduler.schedule({
                    to: profile.phone,
                    content: `🩹 ${peptide.name} check-in (2h post): Any redness, pain, or unusual symptoms at the injection site? Reply "good" or describe what you're feeling.`,
                    sendAt: event.postCheckAt,
                })
            }

            // Cycle-end rest period notification
            const cycleEnd = getCycleEndDate(peptide)
            if (cycleEnd.getTime() > now) {
                this.scheduler.schedule({
                    to: profile.phone,
                    content: peptide.restWeeks > 0
                        ? `🏁 ${peptide.name} cycle complete! Begin your ${peptide.restWeeks}-week rest period. Maintain training and nutrition. I'll remind you when it's time to restart.`
                        : `🏁 ${peptide.name} cycle complete! Continue with next vial if prescribed, or let me know how you'd like to proceed.`,
                    sendAt: cycleEnd,
                })
            }
        }
    }
}
