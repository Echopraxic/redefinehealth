import type { Goal } from '../user-profile.ts'

// -----------------------------------------------
// Configuration types
// -----------------------------------------------

export type LeaderboardPeriod = 7 | 30

// 'overall' ranks all opted-in users regardless of goal.
// Goal-specific categories filter to users who share that goal.
export type LeaderboardCategory = 'overall' | Goal

// -----------------------------------------------
// Ranking entry — one row in the leaderboard
// -----------------------------------------------

export interface LeaderboardEntry {
    rank: number
    userId: string
    displayName: string      // first name, or "Anonymous" if opted in anonymously
    complianceRate: number   // 0–100, rounded
    currentStreak: number    // days
    bestStreak: number
    totalLogged: number
    goals: Goal[]
}

// -----------------------------------------------
// Full leaderboard result
// -----------------------------------------------

export interface LeaderboardRanking {
    category: LeaderboardCategory
    period: LeaderboardPeriod
    generatedAt: number
    totalParticipants: number   // all opted-in users in this category
    entries: LeaderboardEntry[] // top N visible entries
}
