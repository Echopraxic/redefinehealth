import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { SkinAssessmentStore } from '../../infrastructure/storage/skin-assessment-store.ts'
import { analyzeSkinPhoto } from '../../infrastructure/ai/vision/skin-vision.ts'
import { callSkinCnn } from '../../infrastructure/python/skin-cnn-client.ts'
import {
    computeTrend,
    formatAssessmentMessage,
    formatProgressTimeline,
    type SkinAssessment,
    type SkinCondition,
    type SkinProgress,
} from '../../domain/skin/assessment.ts'

// -----------------------------------------------
// SkinAssessmentService
// -----------------------------------------------

export class SkinAssessmentService {
    constructor(
        private readonly store: SkinAssessmentStore,
        private readonly users: UserRepository,
    ) {}

    // -----------------------------------------------
    // Analyze a photo — returns formatted iMessage reply,
    // or null if the photo was already analyzed (duplicate)
    // -----------------------------------------------

    async analyze(imagePath: string, userId: string): Promise<string | null> {
        const user = this.users.findById(userId)
        if (!user) return null

        // 1. Deduplication — same file hash = same photo, skip re-analysis
        const photoHash = hashFile(imagePath)
        if (this.store.existsByHash(userId, photoHash)) return null

        // 2. Build vision context
        const priorAssessment = this.store.getLatest(userId)
        const weekNumber = Math.max(1, Math.ceil((Date.now() - user.createdAt) / (7 * 86_400_000)))
        const skinGoals = user.goals.includes('skin') ? ['anti-aging', 'clarity'] : []

        // 3. CNN call (optional — returns null if SKIN_API_URL not set or service down)
        const cnnResult = await callSkinCnn(imagePath).catch(() => null)

        // 4. Claude Vision scoring (primary engine)
        const visionResult = await analyzeSkinPhoto(imagePath, {
            userName:    user.name,
            weekNumber,
            priorScores: priorAssessment?.scores ?? null,
            skinGoals,
        })

        // 5. Merge — CNN wins on objective classification when confident;
        //    Claude Vision always provides the subjective dimension scores
        const skinType = cnnResult && cnnResult.confidence >= 0.6
            ? cnnResult.skinType
            : visionResult.skinType

        const conditions = mergeConditions(
            cnnResult?.conditions ?? [],
            visionResult.conditions,
        )

        // 6. Store
        const stored = this.store.log({
            userId,
            photoHash,
            assessedAt:    Date.now(),
            skinType,
            conditions,
            cnnConfidence: cnnResult?.confidence ?? null,
            scores:        visionResult.scores,
            overallScore:  visionResult.overallScore,
            aiNotes:       visionResult.aiNotes,
            source:        cnnResult ? 'hybrid' : 'claude-only',
        })

        // 7. Trend vs 7 days ago, count all-time for context
        const prior7d     = this.store.getLatestBefore(userId, stored.assessedAt - 7 * 86_400_000)
        const totalCount  = this.store.count(userId)
        const trend       = computeTrend(stored, prior7d, totalCount)

        return formatAssessmentMessage(stored, trend)
    }

    // -----------------------------------------------
    // Progress snapshot — latest + trend vs 7d and 30d
    // -----------------------------------------------

    getProgress(userId: string): SkinProgress | null {
        const latest = this.store.getLatest(userId)
        if (!latest) return null

        const prior7d  = this.store.getLatestBefore(userId, latest.assessedAt - 7 * 86_400_000)
        const prior30d = this.store.getLatestBefore(userId, latest.assessedAt - 30 * 86_400_000)
        const count    = this.store.count(userId)

        return {
            latest,
            prior7d,
            prior30d,
            trend7d:  computeTrend(latest, prior7d,  count),
            trend30d: computeTrend(latest, prior30d, count),
        }
    }

    // -----------------------------------------------
    // Timeline — last 6 assessments as iMessage text
    // -----------------------------------------------

    getTimeline(userId: string): string {
        return formatProgressTimeline(this.store.getHistory(userId, 90))
    }
}

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function hashFile(filePath: string): string {
    return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function mergeConditions(cnn: SkinCondition[], vision: SkinCondition[]): SkinCondition[] {
    return [...new Set([...cnn, ...vision])]
}
