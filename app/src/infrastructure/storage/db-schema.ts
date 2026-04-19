import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export function openDatabase(dbPath: string): Database.Database {
    mkdirSync(dirname(dbPath), { recursive: true })
    const db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.pragma('synchronous = NORMAL')
    applySchema(db)
    return db
}

function applySchema(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id          TEXT    PRIMARY KEY,
            phone       TEXT    UNIQUE NOT NULL,
            name        TEXT    NOT NULL,
            timezone    TEXT    NOT NULL DEFAULT 'America/New_York',
            wake_time   TEXT    NOT NULL DEFAULT '07:00',
            sleep_time  TEXT    NOT NULL DEFAULT '22:30',
            goals       TEXT    NOT NULL DEFAULT '[]',
            preferences TEXT    NOT NULL DEFAULT '{}',
            stack       TEXT    NOT NULL DEFAULT '[]',
            peptides    TEXT    NOT NULL DEFAULT '[]',
            onboarded   INTEGER NOT NULL DEFAULT 0,
            created_at  INTEGER NOT NULL,
            updated_at  INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS compliance_log (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         TEXT    NOT NULL REFERENCES users(id),
            supplement_name TEXT    NOT NULL,
            logged_at       INTEGER NOT NULL,
            taken           INTEGER NOT NULL DEFAULT 1,
            notes           TEXT
        );

        CREATE TABLE IF NOT EXISTS peptide_injections (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         TEXT    NOT NULL REFERENCES users(id),
            peptide_name    TEXT    NOT NULL,
            scheduled_at    INTEGER NOT NULL,
            taken_at        INTEGER,
            skipped         INTEGER NOT NULL DEFAULT 0,
            skip_reason     TEXT,
            injection_site  TEXT,
            side_effects    TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_compliance_user_date
            ON compliance_log (user_id, logged_at);

        CREATE INDEX IF NOT EXISTS idx_compliance_supplement
            ON compliance_log (user_id, supplement_name, logged_at);

        CREATE INDEX IF NOT EXISTS idx_injections_user_date
            ON peptide_injections (user_id, scheduled_at);

        CREATE TABLE IF NOT EXISTS biomarkers (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            marker_name     TEXT    NOT NULL,
            value           REAL    NOT NULL,
            unit            TEXT    NOT NULL,
            source          TEXT    NOT NULL DEFAULT 'manual',
            notes           TEXT,
            recorded_at     INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_biomarkers_user_marker
            ON biomarkers (user_id, marker_name, recorded_at);
    `)
}
