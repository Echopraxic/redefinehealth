import type { Protocol, ProtocolContext, ProtocolMessage } from './base-protocol.ts'
import { nextOccurrence } from '../../utils/time.ts'
import { parseHHMM } from '../../utils/time.ts'

// -----------------------------------------------
// Config
// -----------------------------------------------

export type SkinGoal = 'anti-aging' | 'acne' | 'hyperpigmentation' | 'texture' | 'glow' | 'barrier-repair'

export interface SkinProtocolConfig {
    skinGoals: SkinGoal[]
    hasGHKCu: boolean           // GHK-Cu peptide in stack
    hasCopperPeptide: boolean   // topical copper peptide
    photoTracking: boolean
    hasRetinoid: boolean        // prescription retinoid or OTC retinol
}

// -----------------------------------------------
// Protocol
// -----------------------------------------------

export class SkinProtocol implements Protocol<SkinProtocolConfig> {
    readonly protocolName = 'Skin Health'

    buildSchedule(ctx: ProtocolContext, config: SkinProtocolConfig): ProtocolMessage[] {
        const messages: ProtocolMessage[] = []
        const { hour: wakeHour, minute: wakeMin } = parseHHMM(ctx.wakeTime)

        // Morning stack reminder (15 min after wake)
        messages.push({
            phone: ctx.phone,
            content: this.morningMessage(config),
            scheduledAt: nextOccurrence(wakeHour, wakeMin + 15, ctx.timezone),
            tag: 'skin_morning_stack',
            recurrence: 'daily',
        })

        // Midday UV check (12:30 — reminder to reapply SPF)
        messages.push({
            phone: ctx.phone,
            content: '☀️ Midday SPF check — if you\'ve been outside or near windows, reapply SPF 30+. UV damage is cumulative and the #1 accelerator of visible aging.',
            scheduledAt: nextOccurrence(12, 30, ctx.timezone),
            tag: 'skin_spf_reapply',
            recurrence: 'daily',
        })

        // Evening routine (90 min before sleep)
        const { hour: sleepHour, minute: sleepMin } = parseHHMM(ctx.sleepTime)
        const eveningHour = Math.max(sleepHour - 2, 19)
        messages.push({
            phone: ctx.phone,
            content: this.eveningMessage(config),
            scheduledAt: nextOccurrence(eveningHour, sleepMin, ctx.timezone),
            tag: 'skin_evening_routine',
            recurrence: 'daily',
        })

        // Weekly photo check-in (Sunday 10am)
        if (config.photoTracking) {
            const photoDate = nextOccurrence(10, 0, ctx.timezone)
            const daysUntilSunday = (7 - photoDate.getDay()) % 7 || 7
            photoDate.setDate(photoDate.getDate() + daysUntilSunday)
            messages.push({
                phone: ctx.phone,
                content: [
                    '📸 Weekly skin check-in!',
                    '',
                    'Same lighting, same angle as last week. Take a front-facing photo in natural light.',
                    'Reply with the photo, rate your skin 1–10, and note any changes (texture, tone, breakouts, glow).',
                ].join('\n'),
                scheduledAt: photoDate,
                tag: 'skin_weekly_photo',
                recurrence: 'weekly',
            })
        }

        // Biweekly collagen synthesis reminder (alternating Wednesdays)
        const collagenNudge = nextOccurrence(9, 0, ctx.timezone)
        const daysUntilWed = (3 - collagenNudge.getDay() + 7) % 7 || 7
        collagenNudge.setDate(collagenNudge.getDate() + daysUntilWed)
        messages.push({
            phone: ctx.phone,
            content: '🧬 Collagen synthesis check: Are you taking your Collagen Peptides with Vitamin C? Vitamin C is the rate-limiting co-factor — without it, collagen synthesis stalls. Reply "yes" or tell me what you\'re working with.',
            scheduledAt: collagenNudge,
            tag: 'skin_collagen_check',
            recurrence: 'weekly',
        })

        return messages
    }

    buildWelcomeMessage(ctx: ProtocolContext, config: SkinProtocolConfig): string {
        const goals = config.skinGoals.join(', ')
        return [
            `🧴 Skin Health Protocol — ${ctx.name}`,
            '',
            `Focus: ${goals}`,
            '',
            'Your daily protocol:',
            '• Morning — Collagen + Vitamin C + Zinc stack',
            '• Midday — SPF reapplication reminder',
            '• Evening — Full routine with retinoid timing',
            config.hasGHKCu ? '• GHK-Cu injections per your peptide schedule' : null,
            config.photoTracking ? '• Weekly photo check-ins (Sundays)' : null,
            '',
            'Skin remodeling takes 8–12 weeks to see structural change. Consistency is the protocol.',
        ].filter(Boolean).join('\n')
    }

    private morningMessage(config: SkinProtocolConfig): string {
        return [
            '🌅 Morning Skin Stack',
            '',
            '• Collagen Peptides (15g) — with water or smoothie',
            '• Vitamin C (1000mg) — required co-factor for collagen synthesis',
            '• Zinc (25mg) — sebum regulation, wound healing, antioxidant defense',
            config.hasGHKCu ? '• GHK-Cu — per injection schedule (regeneration + collagen upregulation)' : null,
            '',
            'Apply SPF 30+ before sun exposure — UVA ages, UVB burns.',
            'Reply "done" when complete.',
        ].filter(Boolean).join('\n')
    }

    private eveningMessage(config: SkinProtocolConfig): string {
        return [
            '🌙 Evening Skin Routine',
            '',
            '1. Cleanse — remove SPF, oxidative debris, and environmental pollutants',
            '2. Toner/essence — hydration prep layer (hyaluronic acid or centella)',
            config.hasRetinoid
                ? '3. Retinoid — apply to dry skin only (wait 20 min post-cleanse). No AHAs/BHAs on retinoid nights.'
                : '3. Niacinamide serum — barrier support, pore tightening, brightening',
            config.hasCopperPeptide ? '4. Copper peptide serum — apply before moisturizer' : null,
            '4. Moisturizer — seal hydration. Ceramide-based for barrier repair.',
            '',
            'Retinoid nights: avoid mixing AHAs, BHAs, or vitamin C.',
            'Reply "done" or describe your routine.',
        ].filter(Boolean).join('\n')
    }
}
