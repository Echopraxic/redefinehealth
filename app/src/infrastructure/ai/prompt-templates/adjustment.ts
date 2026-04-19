// -----------------------------------------------
// Adjustment intent parsing template
// -----------------------------------------------

export const ADJUSTMENT_PARSE_TEMPLATE = `You are analyzing a protocol adjustment request from a wellness app user.

Your task: parse the user's message into a structured adjustment intent.

Return ONLY valid JSON — no prose, no markdown, no explanation.

Schema (high confidence):
{
  "target": "exact supplement or peptide name from user stack",
  "changeType": "dose" | "timing" | "pause" | "stop" | "resume",
  "newValue": "new dose or timing string, or null if not specified",
  "confidence": "high",
  "clarificationQuestion": null
}

Schema (low confidence — ambiguous target or intent):
{
  "target": null,
  "changeType": "unknown",
  "newValue": null,
  "confidence": "low",
  "clarificationQuestion": "single targeted clarifying question"
}

Rules:
- confidence = "high" only when target is unambiguous AND changeType is clear
- "pause" = temporary break; "stop" = permanent removal from stack
- Normalize timing to one of: morning, with-meal, afternoon, evening, bedtime
- Extract dose values as-is with units (e.g. "5000 IU", "200 mcg", "400 mg")
- Match target against the user's current stack — use exact names from the stack list`

export function buildAdjustmentParsePrompt(
    userText: string,
    stack: Array<{ name: string; dose: string; timing: string }>,
    peptides: Array<{ name: string; active: boolean }>,
): string {
    const stackList = stack.length > 0
        ? stack.map(s => `  • ${s.name} (${s.dose}, ${s.timing})`).join('\n')
        : '  (none)'
    const peptideList = peptides.length > 0
        ? peptides.map(p => `  • ${p.name} (${p.active ? 'active' : 'inactive'})`).join('\n')
        : '  (none)'

    return [
        `User's supplement stack:\n${stackList}`,
        `User's peptides:\n${peptideList}`,
        `User message: "${userText}"`,
    ].join('\n\n')
}

// -----------------------------------------------
// Protocol recommendation template
// -----------------------------------------------

export const RECOMMENDATION_TEMPLATE = `You are a precision wellness protocol advisor reviewing a user's supplement and peptide protocol.

Guidelines:
- Base all suggestions on the compliance data, biomarker trends, and stated goals provided
- Prioritize safety — never suggest dose increases beyond established research ranges
- Be specific: name supplements/peptides, suggest concrete changes with rationale
- Flag any interactions introduced by proposed changes
- Keep response under 300 words — mobile-first format with bullet points
- End with one high-priority action item the user can take this week`

export function buildRecommendationPrompt(
    userName: string,
    goals: string[],
    complianceSummary: string,
    biomarkerSummary: string,
    currentStack: Array<{ name: string; dose: string }>,
    titrationNotes: string[],
): string {
    const lines = [
        `Patient: ${userName}`,
        `Goals: ${goals.join(', ')}`,
        `Current stack: ${currentStack.map(s => `${s.name} ${s.dose}`).join(', ') || 'none'}`,
    ]
    if (complianceSummary)       lines.push(`Compliance (30d): ${complianceSummary}`)
    if (biomarkerSummary)        lines.push(`Biomarker trends: ${biomarkerSummary}`)
    if (titrationNotes.length > 0) lines.push(`Titration opportunities: ${titrationNotes.join('; ')}`)
    lines.push('', 'Provide protocol optimization recommendations based on the above data.')
    return lines.join('\n')
}
