import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { ComplianceStore } from '../../infrastructure/storage/compliance-store.ts'
import type { BiomarkerStore } from '../../infrastructure/storage/biomarker-store.ts'
import type { Goal, Supplement, PeptideProtocol, SupplementTiming } from '../../domain/user-profile.ts'
import { generateWithTemplate } from '../../infrastructure/ai/claude-client.ts'
import {
    ADJUSTMENT_PARSE_TEMPLATE,
    buildAdjustmentParsePrompt,
    RECOMMENDATION_TEMPLATE,
    buildRecommendationPrompt,
} from '../../infrastructure/ai/prompt-templates/adjustment.ts'
import {
    scoreSupplementFit,
    scorePeptideFit,
    enrichWithBiomarkers,
    buildCycleCalendar,
    formatCycleCalendar,
    checkTitration,
    type TitrationNote,
} from '../../domain/protocols/plan-optimizer.ts'
import { analyzeTrend } from '../../domain/biomarkers/analyzer.ts'

// -----------------------------------------------
// Types
// -----------------------------------------------

export type AdjustmentChangeType = 'dose' | 'timing' | 'pause' | 'stop' | 'resume' | 'unknown'

export interface AdjustmentIntent {
    target: string | null
    changeType: AdjustmentChangeType
    newValue: string | null
    confidence: 'high' | 'low'
    clarificationQuestion: string | null
}

export interface AdjustmentResult {
    applied: boolean
    message: string
}

// -----------------------------------------------
// PlanService
// -----------------------------------------------

export class PlanService {
    constructor(
        private readonly users: UserRepository,
        private readonly compliance: ComplianceStore,
        private readonly biomarkers: BiomarkerStore,
    ) {}

    // -----------------------------------------------
    // Parse adjustment intent from natural language
    // -----------------------------------------------

    async parseAdjustmentIntent(text: string, userId: string): Promise<AdjustmentIntent | null> {
        const user = this.users.findById(userId)
        if (!user) return null

        const prompt = buildAdjustmentParsePrompt(
            text,
            user.stack.map(s => ({ name: s.name, dose: s.dose, timing: s.timing })),
            user.peptides.map(p => ({ name: p.name, active: p.active })),
        )

        try {
            const raw = await generateWithTemplate(ADJUSTMENT_PARSE_TEMPLATE, prompt, { maxTokens: 256 })
            const match = raw.match(/\{[\s\S]*\}/)
            if (!match) return null
            return JSON.parse(match[0]) as AdjustmentIntent
        } catch {
            return null
        }
    }

    // -----------------------------------------------
    // Apply a high-confidence adjustment to the user's profile
    // -----------------------------------------------

    applyAdjustment(userId: string, intent: AdjustmentIntent): AdjustmentResult {
        const user = this.users.findById(userId)
        if (!user || !intent.target) return { applied: false, message: 'User or target not found.' }

        const targetLc = intent.target.toLowerCase()

        const suppIdx = user.stack.findIndex(s =>
            s.name.toLowerCase().includes(targetLc) || targetLc.includes(s.name.toLowerCase())
        )
        if (suppIdx >= 0) {
            return this.applySupplementAdjustment(userId, user.stack[suppIdx]!, suppIdx, user.stack, intent)
        }

        const pepIdx = user.peptides.findIndex(p =>
            p.name.toLowerCase().includes(targetLc) || targetLc.includes(p.name.toLowerCase())
        )
        if (pepIdx >= 0) {
            return this.applyPeptideAdjustment(userId, user.peptides[pepIdx]!, pepIdx, user.peptides, intent)
        }

        return {
            applied: false,
            message: `I couldn't find "${intent.target}" in your protocol. Text "protocols" to see your current stack.`,
        }
    }

    private applySupplementAdjustment(
        userId: string,
        supp: Supplement,
        idx: number,
        stack: Supplement[],
        intent: AdjustmentIntent,
    ): AdjustmentResult {
        const newStack = [...stack]

        switch (intent.changeType) {
            case 'dose': {
                if (!intent.newValue) return { applied: false, message: 'No dose value specified.' }
                newStack[idx] = { ...supp, dose: intent.newValue }
                this.users.update(userId, { stack: newStack })
                return { applied: true, message: `✅ ${supp.name} dose updated: ${supp.dose} → ${intent.newValue}.` }
            }
            case 'timing': {
                if (!intent.newValue) return { applied: false, message: 'No timing value specified.' }
                const validTimings: SupplementTiming[] = ['morning', 'with-meal', 'afternoon', 'evening', 'bedtime']
                if (!validTimings.includes(intent.newValue as SupplementTiming)) {
                    return { applied: false, message: `Invalid timing. Choose: ${validTimings.join(', ')}` }
                }
                newStack[idx] = { ...supp, timing: intent.newValue as SupplementTiming }
                this.users.update(userId, { stack: newStack })
                return { applied: true, message: `✅ ${supp.name} moved to ${intent.newValue}.` }
            }
            case 'pause': {
                newStack[idx] = { ...supp, frequency: 'cycle-off' }
                this.users.update(userId, { stack: newStack })
                return { applied: true, message: `⏸️ ${supp.name} paused. Text "resume ${supp.name}" when ready.` }
            }
            case 'stop': {
                this.users.update(userId, { stack: stack.filter((_, i) => i !== idx) })
                return { applied: true, message: `🗑️ ${supp.name} removed from your stack.` }
            }
            case 'resume': {
                newStack[idx] = { ...supp, frequency: 'daily' }
                this.users.update(userId, { stack: newStack })
                return { applied: true, message: `▶️ ${supp.name} resumed on daily schedule.` }
            }
            default:
                return { applied: false, message: 'Unrecognized adjustment type.' }
        }
    }

    private applyPeptideAdjustment(
        userId: string,
        pep: PeptideProtocol,
        idx: number,
        peptides: PeptideProtocol[],
        intent: AdjustmentIntent,
    ): AdjustmentResult {
        const newPeptides = [...peptides]

        switch (intent.changeType) {
            case 'dose': {
                if (!intent.newValue) return { applied: false, message: 'No dose value specified.' }
                const mcg = parseInt(intent.newValue, 10)
                if (isNaN(mcg)) return { applied: false, message: 'Could not parse dose value.' }
                newPeptides[idx] = { ...pep, doseMcg: mcg }
                this.users.update(userId, { peptides: newPeptides })
                return {
                    applied: true,
                    message: `✅ ${pep.name} updated to ${mcg}mcg. Text "reconstitute ${pep.name}" for an updated mixing guide.`,
                }
            }
            case 'pause': {
                newPeptides[idx] = { ...pep, active: false }
                this.users.update(userId, { peptides: newPeptides })
                return { applied: true, message: `⏸️ ${pep.name} cycle paused. Text "resume ${pep.name}" to restart.` }
            }
            case 'stop': {
                newPeptides[idx] = { ...pep, active: false }
                this.users.update(userId, { peptides: newPeptides })
                return { applied: true, message: `🔄 ${pep.name} cycle ended. Your ${pep.restWeeks}-week rest period begins now.` }
            }
            case 'resume': {
                const today = new Date().toISOString().split('T')[0]!
                newPeptides[idx] = { ...pep, active: true, startDate: today }
                this.users.update(userId, { peptides: newPeptides })
                return { applied: true, message: `▶️ ${pep.name} cycle restarted from today.` }
            }
            default:
                return {
                    applied: false,
                    message: `Timing adjustments aren't applicable for peptides. Try: pause, stop, or resume ${pep.name}.`,
                }
        }
    }

    // -----------------------------------------------
    // AI-generated protocol recommendations
    // -----------------------------------------------

    async generateRecommendations(userId: string): Promise<string | null> {
        const user = this.users.findById(userId)
        if (!user) return null

        const records = this.compliance.getAllComplianceHistory(userId, 30)

        const suppScores = user.stack.map(s => scoreSupplementFit(s, records))
        const pepScores  = user.peptides.filter(p => p.active).map(p => scorePeptideFit(p, records))

        // Enrich with biomarker trends for non-stable, data-rich markers
        const latestBiomarkers = this.biomarkers.getLatestAll(userId)
        const trends = latestBiomarkers.flatMap(entry => {
            const history = this.biomarkers.getHistory(userId, entry.markerName, 60)
            if (history.length < 2) return []
            const trend = analyzeTrend(history, entry.markerName)
            return trend.direction !== 'stable' && trend.direction !== 'insufficient_data' ? [trend] : []
        })

        const allScores = enrichWithBiomarkers([...suppScores, ...pepScores], trends)
        const titrationNotes = checkTitration(user.peptides, allScores)

        const complianceSummary = allScores
            .map(s => `${s.name}: ${Math.round(s.complianceRate * 100)}%`)
            .join(', ')

        const biomarkerSummary = trends
            .map(t => `${t.displayName} ${t.direction} (${t.percentChange >= 0 ? '+' : ''}${t.percentChange}%)`)
            .join(', ')

        const prompt = buildRecommendationPrompt(
            user.name,
            user.goals,
            complianceSummary,
            biomarkerSummary,
            user.stack.map(s => ({ name: s.name, dose: s.dose })),
            titrationNotes.map(n => n.message),
        )

        return generateWithTemplate(RECOMMENDATION_TEMPLATE, prompt, { maxTokens: 400 })
    }

    // -----------------------------------------------
    // Cycle calendar — upcoming peptide events
    // -----------------------------------------------

    getCycleCalendar(userId: string, lookaheadDays = 14): string {
        const user = this.users.findById(userId)
        if (!user) return 'User not found.'
        return formatCycleCalendar(buildCycleCalendar(user.peptides, lookaheadDays))
    }

    // -----------------------------------------------
    // Goal update flow
    // -----------------------------------------------

    updateGoals(
        userId: string,
        newGoals: Goal[],
    ): { added: Goal[]; removed: Goal[]; message: string } | null {
        const user = this.users.findById(userId)
        if (!user) return null

        const currentSet   = new Set(user.goals)
        const requestedSet = new Set(newGoals)

        const added   = newGoals.filter(g => !currentSet.has(g))
        const removed = user.goals.filter(g => !requestedSet.has(g))

        this.users.update(userId, { goals: newGoals })

        const parts: string[] = []
        if (added.length > 0)   parts.push(`Added: ${added.join(', ')}`)
        if (removed.length > 0) parts.push(`Removed: ${removed.join(', ')}`)

        const message = parts.length > 0
            ? `✅ Goals updated. ${parts.join('. ')}\n\nText "protocols" to see your updated protocol set, or "adjust [supplement]" to fine-tune your stack.`
            : `Your goals are already set to: ${newGoals.join(', ')}.`

        return { added, removed, message }
    }

    // -----------------------------------------------
    // Parse goal update from natural language text
    // -----------------------------------------------

    parseGoalUpdate(text: string): Goal[] | null {
        const GOAL_PATTERNS: Array<[Goal, RegExp]> = [
            ['skin',               /\b(skin|complexion|face|glow|anti.?aging)\b/i],
            ['energy',             /\b(energy|energi|fatigue|tired|vitality)\b/i],
            ['sleep',              /\b(sleep|insomnia|rest|recovery)\b/i],
            ['longevity',          /\b(longevity|lifespan|aging|longevit)\b/i],
            ['cognition',          /\b(cognition|cognitive|brain|focus|memory|clarity)\b/i],
            ['body-composition',   /\b(body.?comp|muscle|fat.?loss|lean|physique|weight)\b/i],
        ]

        const found: Goal[] = []
        for (const [goal, pattern] of GOAL_PATTERNS) {
            if (pattern.test(text)) found.push(goal)
        }
        return found.length > 0 ? found : null
    }

    // -----------------------------------------------
    // Titration check — surface to user
    // -----------------------------------------------

    checkTitrationOpportunities(userId: string): TitrationNote[] {
        const user = this.users.findById(userId)
        if (!user) return []

        const records   = this.compliance.getAllComplianceHistory(userId, 30)
        const pepScores = user.peptides.filter(p => p.active).map(p => scorePeptideFit(p, records))
        return checkTitration(user.peptides, pepScores)
    }
}
