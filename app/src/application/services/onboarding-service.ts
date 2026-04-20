import type { IMessageSDK } from '@photon-ai/imessage-kit'
import type { ConversationFlowManager } from '../conversation-flow.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { Goal, CreateUserInput } from '../../domain/user-profile.ts'
import { validateHHMM, assertValid } from '../../utils/validators.ts'

// -----------------------------------------------
// Goal parsing
// -----------------------------------------------

const GOAL_MAP: Record<string, Goal> = {
    '1': 'skin',         skin: 'skin',
    '2': 'energy',       energy: 'energy',
    '3': 'sleep',        sleep: 'sleep',
    '4': 'longevity',    longevity: 'longevity',
    '5': 'cognition',    cognition: 'cognition',
    '6': 'body-composition', body: 'body-composition', 'body-composition': 'body-composition',
}

function parseGoals(text: string): Goal[] {
    const tokens = text.toLowerCase().split(/[\s,]+/)
    const goals: Goal[] = []
    for (const t of tokens) {
        const g = GOAL_MAP[t]
        if (g && !goals.includes(g)) goals.push(g)
    }
    return goals
}

// -----------------------------------------------
// OnboardingService
// -----------------------------------------------

export class OnboardingService {
    constructor(
        private readonly sdk: IMessageSDK,
        private readonly users: UserRepository,
        private readonly flow: ConversationFlowManager,
    ) {}

    /** Begin onboarding for an unknown phone number */
    async initiate(phone: string): Promise<void> {
        if (this.users.findByPhone(phone)) {
            await this.send(phone, "You're already registered! Reply \"help\" for available commands.")
            return
        }

        this.flow.start(phone, 'onboarding_consent')
        await this.send(phone, [
            '👋 Welcome to Healthspan OS!',
            '',
            "I'm your AI wellness assistant. I help manage supplement + peptide protocols, track compliance, and coach you through your health stack — all via iMessage.",
            '',
            '⚠️ IMPORTANT: Healthspan OS is a wellness tracking tool, not a licensed medical provider. Information provided is educational only and does not constitute medical advice. Always consult a qualified healthcare provider before starting any new supplement or peptide protocol.',
            '',
            'By continuing, you acknowledge this. Reply "agree" to proceed, or "stop" to cancel.',
        ].join('\n'))
    }

    /**
     * Handle incoming message from a phone number currently in an onboarding flow.
     * Returns true if the message was consumed by the flow.
     */
    async handle(phone: string, message: string): Promise<boolean> {
        if (!this.flow.isActive(phone)) return false

        if (this.flow.isExpired(phone)) {
            this.flow.clear(phone)
            await this.send(phone, "Setup session expired (30 min timeout). Message \"start\" to begin again.")
            return true
        }

        const ctx = this.flow.get(phone)!

        switch (ctx.state) {
            case 'onboarding_consent':   await this.stepConsent(phone, message); break
            case 'onboarding_name':      await this.stepName(phone, message); break
            case 'onboarding_goals':     await this.stepGoals(phone, message); break
            case 'onboarding_wake_time':  await this.stepWakeTime(phone, message); break
            case 'onboarding_sleep_time': await this.stepSleepTime(phone, message); break
            case 'onboarding_timezone':   await this.stepTimezone(phone, message); break
            default: return false
        }

        return true
    }

    // -----------------------------------------------
    // Steps
    // -----------------------------------------------

    private async stepConsent(phone: string, message: string): Promise<void> {
        if (!/^(agree|yes|ok|i agree|accept|continue|proceed)\b/i.test(message.trim())) {
            if (/^stop\b/i.test(message.trim())) {
                this.flow.clear(phone)
                await this.send(phone, 'No problem — message "start" anytime to set up your profile.')
                return
            }
            await this.send(phone, 'Reply "agree" to acknowledge and continue, or "stop" to cancel.')
            return
        }
        this.flow.update(phone, { state: 'onboarding_name' })
        await this.send(phone, "Got it ✅\n\nWhat's your first name?")
    }

    private async stepName(phone: string, message: string): Promise<void> {
        const name = message.trim()
        if (!name || name.length > 60) {
            await this.send(phone, "Just your first name is fine.")
            return
        }

        this.flow.update(phone, { state: 'onboarding_goals', pending: { name } })
        await this.send(phone, [
            `Nice to meet you, ${name}! 🧬`,
            '',
            'What are your health goals? Reply with numbers (e.g., "1 3 4"):',
            '',
            '1 — Skin health & anti-aging',
            '2 — Energy & performance',
            '3 — Sleep & recovery',
            '4 — Longevity & lifespan extension',
            '5 — Cognition & mental clarity',
            '6 — Body composition',
        ].join('\n'))
    }

    private async stepGoals(phone: string, message: string): Promise<void> {
        const goals = parseGoals(message)
        if (goals.length === 0) {
            await this.send(phone, 'Please reply with one or more numbers (1–6), e.g., "1 3"')
            return
        }

        const ctx = this.flow.get(phone)!
        const name = ctx.pending['name'] as string
        this.flow.update(phone, { state: 'onboarding_wake_time', pending: { goals } })
        await this.send(phone, [
            `Got it: ${goals.join(', ')} 💪`,
            '',
            `${name}, what time do you usually wake up?`,
            'Reply in HH:MM format, e.g., "7:00" or "06:30"',
        ].join('\n'))
    }

    private async stepWakeTime(phone: string, message: string): Promise<void> {
        const time = message.trim()
        const validation = validateHHMM(time)
        if (!validation.valid) {
            await this.send(phone, `${validation.errors[0]} — try "7:00" or "06:30"`)
            return
        }

        this.flow.update(phone, { state: 'onboarding_sleep_time', pending: { wakeTime: time } })
        await this.send(phone, `Wake time: ${time} ✅\n\nWhat time do you usually go to sleep? (e.g., "22:30" or "10:30")`)
    }

    private async stepSleepTime(phone: string, message: string): Promise<void> {
        const time = message.trim()
        const validation = validateHHMM(time)
        if (!validation.valid) {
            await this.send(phone, `${validation.errors[0]} — try "22:30" or "10:30"`)
            return
        }

        this.flow.update(phone, { state: 'onboarding_timezone', pending: { sleepTime: time } })
        await this.send(phone, [
            `Sleep time: ${time} ✅`,
            '',
            'Last one: what timezone are you in?',
            '',
            '1 — Eastern  (New York)',
            '2 — Central  (Chicago)',
            '3 — Mountain (Denver)',
            '4 — Pacific  (Los Angeles)',
            '5 — GMT/UTC',
            '6 — Other (type your timezone, e.g. "Europe/London")',
        ].join('\n'))
    }

    private async stepTimezone(phone: string, message: string): Promise<void> {
        const TIMEZONE_SHORTCUTS: Record<string, string> = {
            '1': 'America/New_York',
            '2': 'America/Chicago',
            '3': 'America/Denver',
            '4': 'America/Los_Angeles',
            '5': 'UTC',
            'eastern': 'America/New_York',
            'central': 'America/Chicago',
            'mountain': 'America/Denver',
            'pacific': 'America/Los_Angeles',
            'gmt': 'UTC',
            'utc': 'UTC',
        }

        const raw = message.trim()
        const timezone = TIMEZONE_SHORTCUTS[raw.toLowerCase()] ?? raw

        // Validate it's a real IANA timezone
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone })
        } catch {
            await this.send(phone, `"${raw}" isn't a recognised timezone. Reply 1–5 or use a timezone like "Europe/London".`)
            return
        }

        const ctx = this.flow.get(phone)!
        const { name, goals, wakeTime, sleepTime } = ctx.pending as {
            name: string; goals: Goal[]; wakeTime: string; sleepTime: string
        }

        const input: CreateUserInput = {
            phone,
            name,
            timezone,
            wakeTime: wakeTime ?? '07:00',
            sleepTime: sleepTime ?? '22:30',
            goals,
            stack: [],
            peptides: [],
            preferences: {
                reminderFrequency: 'strict',
                aiTone: 'engaging',
                photoTracking: false,
                voiceJournal: false,
                leaderboardOptIn: false,
                leaderboardAnonymous: false,
            },
        }

        try {
            assertValid([validateHHMM(input.wakeTime), validateHHMM(input.sleepTime)])
            this.users.create(input)
            this.flow.clear(phone)

            await this.send(phone, [
                `✅ Profile created, ${name}!`,
                '',
                `Goals: ${goals.join(', ')}`,
                `Schedule: wake ${wakeTime} · sleep ${sleepTime} · ${timezone}`,
                '',
                "Your personalized protocol will be built based on your goals. A health advisor will load your supplement stack and peptide schedule — you'll receive your first reminders shortly.",
                '',
                'Reply "help" for available commands anytime.',
            ].join('\n'))
        } catch (err) {
            await this.send(phone, `Setup error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`)
        }
    }

    private async send(phone: string, text: string): Promise<void> {
        await this.sdk.send(phone, { text })
    }
}
