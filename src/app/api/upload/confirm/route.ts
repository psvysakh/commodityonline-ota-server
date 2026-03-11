import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUploadAuth } from '@/lib/upload-auth'
import { getPublicUrl } from '@/lib/s3'
import crypto from 'crypto'

/**
 * POST /api/upload/confirm?updateId=<uuid>
 *
 * Called AFTER the client has successfully PUT the file bytes directly to R2
 * using the presigned URL returned by /api/upload/presign.
 *
 * This endpoint just creates the DB Asset record, linking the hash to the updateId.
 *
 * Request body (JSON):
 *   { hash, key, fileExt, originalName, s3Key }
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

    const body = await req.json() as { hash: string; key: string; fileExt: string; originalName: string; s3Key: string; isBundle?: boolean }
    const { hash, key, fileExt, originalName, s3Key, isBundle } = body

    if (!hash || !key || !fileExt || !s3Key) {
        return NextResponse.json({ error: 'Missing required fields: hash, key, fileExt, s3Key' }, { status: 400 })
    }

    const r2Url = getPublicUrl(s3Key)

    const asset = await prisma.asset.create({
        data: {
            hash,
            key: isBundle ? crypto.randomUUID() : key,
            fileExt,
            meta: JSON.stringify({ originalName, s3Key, r2Url }),
            updateId,
        },
    })

    if (isBundle) {
        const { revalidateTag } = require('next/cache')
        revalidateTag('manifest')
        console.log(`[publish] Invalidated 'manifest' cache. Update ${updateId} is now live.`)
    }

    return NextResponse.json({ assetId: asset.id, r2Url }, { status: 201 })
}
