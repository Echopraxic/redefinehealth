// -----------------------------------------------
// Value types
// -----------------------------------------------

export type Goal = 'skin' | 'energy' | 'sleep' | 'longevity' | 'cognition' | 'body-composition'
export type SupplementTiming = 'morning' | 'with-meal' | 'afternoon' | 'evening' | 'bedtime'
export type SupplementFrequency = 'daily' | 'weekly' | 'cycle-on' | 'cycle-off'
export type PeptideType =
    | 'growth-hormone'
    | 'healing'
    | 'tanning'
    | 'libido'
    | 'cognition'
    | 'anti-inflammatory'
    | 'fat-loss'
    | 'sleep'
    | 'antimicrobial'
export type ReminderFrequency = 'gentle' | 'strict' | 'aggressive'
export type AITone = 'factual' | 'engaging' | 'playful'

// -----------------------------------------------
// Supplement
// -----------------------------------------------

export interface Supplement {
    name: string
    dose: string
    timing: SupplementTiming
    frequency: SupplementFrequency
    purpose: string
    interactions: string[]
}

// -----------------------------------------------
// Peptide protocol
// -----------------------------------------------

export interface PeptideReconstitution {
    vialMg: number
    bacWaterMl: number
    doseUnits: number  // insulin syringe units (100 units = 1 ml)
}

export interface PeptideProtocol {
    name: string
    type: PeptideType
    doseMcg: number
    frequencyPerWeek: number
    injectionTime: string           // HH:MM, 24-hour
    cycleWeeks: number
    restWeeks: number
    startDate: string               // ISO date YYYY-MM-DD
    reconstitution: PeptideReconstitution
    rotationSites: string[]
    active: boolean
}

// -----------------------------------------------
// Skincare
// -----------------------------------------------

export type SkincareStep = 'cleanser' | 'toner' | 'serum' | 'treatment' | 'moisturizer' | 'spf' | 'eye-cream' | 'oil' | 'mask'
export type SkincareRoutine = 'morning' | 'evening' | 'both' | 'weekly'

export interface SkincareProduct {
    name: string
    step: SkincareStep
    routine: SkincareRoutine
    purpose: string
    interactions: string[]
    notes?: string
}

// -----------------------------------------------
// User
// -----------------------------------------------

export interface UserPreferences {
    reminderFrequency: ReminderFrequency
    aiTone: AITone
    photoTracking: boolean
    voiceJournal: boolean
    leaderboardOptIn: boolean     // defaults to false — must explicitly opt in
    leaderboardAnonymous: boolean // show as "Anonymous" even when opted in
}

export interface UserProfile {
    id: string
    phone: string
    name: string
    timezone: string
    wakeTime: string                // HH:MM
    sleepTime: string               // HH:MM
    goals: Goal[]
    stack: Supplement[]
    peptides: PeptideProtocol[]
    skincare: SkincareProduct[]
    preferences: UserPreferences
    onboarded: boolean
    webhookToken: string | null     // per-user Apple Health webhook secret; null until first generated
    consentAt: number | null        // Unix ms timestamp when user agreed to ToS + Privacy Policy
    createdAt: number               // Unix ms
    updatedAt: number               // Unix ms
    deletedAt: number | null        // null = active; set on soft delete
}

export type CreateUserInput = Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt' | 'onboarded'>
