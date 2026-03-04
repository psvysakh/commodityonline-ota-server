import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUpdateDir, getAssetPath } from '@/lib/storage'
import fs from 'fs'

/**
 * POST /api/updates/rollback
 *
 * Safely "rolls back" the channel to a previous update by treating that old update
 * as a brand new publish action. It duplicates the DB records and copies the
 * physical asset files so the existing `manifest` endpoint automatically serves
 * the rolled-back code without being modified.
 *
 * Accepts JSON body: { updateId: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { updateId } = body

        if (!updateId) {
            return NextResponse.json({ error: 'Missing updateId in request body' }, { status: 400 })
        }

        // 1. Look up the historical update and its assets
        const historicalUpdate = await prisma.update.findUnique({
            where: { id: updateId },
            include: { assets: true },
        })

        if (!historicalUpdate) {
            return NextResponse.json({ error: 'Historical update not found' }, { status: 404 })
        }

        if (historicalUpdate.assets.length === 0) {
            return NextResponse.json({ error: 'Historical update has no assets to rollback' }, { status: 400 })
        }

        // 2. Create the brand new Update row (new createdAt timestamp automatically makes it "latest")
        const newUpdate = await prisma.update.create({
            data: {
                platform: historicalUpdate.platform,
                runtimeVersion: historicalUpdate.runtimeVersion,
                channelId: historicalUpdate.channelId,
                message: `Rollback to ${historicalUpdate.id.slice(0, 8)}`,
                extra: historicalUpdate.extra,
                assets: { create: [] }, // We will add assets next
            },
        })

        // 3. Duplicate all Asset records (the new global asset pool in `api/assets` handles finding the files automatically)
        for (const oldAsset of historicalUpdate.assets) {
            await prisma.asset.create({
                data: {
                    hash: oldAsset.hash,
                    key: oldAsset.key,
                    meta: oldAsset.meta, // Preserve original meta untouched
                    fileExt: oldAsset.fileExt,
                    updateId: newUpdate.id,
                }
            })
        }

        return NextResponse.json({ success: true, newUpdateId: newUpdate.id }, { status: 201 })

    } catch (e: any) {
        console.error('[Rollback Error]', e)
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 })
    }
}
