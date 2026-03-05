import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUploadAuth } from '@/lib/upload-auth'
import crypto from 'crypto'

/**
 * POST /api/upload/register-cached?updateId=<uuid>
 *
 * Batch-registers cached assets for an Update in a SINGLE database transaction.
 * The client sends this after the bulk-exists check has identified which assets
 * are already on disk.  Instead of 75 sequential HTTP requests, the client can
 * register all cached assets with one call.
 *
 * Body (JSON):
 *   assets: { hash, key, fileExt, originalName }[]
 *
 * Returns:
 *   { count: number }   — number of Asset rows created
 */
export async function POST(req: NextRequest) {
    const authError = validateUploadAuth(req)
    if (authError) return authError

    const updateId = req.nextUrl.searchParams.get('updateId')
    if (!updateId) {
        return NextResponse.json({ error: 'Missing ?updateId query parameter' }, { status: 400 })
    }

    const update = await prisma.update.findUnique({ where: { id: updateId } })
    if (!update) {
        return NextResponse.json({ error: `Update "${updateId}" not found` }, { status: 404 })
    }

    try {
        const body = await req.json()
        const assets: { hash: string; key: string; fileExt: string; originalName: string }[] = body.assets || []

        if (assets.length === 0) {
            return NextResponse.json({ count: 0 })
        }

        const data: {
            hash: string
            key: string
            fileExt: string
            meta: string
            updateId: string
        }[] = assets.map(({ hash, key, fileExt, originalName }) => ({
            hash,
            key: fileExt === 'bundle' ? crypto.randomUUID() : key,
            fileExt,
            meta: JSON.stringify({ originalName, filename: `${key}.${fileExt}` }),
            updateId,
        }))

        await prisma.asset.createMany({ data })

        return NextResponse.json({ count: assets.length })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
