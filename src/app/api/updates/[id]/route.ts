import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import { getGlobalAssetPath, getGlobalBundlePath } from '@/lib/storage'
import { s3, S3_PUBLIC_URL } from '@/lib/s3'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { revalidateTag } from 'next/cache'

// DELETE /api/updates/[id] - delete an update, its DB records, R2 files, and disk files
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const update = await prisma.update.findUnique({
        where: { id },
        include: { assets: true },
    })

    if (!update) {
        return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    // Garbage Collection: only delete physical files if no other update references the same hash
    for (const asset of update.assets) {
        // Count how many total assets in the DB share this exact content hash
        const refs = await prisma.asset.count({ where: { hash: asset.hash } })
        
        // If refs > 1, another update is currently using this file! DO NOT delete it from R2/disk.
        if (refs > 1) continue 

        // At this point (refs === 1), this update is the ONLY one using this file.
        // It is safe to physically delete.
        // ── Delete from Cloudflare R2 ────────────────────────────────────────
        if (asset.meta) {
            try {
                const meta = JSON.parse(asset.meta)
                const s3Key = meta.s3Key as string | undefined

                if (s3Key) {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME!,
                        Key: s3Key,
                    }))
                    console.log(`[delete] Removed from R2: ${s3Key}`)
                }
            } catch (err) {
                // Log but don't fail — a missing R2 file shouldn't block DB cleanup
                console.warn(`[delete] Failed to delete R2 object for asset ${asset.id}:`, err)
            }
        }

        // ── Delete from local disk (legacy pre-R2 updates) ───────────────────
        const filePath = asset.fileExt === 'bundle'
            ? getGlobalBundlePath(asset.hash)
            : getGlobalAssetPath(asset.hash, asset.fileExt)

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            console.log(`[delete] Removed from disk: ${filePath}`)
        }
    }

    // Now that physical GC is complete, safely delete the database records.
    // Use a transaction to ensure both operations succeed together.
    await prisma.$transaction([
        prisma.asset.deleteMany({ where: { updateId: id } }),
        prisma.update.delete({ where: { id } })
    ])

    // @ts-ignore - Bypass Next.js TS typings issue for cache tags
    revalidateTag('manifest')

    return NextResponse.json({ success: true })
}

// GET /api/updates/[id] - get a single update
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const update = await prisma.update.findUnique({
        where: { id },
        include: { channel: true, assets: true },
    })

    if (!update) {
        return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    return NextResponse.json(update)
}
