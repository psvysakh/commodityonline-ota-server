import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import { getGlobalAssetPath, getGlobalBundlePath } from '@/lib/storage'

// DELETE /api/updates/[id] - delete an update and its files
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

    // Delete the database records
    await prisma.asset.deleteMany({ where: { updateId: id } })
    await prisma.update.delete({ where: { id } })

    // Garbage Collection: Safely delete physical files if they are no longer referenced by ANY other update
    for (const asset of update.assets) {
        const refs = await prisma.asset.count({ where: { hash: asset.hash } })

        if (refs === 0) {
            const filePath = asset.fileExt === 'bundle'
                ? getGlobalBundlePath(asset.hash)
                : getGlobalAssetPath(asset.hash, asset.fileExt)

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
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
