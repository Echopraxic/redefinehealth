/** Normalize any US/international phone string to E.164 format (+1XXXXXXXXXX) */
export function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 10) return `+1${digits}`
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
    if (raw.startsWith('+')) return `+${digits}`
    return `+${digits}`
}

/** Mask a phone number for logs/display: +1202***-****-5678 */
export function maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 7) return '***'
    const last4 = digits.slice(-4)
    const prefix = digits.slice(0, Math.max(0, digits.length - 7))
    return `+${prefix}***-****-${last4}`
}

/** Returns true if two phones refer to the same number after normalization */
export function phonesMatch(a: string, b: string): boolean {
    return normalizePhone(a) === normalizePhone(b)
}
