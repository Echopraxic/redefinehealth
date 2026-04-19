import type { Protocol, ProtocolContext, ProtocolMessage } from './base-protocol.ts'
import { nextOccurrence, parseHHMM } from '../../utils/time.ts'

// -----------------------------------------------
// Config
// -----------------------------------------------

export interface LongevityProtocolConfig {
    hasNMN: boolean
    hasResveratrol: boolean
    hasCoQ10: boolean
    hasBerberine: boolean
    hasAlphaLipoicAcid: boolean
    fastingWindowHours: number      // 0 = no fasting protocol
    trackingBloodwork: boolean
    doingRapamycin: boolean         // requires prescription — tracking only
    senelyticCycles: boolean        // Dasatinib/Quercetin — tracking only
}

// -----------------------------------------------
// Protocol
// -----------------------------------------------

export class LongevityProtocol implements Protocol<LongevityProtocolConfig> {
    readonly protocolName = 'Longevity & Biohacking'

    buildSchedule(ctx: ProtocolContext, config: LongevityProtocolConfig): ProtocolMessage[] {
        const messages: ProtocolMessage[] = []
        const { hour: wakeHour, minute: wakeMin } = parseHHMM(ctx.wakeTime)

        // -----------------------------------------------
        // NAD+ stack (10 min after wake, fasted)
        // -----------------------------------------------
        if (config.hasNMN || config.hasResveratrol) {
            const nadStack = [
                '⚗️ NAD+ Stack — take now (fasted):',
                '',
                config.hasNMN
                    ? '• NMN (500mg) — sublingual for fastest absorption. Raises NAD+, fuels sirtuins and PARP DNA repair.'
                    : null,
                config.hasResveratrol
                    ? '• Resveratrol (500mg) — take with a small fat source (tablespoon of olive oil or a few nuts). Activates SIRT1, inhibits CD38 to prevent NAD+ degradation.'
                    : null,
                '',
                'Together: NMN provides the NAD+ substrate; Resveratrol extends its half-life by blocking breakdown. Stack timing matters.',
            ].filter(Boolean).join('\n')

            messages.push({
                phone: ctx.phone,
                content: nadStack,
                scheduledAt: nextOccurrence(wakeHour, wakeMin + 10, ctx.timezone),
                tag: 'longevity_nad_stack',
                recurrence: 'daily',
            })
        }

        // -----------------------------------------------
        // CoQ10 (with first meal)
        // -----------------------------------------------
        if (config.hasCoQ10) {
            messages.push({
                phone: ctx.phone,
                content: '⚡ CoQ10 (Ubiquinol) — take with your first meal. Fat-soluble: needs dietary fat for absorption. Critical for mitochondrial electron transport and ATP synthesis. If you\'re on a statin, this is non-negotiable.',
                scheduledAt: nextOccurrence(wakeHour + 1, 30, ctx.timezone),
                tag: 'longevity_coq10',
                recurrence: 'daily',
            })
        }

        // -----------------------------------------------
        // Berberine (with meals — metabolic window)
        // -----------------------------------------------
        if (config.hasBerberine) {
            messages.push({
                phone: ctx.phone,
                content: '🍽️ Berberine (500mg) — take 15 minutes before your largest carbohydrate meal. Activates AMPK (the "metabolic master switch"), mimicking caloric restriction signaling. Monitor blood glucose if combining with other glucose-lowering agents.',
                scheduledAt: nextOccurrence(12, 45, ctx.timezone),
                tag: 'longevity_berberine',
                recurrence: 'daily',
            })
        }

        // -----------------------------------------------
        // Fasting window management
        // -----------------------------------------------
        if (config.fastingWindowHours > 0) {
            const eatWindowHours = 24 - config.fastingWindowHours
            const { hour: wakeHr } = parseHHMM(ctx.wakeTime)
            const closeHour = Math.min(wakeHr + eatWindowHours, 21)

            messages.push({
                phone: ctx.phone,
                content: [
                    `⏰ Eating window closes in 30 minutes (${config.fastingWindowHours}h fasting protocol).`,
                    '',
                    'Take any meal-dependent supplements now: CoQ10, Berberine, fat-soluble vitamins.',
                    'Electrolytes (sodium, potassium, magnesium) are fine during the fast — essential for long fasts.',
                    'Black coffee + green tea are acceptable if no additives.',
                ].join('\n'),
                scheduledAt: nextOccurrence(closeHour, 30, ctx.timezone),
                tag: 'longevity_fasting_close',
                recurrence: 'daily',
            })
        }

        // -----------------------------------------------
        // Monthly bloodwork reminder (1st of next month, 9am)
        // -----------------------------------------------
        if (config.trackingBloodwork) {
            const bloodworkDate = new Date()
            bloodworkDate.setDate(1)
            bloodworkDate.setMonth(bloodworkDate.getMonth() + 1)
            bloodworkDate.setHours(9, 0, 0, 0)

            messages.push({
                phone: ctx.phone,
                content: [
                    '🩸 Monthly bloodwork reminder — schedule your labs this week.',
                    '',
                    'Longevity biomarker panel:',
                    '• Cardiovascular: ApoB, Lp(a), LDL-P, triglycerides, hsCRP',
                    '• Metabolic: HbA1c, fasting insulin, fasting glucose, HOMA-IR',
                    '• Hormonal: testosterone (total + free), DHEA-S, IGF-1, TSH/T3/T4',
                    '• Inflammatory: IL-6, TNF-α, ferritin, homocysteine',
                    '• Longevity-specific: NAD+ (if available), telomere length (annually), epigenetic age',
                    '',
                    'Early detection = leverage. Don\'t skip.',
                ].join('\n'),
                scheduledAt: bloodworkDate,
                tag: 'longevity_bloodwork',
                recurrence: 'once',
            })
        }

        // -----------------------------------------------
        // Rapamycin tracking note (if prescribed — weekly)
        // -----------------------------------------------
        if (config.doingRapamycin) {
            const rapNudge = nextOccurrence(9, 0, ctx.timezone)
            const daysUntilSat = (6 - rapNudge.getDay() + 7) % 7 || 7
            rapNudge.setDate(rapNudge.getDate() + daysUntilSat)

            messages.push({
                phone: ctx.phone,
                content: [
                    '💊 Rapamycin cycle check (prescribed protocol only):',
                    '',
                    'If your prescriber has you on weekly dosing — today is a common dosing day.',
                    'Reminder: rapamycin is taken on an empty stomach for consistent bioavailability.',
                    'Track any mouth sores, fatigue, or lipid changes — report at next appointment.',
                    '',
                    'Confirm dose taken with prescriber protocol, not this message.',
                ].join('\n'),
                scheduledAt: rapNudge,
                tag: 'longevity_rapamycin',
                recurrence: 'weekly',
            })
        }

        // -----------------------------------------------
        // Senolytic cycle reminder (quarterly — Dasatinib/Quercetin)
        // -----------------------------------------------
        if (config.senelyticCycles) {
            const senoDate = new Date()
            senoDate.setMonth(senoDate.getMonth() + 3)
            senoDate.setDate(1)
            senoDate.setHours(9, 0, 0, 0)

            messages.push({
                phone: ctx.phone,
                content: [
                    '🧹 Quarterly senolytic cycle window (physician-supervised):',
                    '',
                    'Senolytic protocols (e.g., Dasatinib 100mg + Quercetin 1000mg × 2–3 consecutive days) aim to selectively eliminate senescent cells.',
                    '',
                    '⚠️ These are not casual supplements. Dasatinib is a chemotherapy drug. Only proceed with physician oversight and bloodwork.',
                    '',
                    'If cleared: ensure fasted state, avoid NSAIDs for 48h, monitor for fatigue and CBC changes.',
                ].join('\n'),
                scheduledAt: senoDate,
                tag: 'longevity_senolytic',
                recurrence: 'once',
            })
        }

        return messages
    }

    buildWelcomeMessage(ctx: ProtocolContext, config: LongevityProtocolConfig): string {
        const features: string[] = []
        if (config.hasNMN || config.hasResveratrol) features.push('Daily NAD+ optimization (NMN + Resveratrol)')
        if (config.hasCoQ10) features.push('CoQ10 mitochondrial support with meals')
        if (config.hasBerberine) features.push('Berberine AMPK activation (metabolic mimetic)')
        if (config.fastingWindowHours > 0) features.push(`${config.fastingWindowHours}h daily fasting window management`)
        if (config.trackingBloodwork) features.push('Monthly biomarker bloodwork reminders')
        if (config.doingRapamycin) features.push('Weekly Rapamycin cycle tracking (prescription)')
        if (config.senelyticCycles) features.push('Quarterly senolytic cycle reminders (physician-supervised)')

        return [
            `🔬 Longevity & Biohacking Protocol — ${ctx.name}`,
            '',
            ...features.map(f => `• ${f}`),
            '',
            'The goal is measurable biological age reduction — track everything, adjust based on data.',
        ].join('\n')
    }
}
