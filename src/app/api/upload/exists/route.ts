import { NextRequest, NextResponse } from 'next/server'
import { getGlobalAssetPath, getGlobalBundlePath } from '@/lib/storage'
import { validateUploadAuth } from '@/lib/upload-auth'
import fs from 'fs'

/**
 * GET /api/upload/exists?hash=<hash>&ext=<ext>
 *
 * Check whether a single asset exists in the server's global pool.
 */
export async function GET(req: NextRequest) {
    const authError = validateUploadAuth(req)
    if (authError) return authError

    const hash = req.nextUrl.searchParams.get('hash')
    const ext = req.nextUrl.searchParams.get('ext')

    if (!hash || !ext) {
        return NextResponse.json({ error: 'Missing ?hash and ?ext query parameters' }, { status: 400 })
    }

    const globalPath = ext === 'bundle' ? getGlobalBundlePath(hash) : getGlobalAssetPath(hash, ext)
    const exists = fs.existsSync(globalPath)

    return NextResponse.json({ exists })
}

/**
 * POST /api/upload/exists
 *
 * Bulk-check multiple assets.
 * Expects body: { assets: { hash, ext }[] }
 * Returns: { missingHashes: string[] }
 */
export async function POST(req: NextRequest) {
    const authError = validateUploadAuth(req)
    if (authError) return authError

    try {
        const body = await req.json()
        const assets: { hash: string; ext: string }[] = body.assets || []

        const missingHashes = []
        for (const { hash, ext } of assets) {
            const globalPath = ext === 'bundle' ? getGlobalBundlePath(hash) : getGlobalAssetPath(hash, ext)
            if (!fs.existsSync(globalPath)) {
                missingHashes.push(hash)
            }
        }

        return NextResponse.json({ missingHashes })
    } catch (e) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
}
