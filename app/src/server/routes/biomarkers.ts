import { ok, NOT_FOUND, BAD_REQUEST } from '../response.ts'
import { analyzeTrend, checkAlert, toSnapshot } from '../../domain/biomarkers/analyzer.ts'
import { findMarker, allMarkers } from '../../domain/biomarkers/registry.ts'
import type { BiomarkerSource } from '../../domain/biomarkers/types.ts'
import type { RouteHandler } from '../router.ts'
import type { UserRepository } from '../../infrastructure/storage/user-repository.ts'
import type { BiomarkerStore } from '../../infrastructure/storage/biomarker-store.ts'

const VALID_SOURCES = new Set<BiomarkerSource>(['manual', 'apple-health', 'lab-upload'])

export function makeBiomarkerRoutes(users: UserRepository, biomarkers: BiomarkerStore) {
    // -----------------------------------------------
    // GET /users/:id/biomarkers
    // Returns latest reading per marker + trend + alerts
    // -----------------------------------------------
    const getBiomarkers: RouteHandler = ({ params, searchParams }) => {
        const user = users.findById(params['id']!)
        if (!user) return NOT_FOUND

        const days = parseInt(searchParams.get('days') ?? '90', 10)
        if (isNaN(days) || days < 1 || days > 730) return BAD_REQUEST('days must be between 1 and 730')

        const latest = biomarkers.getLatestAll(params['id']!)
        const history = biomarkers.getAllHistory(params['id']!, days)

        // Group history by marker name for trend calculation
        const byMarker = new Map<string, typeof history>()
        for (const entry of history) {
            const arr = byMarker.get(entry.markerName) ?? []
            arr.push(entry)
            byMarker.set(entry.markerName, arr)
        }

        const snapshots = latest.map(toSnapshot)
        const trends = [...byMarker.entries()].map(([name, entries]) => analyzeTrend(entries, name))
        const alerts = latest.map(checkAlert).filter(Boolean)

        return ok({
            userId: user.id,
            userName: user.name,
            periodDays: days,
            totalMarkers: latest.length,
            outOfRange: alerts.length,
            snapshots,
            trends,
            alerts,
        })
    }

    // -----------------------------------------------
    // GET /users/:id/biomarkers/:marker
    // Full history for a single marker
    // -----------------------------------------------
    const getMarkerHistory: RouteHandler = ({ params, searchParams }) => {
        const user = users.findById(params['id']!)
        if (!user) return NOT_FOUND

        const markerName = params['marker']!
        const def = findMarker(markerName)
        if (!def) {
            return BAD_REQUEST(`Unknown marker: "${markerName}". Valid markers: ${allMarkers().map(m => m.name).join(', ')}`)
        }

        const days = parseInt(searchParams.get('days') ?? '90', 10)
        if (isNaN(days) || days < 1 || days > 730) return BAD_REQUEST('days must be between 1 and 730')

        const entries = biomarkers.getHistory(params['id']!, markerName, days)
        const trend = analyzeTrend(entries, markerName)
        const latestEntry = entries[entries.length - 1]
        const alert = latestEntry ? checkAlert(latestEntry) : null

        return ok({
            userId: user.id,
            marker: {
                name: def.name,
                displayName: def.displayName,
                unit: def.unit,
                category: def.category,
                referenceRange: def.referenceRange,
                higherIsBetter: def.higherIsBetter,
                description: def.description,
            },
            trend,
            alert,
            readings: entries.map(e => ({
                id: e.id,
                value: e.value,
                unit: e.unit,
                source: e.source,
                notes: e.notes ?? null,
                recordedAt: new Date(e.recordedAt).toISOString(),
            })),
        })
    }

    // -----------------------------------------------
    // POST /users/:id/biomarkers
    // Log a new biomarker reading
    // -----------------------------------------------
    const logBiomarker: RouteHandler = async ({ req, params }) => {
        const user = users.findById(params['id']!)
        if (!user) return NOT_FOUND

        const body = await req.json().catch(() => null) as Record<string, unknown> | null
        if (!body) return BAD_REQUEST('Request body must be valid JSON')

        const { marker, value, source, notes, recordedAt } = body

        if (typeof marker !== 'string' || !marker.trim()) return BAD_REQUEST('marker is required')
        if (typeof value !== 'number' || isNaN(value)) return BAD_REQUEST('value must be a number')

        const markerName = marker.trim().toLowerCase()
        const def = findMarker(markerName)
        if (!def) {
            return BAD_REQUEST(`Unknown marker: "${markerName}". Valid markers: ${allMarkers().map(m => m.name).join(', ')}`)
        }

        const resolvedSource: BiomarkerSource =
            typeof source === 'string' && VALID_SOURCES.has(source as BiomarkerSource)
                ? (source as BiomarkerSource)
                : 'manual'

        const resolvedAt = typeof recordedAt === 'string'
            ? new Date(recordedAt).getTime()
            : Date.now()

        if (isNaN(resolvedAt)) return BAD_REQUEST('recordedAt must be a valid ISO date string')

        const entry = biomarkers.log({
            userId: params['id']!,
            markerName,
            value,
            unit: def.unit,
            source: resolvedSource,
            notes: typeof notes === 'string' ? notes : undefined,
            recordedAt: resolvedAt,
        })

        const alert = checkAlert(entry)

        return ok({
            entry: {
                id: entry.id,
                marker: def.displayName,
                value: entry.value,
                unit: entry.unit,
                source: entry.source,
                recordedAt: new Date(entry.recordedAt).toISOString(),
                inRange: !alert,
                alert: alert ?? null,
            },
        }, 201)
    }

    // -----------------------------------------------
    // DELETE /users/:id/biomarkers/:entryId
    // -----------------------------------------------
    const deleteBiomarker: RouteHandler = ({ params }) => {
        const user = users.findById(params['id']!)
        if (!user) return NOT_FOUND

        const entryId = parseInt(params['entryId']!, 10)
        if (isNaN(entryId)) return BAD_REQUEST('entryId must be a number')

        const deleted = biomarkers.delete(entryId)
        if (!deleted) return NOT_FOUND

        return ok({ deleted: true, id: entryId })
    }

    // -----------------------------------------------
    // GET /biomarkers/registry
    // All known markers with definitions (unauthenticated reference)
    // -----------------------------------------------
    const getRegistry: RouteHandler = () =>
        ok({ markers: allMarkers() })

    return { getBiomarkers, getMarkerHistory, logBiomarker, deleteBiomarker, getRegistry }
}
