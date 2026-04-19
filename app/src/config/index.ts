import { resolve } from 'node:path'

function requireEnv(key: string): string {
    const value = process.env[key]
    if (!value) throw new Error(`Missing required environment variable: ${key}`)
    return value
}

export const config = {
    anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
    dbPath: process.env['DB_PATH'] ?? resolve(import.meta.dir, '../../data/healthspan.db'),
    debug: process.env['DEBUG'] === 'true',
    adminPhone: process.env['ADMIN_PHONE'] ?? null,
    defaultTimezone: process.env['DEFAULT_TIMEZONE'] ?? 'America/New_York',
    httpPort: parseInt(process.env['HTTP_PORT'] ?? '3000', 10),
    httpApiKey: process.env['HTTP_API_KEY'] ?? null,
} as const

export type AppConfig = typeof config
