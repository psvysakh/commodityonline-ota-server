import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUploadAuth } from '@/lib/upload-auth'
import { s3FileExists, generatePresignedUploadUrl, getPublicUrl, getMimeType } from '@/lib/s3'
import crypto from 'crypto'

/**
 * POST /api/upload/presign?updateId=<uuid>
 *
 * Given an asset's metadata, returns either:
 *  - A "presignedUrl" field if the file needs to be uploaded via HTTP PUT
 *  - A "cached": true field if the file already exists in R2 (deduplication)
 *
 * The client then:
 *  1. PUTs the raw file bytes to the presignedUrl (directly to Cloudflare R2)
 *  2. Calls POST /api/upload/confirm to finalize the DB record
 *
 * Request body (JSON):
 *   { hash, key, fileExt, originalName }
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

    const body = await req.json() as { hash: string; key: string; fileExt: string; originalName: string }
    const { hash, key, fileExt, originalName } = body

    if (!hash || !key || !fileExt) {
        return NextResponse.json({ error: 'Missing required fields: hash, key, fileExt' }, { status: 400 })
    }

    // Determine the S3 object key (path in the R2 bucket)
    const isBundle = fileExt === 'bundle' || fileExt === 'hbc'
    const s3Key = isBundle ? `bundles/${hash}.${fileExt}` : `assets/${hash}.${fileExt}`

    // Check if this file already exists in R2 (deduplication)
    const alreadyInR2 = await s3FileExists(s3Key)

    if (alreadyInR2) {
        // File already in R2 — just create the DB record and return "cached"
        await prisma.asset.create({
            data: {
                hash,
                key: isBundle ? crypto.randomUUID() : key,
                fileExt,
                meta: JSON.stringify({ originalName, s3Key, r2Url: getPublicUrl(s3Key) }),
                updateId,
            },
        })
        return NextResponse.json({ cached: true, r2Url: getPublicUrl(s3Key) }, { status: 200 })
    }

    // File is new — generate a presigned PUT URL for direct R2 upload
    const mimeType = getMimeType(fileExt)
    const presignedUrl = await generatePresignedUploadUrl(s3Key, mimeType)

    return NextResponse.json({
        presignedUrl,
        s3Key,
        r2Url: getPublicUrl(s3Key),
    }, { status: 200 })
}
