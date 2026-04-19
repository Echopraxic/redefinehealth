import type Database from 'better-sqlite3'
import type { BiomarkerEntry, BiomarkerSource } from '../../domain/biomarkers/types.ts'

// -----------------------------------------------
// Row mapping
// -----------------------------------------------

type BiomarkerRow = Record<string, unknown>

function rowToEntry(row: BiomarkerRow): BiomarkerEntry {
    return {
        id:          row['id'] as number,
        userId:      row['user_id'] as string,
        markerName:  row['marker_name'] as string,
        value:       row['value'] as number,
        unit:        row['unit'] as string,
        source:      row['source'] as BiomarkerSource,
        notes:       row['notes'] ? (row['notes'] as string) : undefined,
        recordedAt:  row['recorded_at'] as number,
    }
}

// -----------------------------------------------
// Store
// -----------------------------------------------

export class BiomarkerStore {
    private readonly db: Database.Database

    constructor(db: Database.Database) {
        this.db = db
    }

    log(entry: Omit<BiomarkerEntry, 'id'>): BiomarkerEntry {
        const result = this.db.prepare(`
            INSERT INTO biomarkers (user_id, marker_name, value, unit, source, notes, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            entry.userId,
            entry.markerName,
            entry.value,
            entry.unit,
            entry.source,
            entry.notes ?? null,
            entry.recordedAt,
        )

        return this.findById(result.lastInsertRowid as number)!
    }

    findById(id: number): BiomarkerEntry | null {
        const row = this.db.prepare('SELECT * FROM biomarkers WHERE id = ?').get(id) as BiomarkerRow | undefined
        return row ? rowToEntry(row) : null
    }

    // All readings for a single marker, oldest→newest
    getHistory(userId: string, markerName: string, limitDays = 90): BiomarkerEntry[] {
        const since = Date.now() - limitDays * 86_400_000
        return (this.db.prepare(`
            SELECT * FROM biomarkers
            WHERE user_id = ? AND marker_name = ? AND recorded_at >= ?
            ORDER BY recorded_at ASC
        `).all(userId, markerName, since) as BiomarkerRow[]).map(rowToEntry)
    }

    // All readings for all markers, oldest→newest
    getAllHistory(userId: string, limitDays = 90): BiomarkerEntry[] {
        const since = Date.now() - limitDays * 86_400_000
        return (this.db.prepare(`
            SELECT * FROM biomarkers
            WHERE user_id = ? AND recorded_at >= ?
            ORDER BY recorded_at ASC
        `).all(userId, since) as BiomarkerRow[]).map(rowToEntry)
    }

    // Most recent reading per marker
    getLatestAll(userId: string): BiomarkerEntry[] {
        return (this.db.prepare(`
            SELECT b.* FROM biomarkers b
            INNER JOIN (
                SELECT marker_name, MAX(recorded_at) AS max_at
                FROM biomarkers
                WHERE user_id = ?
                GROUP BY marker_name
            ) latest ON b.marker_name = latest.marker_name AND b.recorded_at = latest.max_at
            WHERE b.user_id = ?
            ORDER BY b.marker_name ASC
        `).all(userId, userId) as BiomarkerRow[]).map(rowToEntry)
    }

    getLatest(userId: string, markerName: string): BiomarkerEntry | null {
        const row = this.db.prepare(`
            SELECT * FROM biomarkers
            WHERE user_id = ? AND marker_name = ?
            ORDER BY recorded_at DESC
            LIMIT 1
        `).get(userId, markerName) as BiomarkerRow | undefined
        return row ? rowToEntry(row) : null
    }

    delete(id: number): boolean {
        const result = this.db.prepare('DELETE FROM biomarkers WHERE id = ?').run(id)
        return result.changes > 0
    }

    deleteForUser(userId: string): void {
        this.db.prepare('DELETE FROM biomarkers WHERE user_id = ?').run(userId)
    }
}
