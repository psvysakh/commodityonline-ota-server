import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGlobalAssetPath, getGlobalBundlePath } from '@/lib/storage'
import fs from 'fs'

/**
 * GET /api/upload/exists?hash=<hash>&ext=<ext>
 *
 * Check whether an asset with this hash already exists in the server's global pool.
 * Returns { exists: true } if the file is on disk, { exists: false } otherwise.
 *
 * The publish script uses this to skip uploading assets that haven't changed.
 */
export async function GET(req: NextRequest) {
    const hash = req.nextUrl.searchParams.get('hash')
    const ext = req.nextUrl.searchParams.get('ext')

    if (!hash || !ext) {
        return NextResponse.json({ error: 'Missing ?hash and ?ext query parameters' }, { status: 400 })
    }

    const globalPath = ext === 'bundle' ? getGlobalBundlePath(hash) : getGlobalAssetPath(hash, ext)
    const exists = fs.existsSync(globalPath)

    return NextResponse.json({ exists })
}
