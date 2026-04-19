import { IMessageSDK, MessageScheduler, loggerPlugin } from '@photon-ai/imessage-kit'
import type { Message } from '@photon-ai/imessage-kit'
import type Database from 'better-sqlite3'

// -----------------------------------------------
// Infrastructure
// -----------------------------------------------
import { openDatabase } from '../infrastructure/storage/db-schema.ts'
import { UserRepository } from '../infrastructure/storage/user-repository.ts'
import { ComplianceStore } from '../infrastructure/storage/compliance-store.ts'
import { generateMessage, generateWithTemplate } from '../infrastructure/ai/claude-client.ts'
import { PROGRESS_ANALYSIS_TEMPLATE, buildProgressPrompt } from '../infrastructure/ai/prompt-templates/progress-analysis.ts'
import { SIDE_EFFECT_TEMPLATE, buildSideEffectPrompt } from '../infrastructure/ai/prompt-templates/side-effect.ts'
import { RECONSTITUTION_TEMPLATE, buildReconstitutionPrompt } from '../infrastructure/ai/prompt-templates/reconstitution.ts'
import { SKIN_PROTOCOL_TEMPLATE, buildSkinCheckInPrompt, buildSkinQuestionPrompt } from '../infrastructure/ai/prompt-templates/skin-protocol.ts'
import { SLEEP_PROTOCOL_TEMPLATE, buildSleepCheckInPrompt, buildSleepQuestionPrompt } from '../infrastructure/ai/prompt-templates/sleep-protocol.ts'
import { ONBOARDING_TEMPLATE, buildWelcomePrompt } from '../infrastructure/ai/prompt-templates/onboarding.ts'
import { complianceLoggerPlugin } from '../infrastructure/plugin/compliance-logger-plugin.ts'
import { safetyGuardPlugin } from '../infrastructure/plugin/safety-guard-plugin.ts'
import { aiGenerationPlugin } from '../infrastructure/plugin/ai-generation-plugin.ts'

// -----------------------------------------------
// Application
// -----------------------------------------------
import { ReminderService } from './services/reminder-service.ts'
import { ReportingService } from './services/reporting-service.ts'
import { OnboardingService } from './services/onboarding-service.ts'
import { ConversationFlowManager } from './conversation-flow.ts'
import { routeCommand, buildHelpMessage, buildProtocolListMessage } from './command-router.ts'

// -----------------------------------------------
// Domain
// -----------------------------------------------
import { detectCurrentSupplement, calculateStreak } from '../domain/compliance/tracker.ts'
import { checkInteractions, formatInteractionWarnings } from '../domain/safety/interaction-checker.ts'
import { classifySideEffect, buildEscalationMessage, inferLikelyCauses } from '../domain/safety/side-effect-handler.ts'
import { buildReconstitutionGuide } from '../domain/protocols/peptide-protocol.ts'
import { generateReport, formatReportText } from '../domain/compliance/reporter.ts'
import { SkinProtocol } from '../domain/protocols/skin-protocol.ts'
import { SleepProtocol } from '../domain/protocols/sleep-protocol.ts'
import { LongevityProtocol } from '../domain/protocols/longevity-protocol.ts'

import type { UserProfile, CreateUserInput, StreakResult } from '../domain/user-profile.ts'
import type { StreakResult as SR } from '../domain/compliance/tracker.ts'
import { config } from '../config/index.ts'

// -----------------------------------------------
// HealthspanOS — main application facade
// -----------------------------------------------

export class HealthspanOS {
    private readonly sdk: IMessageSDK
    private readonly scheduler: MessageScheduler
    private readonly db: Database.Database
    private readonly users: UserRepository
    private readonly compliance: ComplianceStore
    private readonly reminders: ReminderService
    private readonly reporting: ReportingService
    private readonly onboarding: OnboardingService
    private readonly flow: ConversationFlowManager

    private constructor(
        sdk: IMessageSDK,
        scheduler: MessageScheduler,
        db: Database.Database,
    ) {
        this.sdk = sdk
        this.scheduler = scheduler
        this.db = db
        this.users = new UserRepository(db)
        this.compliance = new ComplianceStore(db)
        this.flow = new ConversationFlowManager()
        this.reminders = new ReminderService(scheduler)
        this.reporting = new ReportingService(this.users, this.compliance)
        this.onboarding = new OnboardingService(sdk, this.users, this.flow)
    }

    static create(): HealthspanOS {
        const db = openDatabase(config.dbPath)

        const sdk = new IMessageSDK({
            debug: config.debug,
            plugins: [
                loggerPlugin({ level: 'info', colors: true }),
                complianceLoggerPlugin(),
                safetyGuardPlugin(),
                aiGenerationPlugin(),
            ],
        })

        const scheduler = new MessageScheduler({
            sender: sdk,
            debug: config.debug,
            events: {
                onError: (task, err) => console.error(`[Scheduler] Task ${task.id} failed:`, err.message),
            },
        })

        return new HealthspanOS(sdk, scheduler, db)
    }

    // -----------------------------------------------
    // Lifecycle
    // -----------------------------------------------

    async start(): Promise<void> {
        this.scheduler.start()

        // Re-hydrate all supplement reminders on startup
        for (const user of this.users.findAll()) {
            if (user.onboarded) {
                this.reminders.scheduleSupplementReminders(user)
            }
        }

        // Prune expired conversation sessions every 10 minutes
        setInterval(() => this.flow.pruneExpired(), 10 * 60 * 1000)

        await this.sdk.startWatching({
            onDirectMessage: async (msg: Message) => {
                if (msg.isFromMe) return
                if (!msg.participant) return
                await this.handleMessage(msg.participant, msg).catch(err =>
                    console.error('[HealthspanOS] Handler error:', err),
                )
            },
            onError: (err: Error) => console.error('[HealthspanOS] Watcher error:', err),
        })

        console.log('[HealthspanOS] Running — watching for messages.')
    }

    async stop(): Promise<void> {
        this.scheduler.destroy()
        this.sdk.stopWatching()
        this.db.close()
        console.log('[HealthspanOS] Stopped.')
    }

    // -----------------------------------------------
    // User registration (called programmatically by admin)
    // -----------------------------------------------

    async registerUser(input: CreateUserInput): Promise<UserProfile> {
        const existing = this.users.findByPhone(input.phone)
        if (existing) throw new Error(`Phone ${input.phone} already registered (id: ${existing.id})`)

        // Safety check before creating
        const allSubstances = [...input.stack.map(s => s.name), ...input.peptides.map(p => p.name)]
        const warnings = checkInteractions(allSubstances)
        const warningText = formatInteractionWarnings(warnings)

        const user = this.users.create(input)

        // AI-personalized welcome using onboarding template (cached)
        const welcomePrompt = buildWelcomePrompt(user)
        const welcome = await generateWithTemplate(ONBOARDING_TEMPLATE, welcomePrompt)
        await this.send(user.phone, `🧬 Welcome to Healthspan OS, ${user.name}\n\n${welcome}\n\nReply "help" anytime for commands.`)

        if (warningText) await this.send(user.phone, warningText)

        // Schedule all reminders
        this.reminders.scheduleSupplementReminders(user)
        await this.reminders.schedulePeptideInjections(user, (phone, text) => this.send(phone, text))

        // Activate goal-based protocols
        await this.activateProtocols(user)

        this.users.markOnboarded(user.id)
        return { ...user, onboarded: true }
    }

    // -----------------------------------------------
    // Message dispatch
    // -----------------------------------------------

    private async handleMessage(phone: string, msg: Message): Promise<void> {
        const text = (msg.text ?? '').trim()
        if (!text) return

        // 1. Check if phone is mid-onboarding flow
        if (this.flow.isActive(phone) && !this.users.findByPhone(phone)) {
            await this.onboarding.handle(phone, text)
            return
        }

        // 2. Unknown sender — offer onboarding or ignore
        const user = this.users.findByPhone(phone)
        if (!user) {
            if (routeCommand(text) === 'start_onboarding' || /^(hi|hello|hey|start|join)\b/i.test(text)) {
                await this.onboarding.initiate(phone)
            }
            return
        }

        // 3. Registered user — route command
        const command = routeCommand(text)

        switch (command) {
            case 'compliance_taken':   await this.handleComplianceTaken(user, msg); break
            case 'compliance_skip':    await this.handleComplianceSkip(user, msg, text); break
            case 'status':             await this.sendProgressReport(user); break
            case 'streak':             await this.sendStreakStats(user); break
            case 'reconstitute':       await this.sendReconstitutionGuide(user, text); break
            case 'side_effect':        await this.handleSideEffectReport(user, msg, text); break
            case 'skin_checkin':       await this.handleSkinCheckin(user, msg, text); break
            case 'sleep_checkin':      await this.handleSleepCheckin(user, msg, text); break
            case 'protocol_list':      await this.sendProtocolList(user); break
            case 'help':               await this.send(user.phone, buildHelpMessage()); break
            case 'start_onboarding':   await this.send(user.phone, `You're already registered, ${user.name}! Reply "help" for commands.`); break
            case 'adjustment':
            case 'general':            await this.handleGeneralQuery(user, text); break
        }
    }

    // -----------------------------------------------
    // Compliance handlers
    // -----------------------------------------------

    private async handleComplianceTaken(user: UserProfile, msg: Message): Promise<void> {
        const supplementName = detectCurrentSupplement(user.stack, user.wakeTime, user.sleepTime)
            ?? user.stack[0]?.name
            ?? 'supplement'

        this.compliance.logCompliance({ userId: user.id, supplementName, taken: true })

        const history = this.compliance.getComplianceHistory(user.id, supplementName, 30)
        const streak = calculateStreak(history, supplementName)

        const context = [
            `${user.name} confirmed taking ${supplementName}.`,
            `Streak: ${streak.current} days. 30-day compliance: ${Math.round(streak.rate * 100)}%.`,
            'Write 1–2 sentences of genuine encouragement. Mention streak only if ≥3 days.',
        ].join(' ')

        const reply = await generateMessage(context, { maxTokens: 100 })
        await this.sdk.message(msg).ifFromOthers().replyText(`✅ ${reply}`).execute()
    }

    private async handleComplianceSkip(user: UserProfile, msg: Message, text: string): Promise<void> {
        const supplementName = detectCurrentSupplement(user.stack, user.wakeTime, user.sleepTime)
            ?? user.stack[0]?.name
            ?? 'supplement'

        const reason = text.replace(/\b(skip|skipping|skipped|no|nah|n|not today|missed|forgot)\b/gi, '').trim() || undefined
        this.compliance.logCompliance({ userId: user.id, supplementName, taken: false, notes: reason })
        await this.sdk.message(msg).ifFromOthers().replyText('⏭️ Logged. Consistency over perfection — back on track tomorrow.').execute()
    }

    // -----------------------------------------------
    // Reporting handlers
    // -----------------------------------------------

    private async sendProgressReport(user: UserProfile): Promise<void> {
        const records = this.compliance.getAllComplianceHistory(user.id, 30)
        const streaks: Record<string, SR> = {}
        for (const s of user.stack) {
            const hist = this.compliance.getComplianceHistory(user.id, s.name, 30)
            streaks[s.name] = calculateStreak(hist, s.name)
        }

        const prompt = buildProgressPrompt({ userName: user.name, goals: user.goals, records, streaks })
        const report = await generateWithTemplate(PROGRESS_ANALYSIS_TEMPLATE, prompt)
        await this.send(user.phone, `📊 30-Day Report — ${user.name}\n\n${report}`)
    }

    private async sendStreakStats(user: UserProfile): Promise<void> {
        const report = this.reporting.generateUserReport(user.id, 30)
        await this.send(user.phone, report ?? 'No compliance data yet — take your first dose!')
    }

    private async sendProtocolList(user: UserProfile): Promise<void> {
        const activeProtocols: string[] = []
        if (user.goals.includes('skin'))        activeProtocols.push('Skin Health')
        if (user.goals.includes('sleep'))       activeProtocols.push('Sleep & Recovery')
        if (user.goals.includes('longevity'))   activeProtocols.push('Longevity & Biohacking')
        if (user.goals.includes('energy'))      activeProtocols.push('Energy Optimization')
        if (user.goals.includes('cognition'))   activeProtocols.push('Cognitive Enhancement')

        const msg = buildProtocolListMessage(
            user.stack.map(s => ({ name: s.name, dose: s.dose, timing: s.timing })),
            user.peptides.map(p => ({ name: p.name, active: p.active, cycleWeeks: p.cycleWeeks })),
            activeProtocols,
        )
        await this.send(user.phone, msg)
    }

    // -----------------------------------------------
    // Peptide reconstitution
    // -----------------------------------------------

    private async sendReconstitutionGuide(user: UserProfile, text: string): Promise<void> {
        const lc = text.toLowerCase()
        const peptide = user.peptides.find(p => lc.includes(p.name.toLowerCase()))
            ?? user.peptides.find(p => p.active)

        if (!peptide) {
            await this.send(user.phone, "No active peptide protocols found. Ask me about setting one up.")
            return
        }

        const guide = buildReconstitutionGuide(peptide)
        const question = text
            .replace(/\b(reconstitut\w*|mix|vial|syringe|dose|units|ml|mcg|how much)\b/gi, '')
            .replace(new RegExp(peptide.name, 'gi'), '')
            .trim() || undefined

        const prompt = buildReconstitutionPrompt({
            peptideName: peptide.name,
            concentrationMgPerMl: guide.concentrationMgPerMl,
            doseUnits: guide.doseVolumeInsulinUnits,
            doseMcg: guide.doseMcg,
            question,
        })
        const response = await generateWithTemplate(RECONSTITUTION_TEMPLATE, prompt)
        await this.send(user.phone, response)
    }

    // -----------------------------------------------
    // Side effect handler
    // -----------------------------------------------

    private async handleSideEffectReport(user: UserProfile, msg: Message, text: string): Promise<void> {
        const classification = classifySideEffect(text)
        const escalation = buildEscalationMessage(classification.severity)

        if (escalation) {
            await this.sdk.message(msg).ifFromOthers().replyText(escalation).execute()
            return
        }

        this.compliance.logCompliance({ userId: user.id, supplementName: '__side_effect__', taken: true, notes: text })

        const recentDoses = this.compliance.getRecentDoses(user.id, 6)
        const likelyCauses = inferLikelyCauses(text, recentDoses)
        const prompt = buildSideEffectPrompt({ report: text, userName: user.name, recentDoses })
        const analysis = await generateWithTemplate(SIDE_EFFECT_TEMPLATE, prompt)

        const causeNote = likelyCauses.length > 0 ? `\n\n🔍 Likely: ${likelyCauses.join('; ')}` : ''
        await this.sdk.message(msg).ifFromOthers().replyText(
            `📝 Logged: "${text}"\n\n${analysis}${causeNote}\n\n${classification.immediateAction}`,
        ).execute()
    }

    // -----------------------------------------------
    // Protocol check-ins
    // -----------------------------------------------

    private async handleSkinCheckin(user: UserProfile, msg: Message, text: string): Promise<void> {
        const ratingMatch = text.match(/\b([1-9]|10)\b/)
        const rating = ratingMatch ? parseInt(ratingMatch[1] ?? '5', 10) : null
        const userNotes = text.replace(/\d+/, '').replace(/skin|photo|check.?in/gi, '').trim() || undefined

        if (rating) {
            const prompt = buildSkinCheckInPrompt({
                userName: user.name,
                weekNumber: Math.ceil(this.daysSinceOnboarding(user) / 7),
                rating,
                userNotes,
                skinGoals: ['anti-aging', 'glow'],  // TODO: pull from user skin config
            })
            const response = await generateWithTemplate(SKIN_PROTOCOL_TEMPLATE, prompt, { maxTokens: 200 })
            await this.sdk.message(msg).ifFromOthers().replyText(`🧴 ${response}`).execute()
        } else {
            const prompt = buildSkinQuestionPrompt(text, user.goals.filter(g => g === 'skin'))
            const response = await generateWithTemplate(SKIN_PROTOCOL_TEMPLATE, prompt, { maxTokens: 200 })
            await this.sdk.message(msg).ifFromOthers().replyText(response).execute()
        }
    }

    private async handleSleepCheckin(user: UserProfile, msg: Message, text: string): Promise<void> {
        const scoreMatch = text.match(/\b([1-9]|10)\b/)
        const score = scoreMatch ? parseInt(scoreMatch[1] ?? '7', 10) : null
        const notes = text.replace(/\d+/, '').replace(/\b(sleep|slept|last night|check.?in)\b/gi, '').trim() || undefined

        if (score) {
            const prompt = buildSleepCheckInPrompt({
                userName: user.name,
                score,
                notes,
                wakeTime: user.wakeTime,
                sleepTime: user.sleepTime,
            })
            const response = await generateWithTemplate(SLEEP_PROTOCOL_TEMPLATE, prompt, { maxTokens: 150 })
            await this.sdk.message(msg).ifFromOthers().replyText(`🌙 ${response}`).execute()
        } else {
            const prompt = buildSleepQuestionPrompt(text)
            const response = await generateWithTemplate(SLEEP_PROTOCOL_TEMPLATE, prompt, { maxTokens: 200 })
            await this.sdk.message(msg).ifFromOthers().replyText(response).execute()
        }
    }

    // -----------------------------------------------
    // General AI query
    // -----------------------------------------------

    private async handleGeneralQuery(user: UserProfile, text: string): Promise<void> {
        const context = [
            `User ${user.name} asks: "${text}"`,
            `Goals: ${user.goals.join(', ')}.`,
            `Stack: ${user.stack.map(s => `${s.name} ${s.dose}`).join(', ') || 'none'}.`,
            `Peptides: ${user.peptides.filter(p => p.active).map(p => p.name).join(', ') || 'none'}.`,
        ].join('\n')

        const response = await generateMessage(context, { maxTokens: 350 })
        await this.send(user.phone, response)
    }

    // -----------------------------------------------
    // Protocol activation
    // -----------------------------------------------

    private async activateProtocols(user: UserProfile): Promise<void> {
        const sends: Array<() => Promise<void>> = []

        if (user.goals.includes('skin')) {
            const protocol = new SkinProtocol()
            const config = {
                skinGoals: ['anti-aging', 'glow'] as const,
                hasGHKCu: user.stack.some(s => s.name.toLowerCase().includes('ghk')),
                hasCopperPeptide: false,
                photoTracking: user.preferences.photoTracking,
                hasRetinoid: false,
            }
            const welcome = protocol.buildWelcomeMessage({ ...user }, config)
            sends.push(() => this.send(user.phone, welcome))

            for (const pm of protocol.buildSchedule({ ...user }, config)) {
                if (pm.recurrence === 'daily') {
                    this.scheduler.scheduleRecurring({ to: pm.phone, content: pm.content, startAt: pm.scheduledAt, interval: 'daily' })
                } else {
                    this.scheduler.schedule({ to: pm.phone, content: pm.content, sendAt: pm.scheduledAt })
                }
            }
        }

        if (user.goals.includes('sleep')) {
            const protocol = new SleepProtocol()
            const config = {
                targetSleepHours: 8,
                hasMagnesium: user.stack.some(s => s.name.toLowerCase().includes('magnesium')),
                hasMelatonin: user.stack.some(s => s.name.toLowerCase().includes('melatonin')),
                hasAshwagandha: user.stack.some(s => s.name.toLowerCase().includes('ashwagandha')),
                hasL_theanine: user.stack.some(s => s.name.toLowerCase().includes('theanine')),
                trackHRV: false,
                trackSleepScore: true,
            }
            const welcome = protocol.buildWelcomeMessage({ ...user }, config)
            sends.push(() => this.send(user.phone, welcome))

            for (const pm of protocol.buildSchedule({ ...user }, config)) {
                if (pm.recurrence === 'daily') {
                    this.scheduler.scheduleRecurring({ to: pm.phone, content: pm.content, startAt: pm.scheduledAt, interval: 'daily' })
                } else {
                    this.scheduler.schedule({ to: pm.phone, content: pm.content, sendAt: pm.scheduledAt })
                }
            }
        }

        if (user.goals.includes('longevity')) {
            const protocol = new LongevityProtocol()
            const config = {
                hasNMN: user.stack.some(s => s.name.toUpperCase().includes('NMN')),
                hasResveratrol: user.stack.some(s => s.name.toLowerCase().includes('resveratrol')),
                hasCoQ10: user.stack.some(s => s.name.toLowerCase().includes('coq10') || s.name.toLowerCase().includes('ubiquinol')),
                hasBerberine: user.stack.some(s => s.name.toLowerCase().includes('berberine')),
                hasAlphaLipoicAcid: user.stack.some(s => s.name.toLowerCase().includes('lipoic') || s.name.toLowerCase().includes('ala')),
                fastingWindowHours: 0,
                trackingBloodwork: true,
                doingRapamycin: false,
                senelyticCycles: false,
            }
            const welcome = protocol.buildWelcomeMessage({ ...user }, config)
            sends.push(() => this.send(user.phone, welcome))

            for (const pm of protocol.buildSchedule({ ...user }, config)) {
                if (pm.recurrence === 'daily') {
                    this.scheduler.scheduleRecurring({ to: pm.phone, content: pm.content, startAt: pm.scheduledAt, interval: 'daily' })
                } else {
                    this.scheduler.schedule({ to: pm.phone, content: pm.content, sendAt: pm.scheduledAt })
                }
            }
        }

        // Send welcome messages sequentially with small delay
        for (const send of sends) {
            await send()
        }
    }

    // -----------------------------------------------
    // Utilities
    // -----------------------------------------------

    private async send(phone: string, text: string): Promise<void> {
        await this.sdk.send(phone, { text })
    }

    private daysSinceOnboarding(user: UserProfile): number {
        return Math.ceil((Date.now() - user.createdAt) / 86_400_000)
    }

    getUserByPhone(phone: string): UserProfile | null { return this.users.findByPhone(phone) }
    getAllUsers(): UserProfile[] { return this.users.findAll() }
    getPlatformDigest(): string { return this.reporting.generatePlatformDigest() }
}
