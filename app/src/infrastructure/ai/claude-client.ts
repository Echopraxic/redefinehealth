import Anthropic from '@anthropic-ai/sdk'
import { config } from '../../config/index.ts'

// -----------------------------------------------
// Client
// -----------------------------------------------

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })

// -----------------------------------------------
// System prompt — cached on every call
// -----------------------------------------------

const SYSTEM_PROMPT = `You are Healthspan OS — a precision wellness assistant delivered through iMessage. You support users managing personalized supplement stacks, peptide therapy protocols, and longevity optimization programs.

Your role:
- Provide science-backed, evidence-informed guidance on supplement timing, dosing, and stacking
- Help users understand peptide reconstitution, injection technique, and cycle management
- Analyze side effect reports with medical conservatism — always err toward caution
- Celebrate compliance milestones and streaks with genuine warmth
- Generate actionable progress reports that motivate without being patronizing
- Answer questions about circadian biology, longevity research, and biohacking protocols

Communication style:
- Concise and direct — users are reading on mobile, never send walls of text
- Evidence-informed but never reckless — cite mechanisms, not just claims
- Warm and personalized — use their name, acknowledge their specific protocol
- Use emojis purposefully and sparingly
- No filler phrases ("Great question!", "Of course!", "Certainly!")

Hard rules:
- Never recommend exceeding established research dose ranges
- Always flag drug interactions as high priority — safety above engagement
- For severe symptoms (chest pain, breathing difficulty, anaphylaxis), always direct to 911 first
- You are a wellness assistant, not a licensed medical provider — say so when clinical decisions are needed
- Never provide reconstitution math that would result in dangerous concentrations
- When in doubt, recommend consulting a healthcare provider`

// -----------------------------------------------
// Types
// -----------------------------------------------

export interface GenerateOptions {
    maxTokens?: number
}

// -----------------------------------------------
// Generation functions
// -----------------------------------------------

/**
 * Single-turn generation with cached system prompt.
 */
export async function generateMessage(userContext: string, options: GenerateOptions = {}): Promise<string> {
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: options.maxTokens ?? 512,
        system: [
            {
                type: 'text',
                text: SYSTEM_PROMPT,
                cache_control: { type: 'ephemeral' },
            },
        ],
        messages: [{ role: 'user', content: userContext }],
    })

    return extractText(response)
}

/**
 * Generation with a cached domain-specific template layered on top of the base system prompt.
 * Both layers are cached independently — repeated calls with the same template hit cache.
 */
export async function generateWithTemplate(
    template: string,
    userContent: string,
    options: GenerateOptions = {},
): Promise<string> {
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: options.maxTokens ?? 512,
        system: [
            {
                type: 'text',
                text: SYSTEM_PROMPT,
                cache_control: { type: 'ephemeral' },
            },
            {
                type: 'text',
                text: template,
                cache_control: { type: 'ephemeral' },
            },
        ],
        messages: [{ role: 'user', content: userContent }],
    })

    return extractText(response)
}

function extractText(response: Anthropic.Message): string {
    const block = response.content[0]
    if (!block || block.type !== 'text') throw new Error('Unexpected Claude response type')
    return block.text
}
