import { definePlugin } from '@photon-ai/imessage-kit'

/**
 * Hook point for AI content enrichment on outgoing messages.
 *
 * Current MVP behaviour: pass-through (AI generation happens in the application layer).
 *
 * Future use: tag scheduled messages with metadata (e.g. `__ENRICH_WELCOME__`) and
 * intercept here to add personalized AI-generated P.S. lines, emoji, or tone adaptation
 * without touching the application layer.
 */
export function aiGenerationPlugin() {
    return definePlugin({
        name: 'healthspan-ai-generation',
        onBeforeSend: async (_ctx) => {
            // Intentional no-op in MVP.
            // Future: inspect _ctx.request.content for enrichment markers, call Claude, swap content.
        },
    })
}
