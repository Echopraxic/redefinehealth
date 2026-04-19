import { parseAppleHealthPayload } from './parser.ts'
import type { AppleHealthImportResult, HealthDataPoint } from './types.ts'
import type { BiomarkerStore } from '../storage/biomarker-store.ts'

// -----------------------------------------------
// AppleHealthBridge
// Parses a raw payload, stores biomarker entries, returns a structured result
// -----------------------------------------------

export class AppleHealthBridge {
    constructor(private readonly biomarkers: BiomarkerStore) {}

    ingest(rawPayload: unknown, userId: string): AppleHealthImportResult {
        const { points, skippedKeys } = parseAppleHealthPayload(rawPayload)

        const saved: HealthDataPoint[] = []

        for (const point of points) {
            // Deduplicate: skip if we already have a reading for this marker
            // within 6 hours of the recorded timestamp (prevents double-import)
            const existing = this.biomarkers.getLatest(userId, point.markerName)
            if (existing) {
                const diff = Math.abs(existing.recordedAt - point.recordedAt)
                if (diff < 6 * 3_600_000) continue
            }

            this.biomarkers.log({
                userId,
                markerName: point.markerName,
                value: point.value,
                unit: point.unit,
                source: 'apple-health',
                recordedAt: point.recordedAt,
            })

            saved.push(point)
        }

        const find = (key: string) => saved.find(p => p.markerName === key)?.value

        return {
            imported: saved.length,
            skipped: skippedKeys,
            biomarkersSaved: saved.map(p => p.markerName),
            hrv:            find('hrv'),
            restingHr:      find('resting_hr'),
            sleepHours:     find('sleep_hours'),
            sleepDeepHours: find('sleep_deep_hours'),
            sleepRemHours:  find('sleep_rem_hours'),
            steps:          find('steps'),
            recordedAt:     points[0]?.recordedAt ?? Date.now(),
        }
    }

    // Fetch latest Apple Health context for a user (for prompt enrichment)
    getLatestContext(userId: string): Omit<AppleHealthImportResult, 'imported' | 'skipped' | 'biomarkersSaved'> {
        const get = (key: string) => this.biomarkers.getLatest(userId, key)?.value

        // Only include values recorded within the last 48 hours
        const cutoff = Date.now() - 48 * 3_600_000
        const latestHrv      = this.biomarkers.getLatest(userId, 'hrv')
        const latestRhr      = this.biomarkers.getLatest(userId, 'resting_hr')
        const latestSleep    = this.biomarkers.getLatest(userId, 'sleep_hours')
        const latestDeep     = this.biomarkers.getLatest(userId, 'sleep_deep_hours')
        const latestRem      = this.biomarkers.getLatest(userId, 'sleep_rem_hours')
        const latestSteps    = this.biomarkers.getLatest(userId, 'steps')

        return {
            hrv:            latestHrv    && latestHrv.recordedAt    > cutoff ? latestHrv.value    : undefined,
            restingHr:      latestRhr    && latestRhr.recordedAt    > cutoff ? latestRhr.value    : undefined,
            sleepHours:     latestSleep  && latestSleep.recordedAt  > cutoff ? latestSleep.value  : undefined,
            sleepDeepHours: latestDeep   && latestDeep.recordedAt   > cutoff ? latestDeep.value   : undefined,
            sleepRemHours:  latestRem    && latestRem.recordedAt    > cutoff ? latestRem.value    : undefined,
            steps:          latestSteps  && latestSteps.recordedAt  > cutoff ? latestSteps.value  : undefined,
            recordedAt:     latestSleep?.recordedAt ?? latestHrv?.recordedAt ?? Date.now(),
        }
    }

    // Format a human-readable iMessage confirmation after import
    formatImportSummary(result: AppleHealthImportResult): string {
        if (result.imported === 0) {
            return '📱 Apple Health sync received — no new data to import (already up to date).'
        }

        const lines = [`📱 Apple Health synced — ${result.imported} metric${result.imported !== 1 ? 's' : ''} imported.\n`]

        if (result.hrv !== undefined)            lines.push(`  💚 HRV: ${result.hrv} ms`)
        if (result.restingHr !== undefined)      lines.push(`  ❤️  Resting HR: ${result.restingHr} bpm`)
        if (result.sleepHours !== undefined)     lines.push(`  🌙 Sleep: ${result.sleepHours}h total`)
        if (result.sleepDeepHours !== undefined) lines.push(`  😴 Deep sleep: ${result.sleepDeepHours}h`)
        if (result.sleepRemHours !== undefined)  lines.push(`  💭 REM: ${result.sleepRemHours}h`)
        if (result.steps !== undefined)          lines.push(`  🦶 Steps: ${result.steps.toLocaleString()}`)

        if (result.skipped.length > 0) {
            lines.push(`\n  ${result.skipped.length} field${result.skipped.length !== 1 ? 's' : ''} not recognised: ${result.skipped.slice(0, 3).join(', ')}`)
        }

        return lines.join('\n')
    }
}
