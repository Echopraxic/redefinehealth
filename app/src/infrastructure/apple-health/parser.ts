import { mapMetric, convertUnit } from './mapper.ts'
import type { HealthDataPoint, ShortcutsPayload, HealthAutoExportPayload } from './types.ts'

// -----------------------------------------------
// Format detection
// -----------------------------------------------

function isHealthAutoExport(raw: unknown): raw is HealthAutoExportPayload {
    return (
        typeof raw === 'object' && raw !== null &&
        'data' in raw &&
        typeof (raw as Record<string, unknown>)['data'] === 'object' &&
        Array.isArray(((raw as Record<string, unknown>)['data'] as Record<string, unknown>)['metrics'])
    )
}

function isShortcutsPayload(raw: unknown): raw is ShortcutsPayload {
    if (typeof raw !== 'object' || raw === null) return false
    // Must have at least one recognisable health field
    return Object.keys(raw).some(k => mapMetric(k) !== null)
}

// -----------------------------------------------
// Health Auto Export parser
// Takes the most recent data point per metric
// -----------------------------------------------

function parseHealthAutoExport(payload: HealthAutoExportPayload, defaultDate: number): HealthDataPoint[] {
    const points: HealthDataPoint[] = []

    for (const metric of payload.data.metrics) {
        if (!metric.data || metric.data.length === 0) continue

        const mapping = mapMetric(metric.name)
        if (!mapping) continue

        // Take the most recent data point
        const latest = [...metric.data].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0]
        if (!latest) continue

        const rawValue = latest.qty ?? latest.value ?? latest.avg
        if (rawValue === undefined || rawValue === null) continue

        const value = convertUnit(metric.name, rawValue)
        const recordedAt = new Date(latest.date).getTime()

        points.push({
            markerName: mapping.markerName,
            value,
            unit: mapping.unit,
            recordedAt: isNaN(recordedAt) ? defaultDate : recordedAt,
        })
    }

    return points
}

// -----------------------------------------------
// Shortcuts flat-JSON parser
// -----------------------------------------------

const SKIP_KEYS = new Set(['source', 'date', 'timestamp', 'user', 'userId', 'user_id', 'version'])

function parseShortcuts(payload: ShortcutsPayload, defaultDate: number): HealthDataPoint[] {
    const points: HealthDataPoint[] = []

    // Resolve the recorded-at timestamp from the payload's date field
    const dateStr = typeof payload['date'] === 'string' ? payload['date'] : null
    const recordedAt = dateStr ? new Date(dateStr).getTime() : defaultDate
    const resolvedAt = isNaN(recordedAt) ? defaultDate : recordedAt

    for (const [key, raw] of Object.entries(payload)) {
        if (SKIP_KEYS.has(key)) continue
        if (typeof raw !== 'number' || isNaN(raw)) continue

        const mapping = mapMetric(key)
        if (!mapping) continue

        const value = convertUnit(key, raw)
        points.push({ markerName: mapping.markerName, value, unit: mapping.unit, recordedAt: resolvedAt })
    }

    return points
}

// -----------------------------------------------
// Public entry point
// -----------------------------------------------

export interface ParseResult {
    points: HealthDataPoint[]
    format: 'health-auto-export' | 'shortcuts' | 'unknown'
    skippedKeys: string[]
}

export function parseAppleHealthPayload(raw: unknown): ParseResult {
    const now = Date.now()

    if (isHealthAutoExport(raw)) {
        const points = parseHealthAutoExport(raw, now)
        // Collect any metric names we couldn't map
        const skippedKeys = raw.data.metrics
            .map(m => m.name)
            .filter(name => !mapMetric(name))
        return { points, format: 'health-auto-export', skippedKeys }
    }

    if (isShortcutsPayload(raw)) {
        const points = parseShortcuts(raw as ShortcutsPayload, now)
        const skippedKeys = Object.keys(raw as object)
            .filter(k => !SKIP_KEYS.has(k) && typeof (raw as Record<string, unknown>)[k] === 'number' && !mapMetric(k))
        return { points, format: 'shortcuts', skippedKeys }
    }

    return { points: [], format: 'unknown', skippedKeys: [] }
}

// -----------------------------------------------
// iMessage text detection
// Returns parsed payload if the text looks like an Apple Health JSON blob
// -----------------------------------------------

export function tryParseAppleHealthMessage(text: string): ParseResult | null {
    const trimmed = text.trim()
    if (!trimmed.startsWith('{')) return null

    let raw: unknown
    try { raw = JSON.parse(trimmed) } catch { return null }

    const result = parseAppleHealthPayload(raw)
    if (result.format === 'unknown' || result.points.length === 0) return null

    return result
}
