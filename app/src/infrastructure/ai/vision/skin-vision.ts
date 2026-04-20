import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { config } from '../../../config/index.ts'
import {
    SKIN_VISION_TEMPLATE,
    buildSkinVisionPrompt,
    type SkinVisionUserContext,
} from '../prompt-templates/skin-vision.ts'
import {
    computeOverallScore,
    type SkinDimensions,
    type SkinType,
    type SkinCondition,
} from '../../../domain/skin/assessment.ts'

// -----------------------------------------------
// Types
// -----------------------------------------------

export interface SkinVisionResult {
    skinType:     SkinType
    conditions:   SkinCondition[]
    scores:       SkinDimensions
    overallScore: number
    aiNotes:      string
}

type SupportedMimeType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

// -----------------------------------------------
// Client — singleton, mirrors pattern in claude-client.ts
// -----------------------------------------------

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })

// -----------------------------------------------
// MIME type detection
// -----------------------------------------------

const MIME_MAP: Record<string, SupportedMimeType> = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
}

export function detectMimeType(filePath: string): SupportedMimeType | null {
    return MIME_MAP[extname(filePath).toLowerCase()] ?? null
}

// -----------------------------------------------
// JSON parsing + validation
// -----------------------------------------------

const VALID_SKIN_TYPES = new Set<SkinType>(['oily', 'dry', 'combination', 'normal', 'unknown'])
const VALID_CONDITIONS = new Set<SkinCondition>([
    'acne', 'rosacea', 'eczema', 'hyperpigmentation', 'melasma',
    'perioral-dermatitis', 'seborrheic-dermatitis', 'psoriasis', 'contact-dermatitis',
])

function clamp(n: unknown): number {
    const num = typeof n === 'number' ? n : Number(n)
    return isNaN(num) ? 5 : Math.min(10, Math.max(1, Math.round(num)))
}

function parseVisionResponse(raw: string): SkinVisionResult {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON object found in vision response')

    const parsed = JSON.parse(match[0]) as Record<string, unknown>

    const skinType: SkinType = VALID_SKIN_TYPES.has(parsed['skinType'] as SkinType)
        ? (parsed['skinType'] as SkinType)
        : 'unknown'

    const conditions: SkinCondition[] = Array.isArray(parsed['conditions'])
        ? (parsed['conditions'] as string[]).filter(c => VALID_CONDITIONS.has(c as SkinCondition)) as SkinCondition[]
        : []

    const rawScores = (parsed['scores'] ?? {}) as Record<string, unknown>
    const scores: SkinDimensions = {
        clarity:   clamp(rawScores['clarity']),
        hydration: clamp(rawScores['hydration']),
        texture:   clamp(rawScores['texture']),
        evenness:  clamp(rawScores['evenness']),
        radiance:  clamp(rawScores['radiance']),
        redness:   clamp(rawScores['redness']),
        firmness:  clamp(rawScores['firmness']),
    }

    const aiNotes = typeof parsed['aiNotes'] === 'string' ? parsed['aiNotes'].trim() : ''
    const overallScore = computeOverallScore(scores)

    return { skinType, conditions, scores, overallScore, aiNotes }
}

// -----------------------------------------------
// Main vision call
// -----------------------------------------------

export async function analyzeSkinPhoto(
    imagePath: string,
    ctx: SkinVisionUserContext,
): Promise<SkinVisionResult> {
    const mimeType = detectMimeType(imagePath)
    if (!mimeType) {
        throw new Error(
            `Unsupported image format: ${extname(imagePath)}. Supported: jpg, jpeg, png, gif, webp. ` +
            'HEIC images from iPhone must be converted first.'
        )
    }

    const imageData = readFileSync(imagePath).toString('base64')
    const userText  = buildSkinVisionPrompt(ctx)

    const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 512,
        system: [
            {
                type:          'text',
                text:          SKIN_VISION_TEMPLATE,
                cache_control: { type: 'ephemeral' },
            },
        ],
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type:   'image',
                        source: { type: 'base64', media_type: mimeType, data: imageData },
                    },
                    {
                        type: 'text',
                        text: userText,
                    },
                ],
            },
        ],
    })

    const block = response.content[0]
    if (!block || block.type !== 'text') {
        throw new Error('Unexpected response type from Claude Vision')
    }

    return parseVisionResponse(block.text)
}

// -----------------------------------------------
// HEIC detection helper — call before analyzeSkinPhoto
// to gate unsupported iPhone format early
// -----------------------------------------------

export function isHeicImage(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase()
    return ext === '.heic' || ext === '.heif'
}
