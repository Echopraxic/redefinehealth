import sharp from 'sharp'
import { unlinkSync } from 'node:fs'
import { extname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'

// -----------------------------------------------
// HEIC → JPEG conversion
// -----------------------------------------------

const HEIC_EXTS = new Set(['.heic', '.heif'])

export interface ConvertedImage {
    /** Path to use for analysis — may be a temp file or the original */
    path: string
    /** Call when done; deletes temp file if one was created */
    cleanup: () => void
}

/**
 * If the image is HEIC/HEIF (iPhone default), converts to JPEG and returns a
 * temp path. For all other formats returns the original path unchanged.
 * Always call cleanup() after the image is no longer needed.
 */
export async function ensureJpeg(imagePath: string): Promise<ConvertedImage> {
    if (!HEIC_EXTS.has(extname(imagePath).toLowerCase())) {
        return { path: imagePath, cleanup: () => {} }
    }

    const tempPath = join(tmpdir(), `healthspan-${randomUUID()}.jpg`)
    await sharp(imagePath).jpeg({ quality: 90 }).toFile(tempPath)

    return {
        path: tempPath,
        cleanup: () => { try { unlinkSync(tempPath) } catch { /* already removed */ } },
    }
}
