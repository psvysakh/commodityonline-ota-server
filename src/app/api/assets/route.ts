import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import { getAssetPath, getGlobalAssetPath, getGlobalBundlePath } from '@/lib/storage'

/**
 * GET /api/assets?assetId=<id>
 *
 * Serves a binary asset (JS bundle, image, font, …) for an Expo update.
 *
 * The expo-updates client uses the URLs returned by /api/manifest and expects:
 *   - The correct Content-Type for the asset
 *   - An `expo-asset-metadata` header containing the SHA-256 hash so the
 *     client can verify integrity
 *   - Long-lived `Cache-Control` (assets are content-addressed by their hash)
 */
export async function GET(req: NextRequest) {
    return handleRequest(req, true)
}

export async function HEAD(req: NextRequest) {
    return handleRequest(req, false)
}

async function handleRequest(req: NextRequest, includeBody: boolean) {
    const { searchParams } = new URL(req.url)
    const assetId = searchParams.get('assetId')

    if (!assetId) {
        return NextResponse.json({ error: 'Missing assetId query parameter' }, { status: 400 })
    }

    // Look up the asset record in the database
    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
    })

    if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // 1. Try resolving from the new global hash-based pool
    let filePath = asset.fileExt === 'bundle'
        ? getGlobalBundlePath(asset.hash)
        : getGlobalAssetPath(asset.hash, asset.fileExt)

    // 2. Fallback for backwards compatibility with old updates
    if (!fs.existsSync(filePath)) {
        const filename = getStoredFilename(asset)
        let physicalUpdateId = asset.updateId
        if (asset.meta) {
            try {
                const m = JSON.parse(asset.meta)
                if (m.savedUpdateId) physicalUpdateId = m.savedUpdateId
            } catch { }
        }
        filePath = getAssetPath(physicalUpdateId, filename)
    }

    if (!fs.existsSync(filePath)) {
        console.error(`Asset file missing on disk: ${filePath}`)
        return NextResponse.json(
            { error: 'Asset file not found on server disk' },
            { status: 404 }
        )
    }

    const fileBuffer = fs.readFileSync(filePath)
    const contentType = getContentType(asset.fileExt)

    return new NextResponse(includeBody ? fileBuffer : null, {
        status: 200,
        headers: {
            'Content-Type': contentType,
            // Assets are immutable (content-addressed), cache forever
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Length': String(fileBuffer.length),
        },
    })
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reconstructs the filename used when the asset was written to disk by
 * upload/route.ts. Must stay in sync with that file's logic.
 */
function getStoredFilename(asset: { key: string; fileExt: string; meta: string | null }): string {
    // Bundle is always saved as "bundle.bundle"
    if (asset.key === 'bundle') return 'bundle.bundle'

    // Extra assets: recover original filename from stored meta JSON
    if (asset.meta) {
        try {
            const meta = JSON.parse(asset.meta)
            if (meta.filename) return meta.filename
        } catch {
            // fall through to default
        }
    }

    return `${asset.key}.${asset.fileExt}`
}

function getContentType(ext: string): string {
    const map: Record<string, string> = {
        bundle: 'application/javascript',
        js: 'application/javascript',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        ttf: 'font/ttf',
        otf: 'font/otf',
        woff: 'font/woff',
        woff2: 'font/woff2',
        json: 'application/json',
    }
    return map[ext] ?? 'application/octet-stream'
}
