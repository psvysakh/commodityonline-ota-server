import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/manifest
 *
 * Implements the Expo Updates Protocol v1.
 *
 * The expo-updates client sends these headers:
 *   expo-platform          : "ios" | "android"
 *   expo-runtime-version   : e.g. "1"
 *   expo-channel-name      : e.g. "production"
 *   expo-current-update-id : UUID of the update the client already has
 *   accept                 : "multipart/mixed,application/json" (protocol v1)
 *                          | "application/json"                 (protocol v0)
 *
 * Protocol v1 response: multipart/mixed with one JSON part (manifest).
 * Protocol v0 response: plain application/json (fallback for old clients).
 *
 * Returns 204 when the client already has the latest update.
 */
export async function GET(req: NextRequest) {
    const platform = req.headers.get('expo-platform')
    const runtimeVersion = req.headers.get('expo-runtime-version')
    const channelName = req.headers.get('expo-channel-name') ?? 'production'
    const currentUpdateId = req.headers.get('expo-current-update-id') ?? ''
    const acceptHeader = req.headers.get('accept') ?? 'application/json'

    // ── DEBUG: print everything the native client sent ──────────────────────
    console.log('\n[manifest] ====== incoming request ======')
    console.log('[manifest] expo-platform         :', platform)
    console.log('[manifest] expo-runtime-version  :', runtimeVersion)
    console.log('[manifest] expo-channel-name     :', req.headers.get('expo-channel-name'))
    console.log('[manifest] expo-current-update-id:', req.headers.get('expo-current-update-id'))
    console.log('[manifest] accept                :', acceptHeader)
    console.log('[manifest] resolved channelName  :', channelName)
    // ─────────────────────────────────────────────────────────────────────────

    // Decide which protocol version to use based on the Accept header
    const useMultipart = acceptHeader.includes('multipart/mixed')

    if (!platform || !runtimeVersion) {
        return NextResponse.json(
            { error: 'Missing required headers: expo-platform, expo-runtime-version' },
            { status: 400 }
        )
    }

    // Resolve the named deployment channel
    const channel = await prisma.channel.findUnique({
        where: { name: channelName },
    })

    if (!channel) {
        return NextResponse.json(
            { error: `Channel "${channelName}" not found. Create it in the dashboard first.` },
            { status: 404 }
        )
    }

    // Find the most recent update matching platform + runtimeVersion + channel
    const update = await prisma.update.findFirst({
        where: {
            platform,
            runtimeVersion,
            channelId: channel.id,
        },
        include: { assets: true },
        orderBy: { createdAt: 'desc' },
    })

    if (!update) {
        return NextResponse.json(
            { error: `No update found for platform="${platform}" runtimeVersion="${runtimeVersion}" channel="${channelName}"` },
            {
                status: 404,
                headers: {
                    'expo-protocol-version': '1',
                    'expo-sfv-version': '0',
                    'cache-control': 'private, max-age=0',
                }
            }
        )
    }

    // Client already has this update → nothing to do
    if (update.id === currentUpdateId) {
        return new NextResponse(null, {
            status: 204,
            headers: {
                'expo-protocol-version': '1',
                'expo-sfv-version': '0',
                'cache-control': 'private, max-age=0',
            },
        })
    }

    // Build asset URLs using the exact host the client used to reach this endpoint.
    // In Next.js, req.url might default to localhost, so we MUST check the Host header.
    // For Android emulators, this ensures the URL correctly uses 10.0.2.2:3000.
    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = req.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`

    // --- Build manifest assets list ---
    const allAssets = update.assets.map((asset) => {
        return {
            // Normalize hash to base64url format — required by expo-updates native
            hash: toBase64UrlHash(asset.hash),
            key: asset.key,
            contentType: getContentType(asset.fileExt),
            fileExtension: `.${asset.fileExt}`,
            url: `${baseUrl}/api/assets?assetId=${asset.id}`,
        }
    })

    const launchAsset = allAssets.find((a) => a.contentType === 'application/javascript')
    const otherAssets = allAssets.filter((a) => a.contentType !== 'application/javascript')

    if (!launchAsset) {
        return NextResponse.json(
            { error: 'Update is missing its bundle asset. Re-publish the update.' },
            { status: 500 }
        )
    }

    const manifest = {
        id: update.id,
        createdAt: update.createdAt.toISOString(),
        runtimeVersion: update.runtimeVersion,
        launchAsset,
        assets: otherAssets,
        metadata: {},
        extra: {
            expoClient: update.extra ? { extra: JSON.parse(update.extra) } : {},
        },
    }

    const commonHeaders: Record<string, string> = {
        'expo-protocol-version': '1',
        'expo-sfv-version': '0',
        'cache-control': 'private, max-age=0',
    }

    // --- Protocol v1: multipart/mixed response ---
    if (useMultipart) {
        const boundary = `expo-manifest-boundary-${update.id.replace(/-/g, '')}`
        const manifestJson = JSON.stringify(manifest)

        // Build the multipart body exactly as the expo-updates native parser expects:
        //   - Content-Type: application/json (must exactly match)
        //   - Content-Disposition: inline; name="manifest" (must exactly match)
        //   - Proper CRLF separators (must be strict)
        const CRLF = '\r\n'
        const body =
            `--${boundary}` + CRLF +
            `Content-Disposition: inline; name="manifest"` + CRLF +
            `Content-Type: application/json` + CRLF +
            CRLF +
            manifestJson + CRLF +
            `--${boundary}--` + CRLF

        return new NextResponse(body, {
            status: 200,
            headers: {
                ...commonHeaders,
                'content-type': `multipart/mixed; boundary=${boundary}`,
            },
        })
    }

    // --- Protocol v0 fallback: plain JSON ---
    return NextResponse.json(manifest, {
        headers: {
            ...commonHeaders,
            'expo-protocol-version': '0',
        },
    })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reconstructs the filename used when the asset was written to disk.
 * Must stay in sync with upload/route.ts.
 */
function getStoredFilename(asset: { key: string; fileExt: string; meta: string | null }): string {
    // Bundle is always saved as "bundle.bundle"
    if (asset.key === 'bundle') return 'bundle.bundle'

    // Extra assets: try to recover the original filename from meta JSON
    if (asset.meta) {
        try {
            const meta = JSON.parse(asset.meta)
            if (meta.filename) return meta.filename
        } catch {
            // fall through
        }
    }

    return `${asset.key}.${asset.fileExt}`
}

/**
 * Converts any stored hash to the base64url format required by
 * the expo-updates native asset verifier.
 *
 * Handles both:
 *   - New format: "base64url"  → returned as-is
 *   - Old format: 64-char hex string → converted to base64url
 */
function toBase64UrlHash(hash: string): string {
    // If it's already a 43-character base64url string (SHA-256 base64url length is 43)
    if (hash.length === 43 && !hash.includes('+') && !hash.includes('/')) {
        return hash
    }
    // If it has a sha256: prefix from earlier bug, strip it
    if (hash.startsWith('sha256:')) {
        const stripped = hash.replace('sha256:', '')
        // Fix standard base64 strings containing + / = to base64url
        return stripped.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    }
    // Old hex hash: convert Buffer(hex) → base64url
    return Buffer.from(hash, 'hex').toString('base64url')
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
