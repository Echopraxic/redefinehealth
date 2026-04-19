import type { Protocol, ProtocolContext, ProtocolMessage } from './base-protocol.ts'
import { nextOccurrence, parseHHMM } from '../../utils/time.ts'

// -----------------------------------------------
// Config
// -----------------------------------------------

export interface SleepProtocolConfig {
    targetSleepHours: number
    hasMagnesium: boolean
    hasMelatonin: boolean
    hasAshwagandha: boolean
    hasL_theanine: boolean
    trackHRV: boolean
    trackSleepScore: boolean
}

// -----------------------------------------------
// Protocol
// -----------------------------------------------

export class SleepProtocol implements Protocol<SleepProtocolConfig> {
    readonly protocolName = 'Sleep & Recovery'

    buildSchedule(ctx: ProtocolContext, config: SleepProtocolConfig): ProtocolMessage[] {
        const messages: ProtocolMessage[] = []
        const { hour: wakeHour, minute: wakeMin } = parseHHMM(ctx.wakeTime)
        const { hour: sleepHour, minute: sleepMin } = parseHHMM(ctx.sleepTime)

        // -----------------------------------------------
        // Morning anchor — light exposure within 30 min of wake
        // -----------------------------------------------
        messages.push({
            phone: ctx.phone,
            content: [
                '☀️ Morning light window — get outside (or near a bright window) for 10 minutes.',
                '',
                'Why: morning bright light (preferably sunlight) suppresses residual melatonin, advances your circadian phase, and triggers cortisol awakening response — the biological "starter" for the day.',
                '',
                'Bonus: morning light also locks in melatonin onset for tonight. Consistency here = faster sleep onset at night.',
            ].join('\n'),
            scheduledAt: nextOccurrence(wakeHour, wakeMin + 15, ctx.timezone),
            tag: 'sleep_morning_light',
            recurrence: 'daily',
        })

        // -----------------------------------------------
        // Sleep quality check-in (30 min after wake)
        // -----------------------------------------------
        if (config.trackSleepScore) {
            messages.push({
                phone: ctx.phone,
                content: [
                    `🌅 Good morning, ${ctx.name}! Sleep score check:`,
                    '',
                    'Rate last night 1–10 and tell me:',
                    '• Any wake-ups? How many?',
                    '• Dream recall? (indicates REM cycles)',
                    '• Energy level right now?',
                    config.trackHRV ? '• HRV reading if you have it' : null,
                    '',
                    'Just reply with a number or a sentence.',
                ].filter(Boolean).join('\n'),
                scheduledAt: nextOccurrence(wakeHour, wakeMin + 30, ctx.timezone),
                tag: 'sleep_morning_checkin',
                recurrence: 'daily',
            })
        }

        // -----------------------------------------------
        // Afternoon caffeine cutoff (2pm — ~8h before typical sleep)
        // -----------------------------------------------
        messages.push({
            phone: ctx.phone,
            content: `⏰ Caffeine cutoff reminder (2pm). Caffeine's half-life is ~5–6 hours — a 2pm coffee still has ~25% activity at ${ctx.sleepTime}. Switch to herbal tea or water for the rest of the day.`,
            scheduledAt: nextOccurrence(14, 0, ctx.timezone),
            tag: 'sleep_caffeine_cutoff',
            recurrence: 'daily',
        })

        // -----------------------------------------------
        // Pre-sleep stack (1h before bed)
        // -----------------------------------------------
        const magHour = Math.max(sleepHour - 1, 20)
        const preStackItems = [
            '🌙 1-hour wind-down stack:',
            '',
            config.hasMagnesium ? '• Magnesium Glycinate (400mg) — muscle relaxation, nervous system downregulation' : null,
            config.hasAshwagandha ? '• Ashwagandha (600mg) — cortisol reduction, adaptogenic calm' : null,
            config.hasL_theanine ? '• L-Theanine (200mg) — alpha-wave promotion, anxiety-free calm' : null,
            '',
            'Dim lights to 10% or switch to red/amber now.',
            'Reply "done" when taken.',
        ].filter(Boolean).join('\n')

        messages.push({
            phone: ctx.phone,
            content: preStackItems,
            scheduledAt: nextOccurrence(magHour, sleepMin, ctx.timezone),
            tag: 'sleep_pre_stack',
            recurrence: 'daily',
        })

        // -----------------------------------------------
        // Wind-down protocol (30 min before bed)
        // -----------------------------------------------
        const windDownHour = sleepMin >= 30 ? sleepHour : Math.max(sleepHour - 1, 20)
        const windDownMin = sleepMin >= 30 ? sleepMin - 30 : sleepMin + 30
        messages.push({
            phone: ctx.phone,
            content: [
                `💤 30-minute sleep protocol:`,
                '',
                config.hasMelatonin ? '• Take Melatonin (0.5mg) now — low dose is physiological, high dose disrupts architecture' : null,
                '• Phones on Do Not Disturb and face-down',
                '• Room temperature: 65–68°F (18–20°C) — core temp must drop for sleep onset',
                '• Final water glass now (avoid waking for bathroom)',
                '• Light stretching or box breathing (4s in, 4s hold, 4s out, 4s hold)',
                '',
                `Target lights out: ${ctx.sleepTime}. Consistent bedtime is more important than duration.`,
            ].filter(Boolean).join('\n'),
            scheduledAt: nextOccurrence(windDownHour, windDownMin, ctx.timezone),
            tag: 'sleep_wind_down',
            recurrence: 'daily',
        })

        return messages
    }

    buildWelcomeMessage(ctx: ProtocolContext, config: SleepProtocolConfig): string {
        const hoursInBed = (() => {
            const { hour: w, minute: wm } = parseHHMM(ctx.wakeTime)
            const { hour: s, minute: sm } = parseHHMM(ctx.sleepTime)
            const wakeMin = w * 60 + wm
            const sleepMin = s * 60 + sm
            return ((wakeMin + 1440 - sleepMin) % 1440) / 60
        })()

        return [
            `🌙 Sleep & Recovery Protocol — ${ctx.name}`,
            '',
            `Target: ${config.targetSleepHours}h sleep · ${hoursInBed.toFixed(1)}h window · Wake ${ctx.wakeTime} / Sleep ${ctx.sleepTime}`,
            '',
            'Daily schedule:',
            '• Morning — light exposure anchor (within 30 min of wake)',
            config.trackSleepScore ? '• Morning — sleep quality check-in (rate 1–10)' : null,
            '• 2pm — caffeine cutoff reminder',
            '• 1h before bed — magnesium + adaptogens stack',
            '• 30 min before bed — full wind-down protocol',
            '',
            'Circadian consistency amplifies everything else in your stack. Same times, every day.',
        ].filter(Boolean).join('\n')
    }
}
