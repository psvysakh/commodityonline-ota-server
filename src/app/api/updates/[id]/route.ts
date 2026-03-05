import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import { getGlobalAssetPath, getGlobalBundlePath } from '@/lib/storage'
import { s3, S3_PUBLIC_URL } from '@/lib/s3'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

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

    // Delete the database records first
    await prisma.asset.deleteMany({ where: { updateId: id } })
    await prisma.update.delete({ where: { id } })

    // Garbage Collection: only delete physical files if no other update references the same hash
    for (const asset of update.assets) {
        const refs = await prisma.asset.count({ where: { hash: asset.hash } })
        if (refs > 0) continue // Still referenced by another update — skip deletion

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
