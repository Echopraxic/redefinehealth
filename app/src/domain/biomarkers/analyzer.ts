import { findMarker } from './registry.ts'
import type { BiomarkerEntry, BiomarkerTrend, BiomarkerAlert, BiomarkerSnapshot, ReferenceRange } from './types.ts'

// -----------------------------------------------
// Range helpers
// -----------------------------------------------

function inRange(value: number, range: ReferenceRange): boolean {
    return value >= range.low && value <= range.high
}

function inOptimal(value: number, range: ReferenceRange): boolean {
    if (range.optimalLow === undefined || range.optimalHigh === undefined) return inRange(value, range)
    return value >= range.optimalLow && value <= range.optimalHigh
}

// Severity: >20% outside the nearer bound = critical, otherwise warning
function alertSeverity(value: number, range: ReferenceRange): 'critical' | 'warning' {
    const distanceLow  = range.low  > 0 ? Math.abs(value - range.low)  / range.low  : 0
    const distanceHigh = range.high > 0 ? Math.abs(value - range.high) / range.high : 0
    const maxDist = Math.max(distanceLow, distanceHigh)
    return maxDist > 0.2 ? 'critical' : 'warning'
}

// -----------------------------------------------
// Trend analysis
// -----------------------------------------------

const TREND_THRESHOLD = 0.05  // 5% change = meaningful

export function analyzeTrend(
    entries: BiomarkerEntry[],
    markerName: string,
): BiomarkerTrend {
    const def = findMarker(markerName)
    const displayName = def?.displayName ?? markerName
    const unit = def?.unit ?? ''
    const insufficient: BiomarkerTrend = {
        markerName, displayName, direction: 'insufficient_data',
        percentChange: 0, latest: 0, unit, readings: 0,
        inRange: false, inOptimal: false,
    }

    const sorted = [...entries].sort((a, b) => a.recordedAt - b.recordedAt)
    if (sorted.length < 2) {
        const only = sorted[0]
        if (!only) return insufficient
        return {
            markerName, displayName, direction: 'insufficient_data',
            percentChange: 0, latest: only.value, unit,
            readings: 1,
            inRange: def ? inRange(only.value, def.referenceRange) : true,
            inOptimal: def ? inOptimal(only.value, def.referenceRange) : true,
        }
    }

    const baseline = sorted[0]!
    const latest   = sorted[sorted.length - 1]!

    // Raw percent change: positive = value went up, negative = value went down
    const rawChange = baseline.value !== 0
        ? (latest.value - baseline.value) / Math.abs(baseline.value)
        : 0

    // Signed change from "better" perspective
    const signedChange = def?.higherIsBetter ? rawChange : -rawChange

    let direction: BiomarkerTrend['direction']
    if (Math.abs(signedChange) < TREND_THRESHOLD) direction = 'stable'
    else if (signedChange > 0) direction = 'improving'
    else direction = 'declining'

    return {
        markerName,
        displayName,
        direction,
        percentChange: Math.round(signedChange * 1000) / 10,  // one decimal place
        latest: latest.value,
        unit,
        readings: sorted.length,
        inRange:   def ? inRange(latest.value,   def.referenceRange) : true,
        inOptimal: def ? inOptimal(latest.value, def.referenceRange) : true,
    }
}

// -----------------------------------------------
// Out-of-range alerts
// -----------------------------------------------

export function checkAlert(entry: BiomarkerEntry): BiomarkerAlert | null {
    const def = findMarker(entry.markerName)
    if (!def) return null
    if (inRange(entry.value, def.referenceRange)) return null

    const severity = alertSeverity(entry.value, def.referenceRange)
    const direction = entry.value < def.referenceRange.low ? 'low' : 'high'

    return {
        markerName: entry.markerName,
        displayName: def.displayName,
        value: entry.value,
        unit: def.unit,
        severity,
        message: `${def.displayName} is ${direction} at ${entry.value} ${def.unit} (range: ${def.referenceRange.low}–${def.referenceRange.high})`,
    }
}

// -----------------------------------------------
// Snapshot — latest reading with range status
// -----------------------------------------------

export function toSnapshot(entry: BiomarkerEntry): BiomarkerSnapshot {
    const def = findMarker(entry.markerName)
    return {
        markerName: entry.markerName,
        displayName: def?.displayName ?? entry.markerName,
        value: entry.value,
        unit: entry.unit,
        source: entry.source,
        recordedAt: entry.recordedAt,
        inRange:   def ? inRange(entry.value,   def.referenceRange) : true,
        inOptimal: def ? inOptimal(entry.value, def.referenceRange) : true,
    }
}

// -----------------------------------------------
// iMessage summary format
// -----------------------------------------------

export function formatBiomarkerSummary(
    trends: BiomarkerTrend[],
    alerts: BiomarkerAlert[],
    userName: string,
): string {
    const lines = [`🧪 Biomarker Summary — ${userName}\n`]

    if (alerts.length > 0) {
        lines.push('⚠️ Out of Range:')
        for (const a of alerts) {
            const icon = a.severity === 'critical' ? '🚨' : '⚠️'
            lines.push(`  ${icon} ${a.message}`)
        }
        lines.push('')
    }

    const byDirection: Record<string, BiomarkerTrend[]> = { improving: [], declining: [], stable: [], insufficient_data: [] }
    for (const t of trends) byDirection[t.direction]!.push(t)

    if (byDirection['improving']!.length > 0) {
        lines.push('📈 Improving:')
        for (const t of byDirection['improving']!) {
            lines.push(`  ✅ ${t.displayName}: ${t.latest} ${t.unit} (+${t.percentChange}%)`)
        }
        lines.push('')
    }

    if (byDirection['declining']!.length > 0) {
        lines.push('📉 Declining:')
        for (const t of byDirection['declining']!) {
            lines.push(`  ⚡ ${t.displayName}: ${t.latest} ${t.unit} (${t.percentChange}%)`)
        }
        lines.push('')
    }

    if (byDirection['stable']!.length > 0) {
        lines.push('➡️ Stable:')
        for (const t of byDirection['stable']!) {
            const opt = t.inOptimal ? '✓' : t.inRange ? '~' : '!'
            lines.push(`  ${opt} ${t.displayName}: ${t.latest} ${t.unit}`)
        }
    }

    return lines.join('\n').trimEnd()
}
