import type { SkinDimensions } from '../../../domain/skin/assessment.ts'

// -----------------------------------------------
// System template — cached across all vision calls
// -----------------------------------------------

export const SKIN_VISION_TEMPLATE = `You are a dermatology-informed AI analyzing a facial photograph for a longitudinal wellness tracking application.

Score the following 7 skin dimensions on a 1–10 scale (10 = optimal). Base scores only on what is directly visible in the photo.

Dimensions:
1. clarity   — Absence of acne, blemishes, whiteheads, blackheads, post-inflammatory marks. 10 = completely clear.
2. hydration — Balanced moisture. Neither flaky/tight/dull (too dry) nor excessively shiny/greasy (too oily). 10 = plump, dewy, balanced.
3. texture   — Surface smoothness and pore refinement. 10 = smooth, tight pores, even surface.
4. evenness  — Consistent skin tone. Minimal hyperpigmentation, dark spots, sun damage, or melasma. 10 = perfectly uniform.
5. radiance  — Natural glow and healthy colour. 10 = luminous, vibrant, visibly healthy.
6. redness   — Absence of redness, rosacea indicators, or visible inflammation. 10 = no redness visible.
7. firmness  — Visible elasticity, minimal fine lines or sagging around eyes and mouth. 10 = firm, youthful contours.

Return ONLY valid JSON — no prose, no markdown, no explanation outside the schema:

{
  "skinType": "oily" | "dry" | "combination" | "normal" | "unknown",
  "conditions": [],
  "scores": {
    "clarity":   <1–10>,
    "hydration": <1–10>,
    "texture":   <1–10>,
    "evenness":  <1–10>,
    "radiance":  <1–10>,
    "redness":   <1–10>,
    "firmness":  <1–10>
  },
  "aiNotes": "<2–3 sentence wellness observation — specific, actionable, encouraging>"
}

Condition values (include only what is visibly present):
acne | rosacea | eczema | hyperpigmentation | melasma | perioral-dermatitis | seborrheic-dermatitis | psoriasis | contact-dermatitis

Hard rules:
- If face is obscured, lighting is very poor, or the image is not a facial photo, set all scores to 0 and explain in aiNotes
- Never use clinical diagnostic language — use wellness/observational language only
- aiNotes must be ≤3 sentences and mobile-readable
- Score conservatively — a 10 means genuinely flawless in that dimension`

// -----------------------------------------------
// Per-call user message builder
// -----------------------------------------------

export interface SkinVisionUserContext {
    userName:    string
    weekNumber:  number          // weeks since onboarding
    priorScores: SkinDimensions | null  // last assessment scores for comparative analysis
    skinGoals:   string[]
}

export function buildSkinVisionPrompt(ctx: SkinVisionUserContext): string {
    const lines = [
        `User: ${ctx.userName} (week ${ctx.weekNumber} of their skin protocol)`,
        `Skin goals: ${ctx.skinGoals.length > 0 ? ctx.skinGoals.join(', ') : 'general improvement'}`,
    ]

    if (ctx.priorScores) {
        const prior = Object.entries(ctx.priorScores)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        lines.push(`Prior week scores: ${prior}`)
        lines.push('Note any meaningful changes from the prior scores in your aiNotes.')
    } else {
        lines.push('This is their first assessment — establish a baseline and set expectations in aiNotes.')
    }

    lines.push('', 'Analyze the attached facial photo and return your assessment as JSON.')
    return lines.join('\n')
}
