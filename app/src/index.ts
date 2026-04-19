import { HealthspanOS } from './application/healthspan-os.ts'

async function main(): Promise<void> {
    const app = HealthspanOS.create()

    const shutdown = async (signal: string): Promise<void> => {
        console.log(`\n[HealthspanOS] ${signal} received — shutting down...`)
        await app.stop()
        process.exit(0)
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    await app.start()
}

main().catch(err => {
    console.error('[HealthspanOS] Fatal startup error:', err)
    process.exit(1)
})
