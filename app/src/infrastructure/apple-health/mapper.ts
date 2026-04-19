// -----------------------------------------------
// Metric name → internal key mapping
//
// Covers three sources:
//   - Apple Shortcuts flat JSON (snake_case keys users define themselves)
//   - Health Auto Export app (camelCase HealthKit identifiers)
//   - HealthKit export XML identifier strings
//
// markerName values that exist in the biomarker registry (registry.ts)
// are stored and analyzed. Others (sleep_hours, steps, weight_kg,
// blood_oxygen) are stored as custom keys — queryable but not in the
// registry reference ranges.
// -----------------------------------------------

interface MarkerMapping {
    markerName: string
    unit: string
}

const METRIC_MAP: Record<string, MarkerMapping> = {
    // -----------------------------------------------
    // HRV
    // -----------------------------------------------
    'hrv':                          { markerName: 'hrv', unit: 'ms' },
    'heart_rate_variability':       { markerName: 'hrv', unit: 'ms' },
    'heartRateVariabilitySDNN':     { markerName: 'hrv', unit: 'ms' },
    'HKQuantityTypeIdentifierHeartRateVariabilitySDNN': { markerName: 'hrv', unit: 'ms' },

    // -----------------------------------------------
    // Resting heart rate
    // -----------------------------------------------
    'resting_hr':                   { markerName: 'resting_hr', unit: 'bpm' },
    'resting_heart_rate':           { markerName: 'resting_hr', unit: 'bpm' },
    'restingHeartRate':             { markerName: 'resting_hr', unit: 'bpm' },
    'HKQuantityTypeIdentifierRestingHeartRate': { markerName: 'resting_hr', unit: 'bpm' },

    // -----------------------------------------------
    // VO2 max
    // -----------------------------------------------
    'vo2_max':                      { markerName: 'vo2_max', unit: 'ml/kg/min' },
    'vo2Max':                       { markerName: 'vo2_max', unit: 'ml/kg/min' },
    'VO2Max':                       { markerName: 'vo2_max', unit: 'ml/kg/min' },
    'cardioFitness':                { markerName: 'vo2_max', unit: 'ml/kg/min' },
    'HKQuantityTypeIdentifierVO2Max': { markerName: 'vo2_max', unit: 'ml/kg/min' },

    // -----------------------------------------------
    // Sleep (custom keys — not in clinical registry)
    // -----------------------------------------------
    'sleep_hours':                  { markerName: 'sleep_hours',      unit: 'hours' },
    'sleep':                        { markerName: 'sleep_hours',      unit: 'hours' },
    'sleepHours':                   { markerName: 'sleep_hours',      unit: 'hours' },
    'sleep_deep_hours':             { markerName: 'sleep_deep_hours', unit: 'hours' },
    'deep_sleep_hours':             { markerName: 'sleep_deep_hours', unit: 'hours' },
    'deepSleepHours':               { markerName: 'sleep_deep_hours', unit: 'hours' },
    'sleep_rem_hours':              { markerName: 'sleep_rem_hours',  unit: 'hours' },
    'rem_sleep_hours':              { markerName: 'sleep_rem_hours',  unit: 'hours' },
    'remSleepHours':                { markerName: 'sleep_rem_hours',  unit: 'hours' },
    'HKCategoryTypeIdentifierSleepAnalysis': { markerName: 'sleep_hours', unit: 'hours' },

    // -----------------------------------------------
    // Steps (informational)
    // -----------------------------------------------
    'steps':                        { markerName: 'steps', unit: 'count' },
    'step_count':                   { markerName: 'steps', unit: 'count' },
    'stepCount':                    { markerName: 'steps', unit: 'count' },
    'HKQuantityTypeIdentifierStepCount': { markerName: 'steps', unit: 'count' },

    // -----------------------------------------------
    // Weight (informational)
    // -----------------------------------------------
    'weight_kg':                    { markerName: 'weight_kg', unit: 'kg' },
    'weight_lb':                    { markerName: 'weight_kg', unit: 'kg' }, // converted on parse
    'bodyMass':                     { markerName: 'weight_kg', unit: 'kg' },
    'HKQuantityTypeIdentifierBodyMass': { markerName: 'weight_kg', unit: 'kg' },

    // -----------------------------------------------
    // Blood oxygen / SpO2 (informational)
    // -----------------------------------------------
    'blood_oxygen':                 { markerName: 'blood_oxygen', unit: '%' },
    'bloodOxygen':                  { markerName: 'blood_oxygen', unit: '%' },
    'oxygenSaturation':             { markerName: 'blood_oxygen', unit: '%' },
    'HKQuantityTypeIdentifierOxygenSaturation': { markerName: 'blood_oxygen', unit: '%' },
}

export function mapMetric(fieldName: string): MarkerMapping | null {
    return METRIC_MAP[fieldName] ?? null
}

// Keys that require unit conversion before storing
export function convertUnit(fieldName: string, value: number): number {
    if (fieldName === 'weight_lb') return Math.round((value * 0.453592) * 10) / 10
    return value
}

// All metric field names the mapper recognises (for validation / docs)
export function knownFields(): string[] {
    return Object.keys(METRIC_MAP)
}
