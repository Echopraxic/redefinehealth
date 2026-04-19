// -----------------------------------------------
// Normalized output from either payload format
// -----------------------------------------------

export interface HealthDataPoint {
    markerName: string   // our internal key (e.g. 'hrv', 'sleep_hours')
    value: number
    unit: string
    recordedAt: number   // Unix ms
}

// -----------------------------------------------
// Import result returned to callers
// -----------------------------------------------

export interface AppleHealthImportResult {
    imported: number              // biomarker entries written to store
    skipped: string[]             // field names we couldn't map
    biomarkersSaved: string[]     // internal marker names that were saved
    // Convenience fields for immediate use (e.g. enriching a sleep prompt)
    hrv?: number
    restingHr?: number
    sleepHours?: number
    sleepDeepHours?: number
    sleepRemHours?: number
    steps?: number
    recordedAt: number
}

// -----------------------------------------------
// Inbound payload shapes
// -----------------------------------------------

// Flat format sent via Apple Shortcuts iMessage or HTTP body
export interface ShortcutsPayload {
    source?: string
    date?: string
    [key: string]: unknown
}

// Health Auto Export app webhook format
export interface HealthAutoExportPayload {
    data: {
        metrics: Array<{
            name: string
            units: string
            data: Array<{ date: string; qty?: number; value?: number; avg?: number }>
        }>
    }
}
