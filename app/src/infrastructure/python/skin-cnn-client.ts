import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import type { SkinType, SkinCondition } from '../../domain/skin/assessment.ts'

// -----------------------------------------------
// Types
// -----------------------------------------------

export interface CnnResult {
    skinType:       SkinType
    conditions:     SkinCondition[]
    confidence:     number        // 0–1
    lifestyleNotes: string[]      // from Flask lifestyle_suggestions dict
}

// Raw shape returned by the Flask /diagnose endpoint
interface FlaskResponse {
    skin_type?:              string
    predicted_class?:        string   // some Flask builds use this key
    conditions?:             string[]
    confidence?:             number
    lifestyle_suggestions?:  string[]
    product_recommendations?: unknown[]
}

// -----------------------------------------------
// Normalisation — map Flask string labels to union types
// -----------------------------------------------

function normaliseSkinType(raw: string | undefined): SkinType {
    if (!raw) return 'unknown'
    const lc = raw.toLowerCase()
    if (lc.includes('oily'))        return 'oily'
    if (lc.includes('dry'))         return 'dry'
    if (lc.includes('combination')) return 'combination'
    if (lc.includes('normal'))      return 'normal'
    return 'unknown'
}

const CONDITION_MAP: Array<[RegExp, SkinCondition]> = [
    [/acne/i,                                   'acne'],
    [/rosacea/i,                                 'rosacea'],
    [/eczema|atopic/i,                           'eczema'],
    [/hyperpig|dark.?spot/i,                     'hyperpigmentation'],
    [/melasma/i,                                 'melasma'],
    [/perioral/i,                                'perioral-dermatitis'],
    [/seborrhe?ic|seborrh[ao]eic/i,              'seborrheic-dermatitis'],
    [/psoriasis/i,                               'psoriasis'],
    [/contact.?derm/i,                           'contact-dermatitis'],
]

function normaliseCondition(raw: string): SkinCondition | null {
    for (const [pattern, condition] of CONDITION_MAP) {
        if (pattern.test(raw)) return condition
    }
    return null
}

// -----------------------------------------------
// HTTP client — gated behind SKIN_API_URL env var
// Returns null if service is unreachable or unconfigured
// -----------------------------------------------

const TIMEOUT_MS = 10_000

export async function callSkinCnn(imagePath: string): Promise<CnnResult | null> {
    const apiUrl = process.env['SKIN_API_URL']
    if (!apiUrl) return null   // CNN layer not configured — caller falls back to Claude-only

    const mimeType = resolveMime(imagePath)
    if (!mimeType) return null  // unsupported format

    try {
        const imageBuffer = readFileSync(imagePath)
        const blob = new Blob([imageBuffer], { type: mimeType })

        const form = new FormData()
        form.append('image', blob, basename(imagePath))

        const response = await fetch(`${apiUrl.replace(/\/$/, '')}/diagnose`, {
            method: 'POST',
            body:   form,
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })

        if (!response.ok) {
            console.warn(`[SkinCNN] HTTP ${response.status} from ${apiUrl}`)
            return null
        }

        const json = (await response.json()) as FlaskResponse

        const skinType   = normaliseSkinType(json.skin_type ?? json.predicted_class)
        const conditions = (json.conditions ?? [])
            .map(normaliseCondition)
            .filter((c): c is SkinCondition => c !== null)
        const confidence     = typeof json.confidence === 'number' ? json.confidence : 0
        const lifestyleNotes = json.lifestyle_suggestions ?? []

        return { skinType, conditions, confidence, lifestyleNotes }
    } catch (err) {
        // Network error, timeout, or JSON parse failure — degrade gracefully
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[SkinCNN] Unreachable (${msg}) — falling back to Claude-only mode`)
        return null
    }
}

// -----------------------------------------------
// Helpers
// -----------------------------------------------

const MIME_EXTENSIONS: Record<string, string> = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.webp': 'image/webp',
}

function resolveMime(filePath: string): string | null {
    return MIME_EXTENSIONS[extname(filePath).toLowerCase()] ?? null
}

// -----------------------------------------------
// Availability check — call on startup to log status
// -----------------------------------------------

export async function checkCnnAvailability(): Promise<boolean> {
    const apiUrl = process.env['SKIN_API_URL']
    if (!apiUrl) return false

    try {
        const res = await fetch(`${apiUrl.replace(/\/$/, '')}/health`, {
            signal: AbortSignal.timeout(3_000),
        })
        const available = res.ok
        console.log(`[SkinCNN] Service at ${apiUrl} — ${available ? 'available ✓' : `HTTP ${res.status}`}`)
        return available
    } catch {
        console.log(`[SkinCNN] Service at ${apiUrl} — unreachable, running Claude-only`)
        return false
    }
}
