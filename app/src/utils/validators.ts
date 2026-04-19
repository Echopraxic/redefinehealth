export interface ValidationResult {
    valid: boolean
    errors: string[]
}

export function validatePhone(phone: string): ValidationResult {
    const digits = phone.replace(/\D/g, '')
    const errors: string[] = []
    if (digits.length < 10 || digits.length > 15) {
        errors.push(`Phone "${phone}" must have 10–15 digits.`)
    }
    return { valid: errors.length === 0, errors }
}

export function validateHHMM(time: string): ValidationResult {
    const errors: string[] = []
    if (!/^([01]?\d|2[0-3]):([0-5]\d)$/.test(time.trim())) {
        errors.push(`"${time}" is not a valid HH:MM time (24-hour format).`)
    }
    return { valid: errors.length === 0, errors }
}

export function validateDoseMcg(doseMcg: number, peptideName: string): ValidationResult {
    const errors: string[] = []
    if (doseMcg <= 0) errors.push(`Dose must be positive (got ${doseMcg} mcg for ${peptideName}).`)
    if (doseMcg > 10_000) errors.push(`${doseMcg}mcg exceeds the maximum research dose ceiling (10,000mcg) for ${peptideName}.`)
    return { valid: errors.length === 0, errors }
}

export function validateBacWaterMl(bacWaterMl: number): ValidationResult {
    const errors: string[] = []
    if (bacWaterMl <= 0) errors.push('BAC water volume must be positive.')
    if (bacWaterMl > 10) errors.push(`${bacWaterMl}ml of BAC water is unusually high — verify reconstitution math.`)
    return { valid: errors.length === 0, errors }
}

export function validateFrequencyPerWeek(freq: number): ValidationResult {
    const errors: string[] = []
    if (!Number.isInteger(freq) || freq < 1 || freq > 7) {
        errors.push(`frequencyPerWeek must be 1–7, got ${freq}.`)
    }
    return { valid: errors.length === 0, errors }
}

/** Throws if any validation fails; useful for asserting in registration flows */
export function assertValid(results: ValidationResult[]): void {
    const errors = results.flatMap(r => r.errors)
    if (errors.length > 0) {
        throw new Error(`Validation failed:\n${errors.map(e => `  • ${e}`).join('\n')}`)
    }
}
