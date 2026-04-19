import { definePlugin } from '@photon-ai/imessage-kit'
import { maskPhone } from '../../utils/phone-mask.ts'

/**
 * Logs every successful outgoing send to stdout with a masked phone number.
 * Provides an audit trail without exposing full phone numbers in logs.
 */
export function complianceLoggerPlugin() {
    return definePlugin({
        name: 'healthspan-compliance-logger',
        onAfterSend: async ({ result }) => {
            const masked = maskPhone(result.to)
            console.log(`[HealthspanOS] ✓ Sent to ${masked} via ${result.service} at ${result.sentAt.toISOString()}`)
        },
        onError: async (ctx) => {
            console.error(`[HealthspanOS] ✗ Send error:`, ctx.error.message)
        },
    })
}
