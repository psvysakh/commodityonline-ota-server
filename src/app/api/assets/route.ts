import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import { getAssetPath, getGlobalAssetPath, getGlobalBundlePath } from '@/lib/storage'

/**
 * GET /api/assets?assetId=<id>
 *
 * Serves or redirects to a binary asset (JS bundle, image, font, …) for an Expo update.
 *
 * Strategy:
 * 1. If the asset has an r2Url in its metadata → redirect (302) to Cloudflare R2 CDN.
 *    This offloads all bandwidth from Cloudways to Cloudflare's global network.
 * 2. Fallback: serve the file directly from disk (for legacy updates before R2 migration).
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

    const asset = await prisma.asset.findUnique({ where: { id: assetId } })

    if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // ─── Strategy 1: Redirect to Cloudflare R2 CDN (new uploads) ──────────────
    if (asset.meta) {
        try {
            const meta = JSON.parse(asset.meta)
            if (meta.r2Url) {
                // Redirect the Expo client directly to R2 — zero bandwidth used on our VPS!
                return NextResponse.redirect(meta.r2Url, {
                    status: 302,
                    headers: {
                        'Cache-Control': 'public, max-age=31536000, immutable',
                    },
                })
            }
        } catch { /* fall through to disk */ }
    }

    // ─── Strategy 2: Fallback — serve from disk (legacy updates) ──────────────
    let filePath = asset.fileExt === 'bundle'
        ? getGlobalBundlePath(asset.hash)
        : getGlobalAssetPath(asset.hash, asset.fileExt)

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
        return NextResponse.json({ error: 'Asset file not found on server' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    const contentType = getContentType(asset.fileExt)

    return new NextResponse(includeBody ? fileBuffer : null, {
        status: 200,
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Length': String(fileBuffer.length),
        },
    })
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStoredFilename(asset: { key: string; fileExt: string; meta: string | null }): string {
    if (asset.key === 'bundle') return 'bundle.bundle'
    if (asset.meta) {
        try {
            const meta = JSON.parse(asset.meta)
            if (meta.filename) return meta.filename
        } catch { }
    }
    return `${asset.key}.${asset.fileExt}`
}

function getContentType(ext: string): string {
    const map: Record<string, string> = {
        bundle: 'application/javascript',
        hbc: 'application/javascript',
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
