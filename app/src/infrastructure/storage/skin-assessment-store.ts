import type Database from 'better-sqlite3'
import type { SkinAssessment, SkinDimensions, SkinType, SkinCondition, AssessmentSource } from '../../domain/skin/assessment.ts'

// -----------------------------------------------
// Row mapping
// -----------------------------------------------

type AssessmentRow = Record<string, unknown>

function rowToAssessment(row: AssessmentRow): SkinAssessment {
    return {
        id:            row['id'] as number,
        userId:        row['user_id'] as string,
        photoHash:     row['photo_hash'] as string,
        assessedAt:    row['assessed_at'] as number,
        skinType:      row['skin_type'] as SkinType,
        conditions:    JSON.parse(row['conditions'] as string) as SkinCondition[],
        cnnConfidence: row['cnn_confidence'] != null ? (row['cnn_confidence'] as number) : null,
        scores:        JSON.parse(row['scores'] as string) as SkinDimensions,
        overallScore:  row['overall_score'] as number,
        aiNotes:       row['ai_notes'] as string,
        source:        row['source'] as AssessmentSource,
    }
}

// -----------------------------------------------
// Store
// -----------------------------------------------

export class SkinAssessmentStore {
    private readonly db: Database.Database

    constructor(db: Database.Database) {
        this.db = db
    }

    // -----------------------------------------------
    // Write
    // -----------------------------------------------

    log(entry: Omit<SkinAssessment, 'id'>): SkinAssessment {
        const result = this.db.prepare(`
            INSERT INTO skin_assessments
                (user_id, photo_hash, assessed_at, skin_type, conditions,
                 cnn_confidence, scores, overall_score, ai_notes, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            entry.userId,
            entry.photoHash,
            entry.assessedAt,
            entry.skinType,
            JSON.stringify(entry.conditions),
            entry.cnnConfidence ?? null,
            JSON.stringify(entry.scores),
            entry.overallScore,
            entry.aiNotes,
            entry.source,
        )

        return this.findById(result.lastInsertRowid as number)!
    }

    // -----------------------------------------------
    // Read
    // -----------------------------------------------

    findById(id: number): SkinAssessment | null {
        const row = this.db.prepare(
            'SELECT * FROM skin_assessments WHERE id = ?'
        ).get(id) as AssessmentRow | undefined
        return row ? rowToAssessment(row) : null
    }

    // Most recent assessment for a user
    getLatest(userId: string): SkinAssessment | null {
        const row = this.db.prepare(`
            SELECT * FROM skin_assessments
            WHERE user_id = ?
            ORDER BY assessed_at DESC
            LIMIT 1
        `).get(userId) as AssessmentRow | undefined
        return row ? rowToAssessment(row) : null
    }

    // Most recent assessment before a given timestamp (for trend comparison)
    getLatestBefore(userId: string, beforeMs: number): SkinAssessment | null {
        const row = this.db.prepare(`
            SELECT * FROM skin_assessments
            WHERE user_id = ? AND assessed_at < ?
            ORDER BY assessed_at DESC
            LIMIT 1
        `).get(userId, beforeMs) as AssessmentRow | undefined
        return row ? rowToAssessment(row) : null
    }

    // Full history, oldest→newest, optional day window
    getHistory(userId: string, limitDays = 90): SkinAssessment[] {
        const since = Date.now() - limitDays * 86_400_000
        return (this.db.prepare(`
            SELECT * FROM skin_assessments
            WHERE user_id = ? AND assessed_at >= ?
            ORDER BY assessed_at ASC
        `).all(userId, since) as AssessmentRow[]).map(rowToAssessment)
    }

    // Check if a photo hash already exists (deduplication)
    existsByHash(userId: string, photoHash: string): boolean {
        const row = this.db.prepare(
            'SELECT id FROM skin_assessments WHERE user_id = ? AND photo_hash = ?'
        ).get(userId, photoHash) as { id: number } | undefined
        return row !== undefined
    }

    // Count assessments for a user
    count(userId: string): number {
        const row = this.db.prepare(
            'SELECT COUNT(*) as n FROM skin_assessments WHERE user_id = ?'
        ).get(userId) as { n: number }
        return row.n
    }

    // -----------------------------------------------
    // Delete
    // -----------------------------------------------

    delete(id: number): boolean {
        const result = this.db.prepare('DELETE FROM skin_assessments WHERE id = ?').run(id)
        return result.changes > 0
    }

    deleteForUser(userId: string): void {
        this.db.prepare('DELETE FROM skin_assessments WHERE user_id = ?').run(userId)
    }
}
