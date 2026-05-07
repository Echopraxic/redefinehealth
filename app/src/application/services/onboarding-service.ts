import type { IMessageSDK } from '@photon-ai/imessage-kit'
import type { ConversationFlowManager } from '../conversation-flow.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { Goal, CreateUserInput, Supplement, PeptideProtocol, SkincareProduct } from '../../domain/user-profile.ts'
import { validateHHMM, assertValid } from '../../utils/validators.ts'
import { findSupplement, type SupplementDef } from '../../config/supplements.ts'
import { findPeptide, type PeptideDef } from '../../config/peptides.ts'
import { findSkincare, type SkincareDef } from '../../config/skincare.ts'
import { checkInteractions, formatInteractionWarnings } from '../../domain/safety/interaction-checker.ts'

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
// Stack parsing helpers
// -----------------------------------------------

function parseItemList(text: string): string[] {
    return text
        .split(/[,\n;]+/)
        .map(s => s.trim().replace(/^[-•*]\s*/, ''))
        .filter(s => s.length > 0 && !/^(none|skip|n\/a|no|nope)$/i.test(s))
}

function supplementFromDef(def: SupplementDef): Supplement {
    return {
        name: def.name,
        dose: def.defaultDose,
        timing: def.timing,
        frequency: 'daily',
        purpose: def.purpose,
        interactions: def.interactions,
    }
}

function supplementCustom(name: string): Supplement {
    return {
        name,
        dose: 'custom',
        timing: 'morning',
        frequency: 'daily',
        purpose: 'Custom supplement',
        interactions: [],
    }
}

function peptideFromDef(def: PeptideDef, wakeTime: string, sleepTime: string): PeptideProtocol {
    const timing = def.preferredTiming.toLowerCase()
    let injectionHour = 21
    if (timing.includes('morning') || timing.includes('wake')) {
        const [h] = wakeTime.split(':').map(Number)
        injectionHour = h ?? 7
    } else if (timing.includes('pre-workout') || timing.includes('afternoon')) {
        injectionHour = 17
    } else {
        const [h] = sleepTime.split(':').map(Number)
        injectionHour = Math.max((h ?? 22) - 1, 20)
    }
    const injectionTime = `${String(injectionHour).padStart(2, '0')}:00`

    // Reconstitution: assume 2mg vial + 2ml BAC water → 1000mcg/ml → 1 unit = 10mcg
    const vialMg = def.commonDoseMcg.standard >= 5000 ? 10 : 2
    const bacWaterMl = vialMg
    const doseUnits = Math.round((def.commonDoseMcg.standard / (vialMg * 1000)) * bacWaterMl * 100)

    return {
        name: def.name,
        type: def.type,
        doseMcg: def.commonDoseMcg.standard,
        frequencyPerWeek: def.frequencyOptions[0] ?? 5,
        injectionTime,
        cycleWeeks: def.defaultCycleWeeks,
        restWeeks: def.defaultRestWeeks,
        startDate: new Date().toISOString().split('T')[0]!,
        reconstitution: { vialMg, bacWaterMl, doseUnits },
        rotationSites: def.rotationSites,
        active: true,
    }
}

function skincareFromDef(def: SkincareDef): SkincareProduct {
    return {
        name: def.name,
        step: def.step,
        routine: def.routine,
        purpose: def.purpose,
        interactions: def.interactions,
        notes: def.notes,
    }
}

function skincareCustom(name: string): SkincareProduct {
    return {
        name,
        step: 'serum',
        routine: 'both',
        purpose: 'Custom skincare product',
        interactions: [],
    }
}

// -----------------------------------------------
// Confirmation message builder
// -----------------------------------------------

function buildConfirmMessage(
    stack: Supplement[],
    peptides: PeptideProtocol[],
    skincare: SkincareProduct[],
): string {
    const lines: string[] = ['Here\'s what I\'ve built for you:']

    if (stack.length > 0) {
        lines.push(`\n💊 SUPPLEMENTS (${stack.length}):`)
        for (const s of stack) {
            const label = s.dose === 'custom' ? s.name : `${s.name} — ${s.dose}, ${s.timing}`
            lines.push(`• ${label}`)
        }
    } else {
        lines.push('\n💊 SUPPLEMENTS: none')
    }

    if (peptides.length > 0) {
        lines.push(`\n💉 PEPTIDES (${peptides.length}):`)
        for (const p of peptides) {
            lines.push(`• ${p.name} — ${p.doseMcg}mcg, ${p.frequencyPerWeek}x/wk, ${p.injectionTime}`)
        }
    } else {
        lines.push('\n💉 PEPTIDES: none')
    }

    if (skincare.length > 0) {
        const routineLabel: Record<string, string> = { morning: 'AM', evening: 'PM', both: 'AM+PM', weekly: 'weekly' }
        lines.push(`\n🧴 SKINCARE (${skincare.length}):`)
        for (const p of skincare) {
            lines.push(`• ${p.name} — ${p.step}, ${routineLabel[p.routine] ?? p.routine}`)
        }
    } else {
        lines.push('\n🧴 SKINCARE: none')
    }

    lines.push('\nReply "confirm" to save, or "edit" to start over.')
    return lines.join('\n')
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
            'Terms of Service: https://redefinehealth.io/terms',
            'Privacy Policy: https://redefinehealth.io/privacy',
            '',
            'By replying "agree" you confirm you have read and accept both documents. Reply "stop" to cancel.',
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
            case 'onboarding_consent':             await this.stepConsent(phone, message); break
            case 'onboarding_name':                await this.stepName(phone, message); break
            case 'onboarding_goals':               await this.stepGoals(phone, message); break
            case 'onboarding_wake_time':            await this.stepWakeTime(phone, message); break
            case 'onboarding_sleep_time':           await this.stepSleepTime(phone, message); break
            case 'onboarding_timezone':             await this.stepTimezone(phone, message); break
            case 'onboarding_stack_supplements':   await this.stepStackSupplements(phone, message); break
            case 'onboarding_stack_peptides':      await this.stepStackPeptides(phone, message); break
            case 'onboarding_stack_skincare':      await this.stepStackSkincare(phone, message); break
            case 'onboarding_stack_confirm':       await this.stepStackConfirm(phone, message); break
            default: return false
        }

        return true
    }

    // -----------------------------------------------
    // Profile steps (unchanged)
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
        this.flow.update(phone, { state: 'onboarding_name', pending: { consentAt: Date.now() } })
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

        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone })
        } catch {
            await this.send(phone, `"${raw}" isn't a recognised timezone. Reply 1–5 or use a timezone like "Europe/London".`)
            return
        }

        const ctx = this.flow.get(phone)!
        const { name, goals, wakeTime, sleepTime, consentAt } = ctx.pending as {
            name: string; goals: Goal[]; wakeTime: string; sleepTime: string; consentAt: number
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
            skincare: [],
            consentAt: consentAt ?? null,
            preferences: {
                reminderFrequency: 'strict',
                aiTone: 'engaging',
                photoTracking: false,
                voiceJournal: false,
                leaderboardOptIn: false,
                leaderboardAnonymous: false,
            },
            webhookToken: null,
            deletedAt: null,
        }

        try {
            assertValid([validateHHMM(input.wakeTime), validateHHMM(input.sleepTime)])
            this.users.create(input)

            // Transition to stack collection — do NOT clear the flow yet
            this.flow.update(phone, {
                state: 'onboarding_stack_supplements',
                pending: { timezone },  // save for injection timing
            })

            await this.send(phone, [
                `✅ Profile created, ${name}!`,
                `Goals: ${goals.join(', ')} · Wake ${wakeTime} · Sleep ${sleepTime} · ${timezone}`,
                '',
                "Now let's build your health stack. I'll match what you're taking against our database to set up doses, timing, and interaction checks automatically.",
                '',
                '💊 What supplements are you currently taking?',
                'List them separated by commas or one per line.',
                'Examples: Vitamin D3, Magnesium, NMN, Creatine',
                '',
                'Reply "none" to skip.',
            ].join('\n'))
        } catch (err) {
            await this.send(phone, `Setup error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`)
        }
    }

    // -----------------------------------------------
    // Stack collection steps
    // -----------------------------------------------

    private async stepStackSupplements(phone: string, message: string): Promise<void> {
        const ctx = this.flow.get(phone)!
        const { wakeTime, sleepTime } = ctx.pending as { wakeTime: string; sleepTime: string }

        const items = parseItemList(message)
        const stack: Supplement[] = []
        const custom: string[] = []

        for (const item of items) {
            const def = findSupplement(item)
            if (def) {
                stack.push(supplementFromDef(def))
            } else {
                stack.push(supplementCustom(item))
                custom.push(item)
            }
        }

        const matchedCount = stack.length - custom.length
        const summary = stack.length === 0
            ? 'No supplements added.'
            : [
                matchedCount > 0 ? `Matched ${matchedCount} from database (doses + timing auto-filled).` : null,
                custom.length > 0 ? `Added ${custom.length} custom: ${custom.join(', ')}.` : null,
              ].filter(Boolean).join(' ')

        this.flow.update(phone, { state: 'onboarding_stack_peptides', pending: { stack, wakeTime, sleepTime } })

        await this.send(phone, [
            summary ? `💊 ${summary}` : null,
            '',
            '💉 What peptides are you currently running?',
            'List them separated by commas or one per line.',
            'Examples: Ipamorelin, BPC-157, GHK-Cu',
            '',
            'Reply "none" to skip.',
        ].filter(s => s !== null).join('\n'))
    }

    private async stepStackPeptides(phone: string, message: string): Promise<void> {
        const ctx = this.flow.get(phone)!
        const { wakeTime, sleepTime } = ctx.pending as { wakeTime: string; sleepTime: string }

        const items = parseItemList(message)
        const peptides: PeptideProtocol[] = []

        for (const item of items) {
            const def = findPeptide(item)
            if (def) {
                peptides.push(peptideFromDef(def, wakeTime ?? '07:00', sleepTime ?? '22:30'))
            }
            // Unrecognized peptides are skipped — dose/reconstitution can't be safely defaulted
        }

        const matched = peptides.length
        const unmatched = items.length - matched
        const summary = items.length === 0
            ? 'No peptides added.'
            : [
                matched > 0 ? `Matched ${matched} peptide${matched > 1 ? 's' : ''} (protocols auto-configured).` : null,
                unmatched > 0 ? `${unmatched} not recognized — add those manually after setup.` : null,
              ].filter(Boolean).join(' ')

        this.flow.update(phone, { state: 'onboarding_stack_skincare', pending: { peptides } })

        await this.send(phone, [
            summary ? `💉 ${summary}` : null,
            '',
            '🧴 What skincare products do you use?',
            'List them separated by commas or one per line.',
            'Examples: Niacinamide, Retinol, Hyaluronic Acid, Vitamin C serum, SPF',
            '',
            'Reply "none" to skip.',
        ].filter(s => s !== null).join('\n'))
    }

    private async stepStackSkincare(phone: string, message: string): Promise<void> {
        const ctx = this.flow.get(phone)!
        const { stack, peptides } = ctx.pending as { stack: Supplement[]; peptides: PeptideProtocol[] }

        const items = parseItemList(message)
        const skincare: SkincareProduct[] = []
        const custom: string[] = []

        for (const item of items) {
            const def = findSkincare(item)
            if (def) {
                skincare.push(skincareFromDef(def))
            } else {
                skincare.push(skincareCustom(item))
                custom.push(item)
            }
        }

        const matchedCount = skincare.length - custom.length
        const summary = skincare.length === 0
            ? 'No skincare products added.'
            : [
                matchedCount > 0 ? `Matched ${matchedCount} from database (steps + routines auto-filled).` : null,
                custom.length > 0 ? `Added ${custom.length} custom: ${custom.join(', ')}.` : null,
              ].filter(Boolean).join(' ')

        this.flow.update(phone, { state: 'onboarding_stack_confirm', pending: { skincare } })

        const confirmMsg = buildConfirmMessage(stack, peptides, skincare)
        const fullMsg = [
            summary ? `🧴 ${summary}` : null,
            '',
            confirmMsg,
        ].filter(s => s !== null).join('\n')

        await this.send(phone, fullMsg)
    }

    private async stepStackConfirm(phone: string, message: string): Promise<void> {
        const text = message.trim().toLowerCase()

        if (/^edit\b/.test(text) || /^start over\b/.test(text) || /^restart\b/.test(text)) {
            this.flow.update(phone, { state: 'onboarding_stack_supplements', pending: { stack: [], peptides: [], skincare: [] } })
            await this.send(phone, [
                'No problem — let\'s redo it.',
                '',
                '💊 What supplements are you currently taking?',
                'Reply "none" to skip.',
            ].join('\n'))
            return
        }

        if (!/^(confirm|yes|save|done|looks good|correct|ok)\b/.test(text)) {
            await this.send(phone, 'Reply "confirm" to save your stack, or "edit" to start over.')
            return
        }

        const ctx = this.flow.get(phone)!
        const { stack, peptides, skincare } = ctx.pending as {
            stack: Supplement[];
            peptides: PeptideProtocol[];
            skincare: SkincareProduct[];
        }

        const user = this.users.findByPhone(phone)
        if (!user) {
            await this.send(phone, 'Something went wrong — please message "start" to begin again.')
            this.flow.clear(phone)
            return
        }

        this.users.update(user.id, { stack, peptides, skincare })
        this.users.markOnboarded(user.id)
        this.flow.clear(phone)

        // Run interaction check across the full stack
        const allNames = [
            ...stack.map(s => s.name),
            ...peptides.map(p => p.name),
            ...skincare.map(p => p.name),
        ]
        const warnings = checkInteractions(allNames)
        const warningText = formatInteractionWarnings(warnings)

        await this.send(phone, [
            `🎉 Stack saved! You're all set, ${user.name}.`,
            '',
            `${stack.length} supplement${stack.length !== 1 ? 's' : ''}, ${peptides.length} peptide${peptides.length !== 1 ? 's' : ''}, ${skincare.length} skincare product${skincare.length !== 1 ? 's' : ''} loaded.`,
            '',
            "Your reminders will start on schedule. Reply \"help\" to see available commands anytime.",
        ].join('\n'))

        if (warningText) {
            await this.send(phone, warningText)
        }
    }

    private async send(phone: string, text: string): Promise<void> {
        await this.sdk.send(phone, { text })
    }
}
