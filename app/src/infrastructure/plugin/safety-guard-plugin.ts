import { definePlugin } from '@photon-ai/imessage-kit'
import { SendError } from '@photon-ai/imessage-kit'

const BLOCKED_PATTERNS = [
    /lethal dose/i,
    /how to overdose/i,
    /help me die/i,
    /want to kill myself/i,
    /self.?harm/i,
]

/**
 * Intercepts outgoing sends and blocks messages containing patterns that should
 * never be sent by a wellness assistant. Throws SendError to abort the send.
 */
export function safetyGuardPlugin() {
    return definePlugin({
        name: 'healthspan-safety-guard',
        onBeforeSend: async ({ request }) => {
            const text = typeof request.content === 'string'
                ? request.content
                : (request.content as Record<string, string>)['text'] ?? ''

            for (const pattern of BLOCKED_PATTERNS) {
                if (pattern.test(text)) {
                    throw SendError(`SafetyGuard blocked outgoing message: matched pattern "${pattern.source}"`)
                }
            }
        },
    })
}
