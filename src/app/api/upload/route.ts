import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureGlobalAssetsDir, getGlobalAssetPath, getGlobalBundlePath } from '@/lib/storage'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

/**
 * POST /api/upload
 *
 * Accepts multipart/form-data with:
 *   platform        : "ios" | "android"
 *   runtimeVersion  : string  (e.g. "1")
 *   channelName     : string  (e.g. "production")
 *   bundle          : File    (the JS bundle from `npx expo export`)
 *   assets[]        : File[]  (optional – images, fonts, …)
 *
 * Creates a new Update + Asset records in the DB and writes files to disk
 * under uploads/<updateId>/<filename>.
 *
 * The `meta` JSON stored on each Asset includes a `filename` field so that
 * /api/assets can reconstruct the correct path without guessing.
 */
export async function POST(req: NextRequest) {
    const formData = await req.formData()

    const platform = formData.get('platform') as string
    const runtimeVersion = formData.get('runtimeVersion') as string
    const channelName = formData.get('channelName') as string
    const bundleFile = formData.get('bundle') as File | null
    const extra = formData.get('extra') as string | null

    // --- Validate ---
    if (!platform || !runtimeVersion || !channelName || !bundleFile) {
        return NextResponse.json(
            { error: 'Missing required fields: platform, runtimeVersion, channelName, bundle' },
            { status: 400 }
        )
    }

    if (!['ios', 'android'].includes(platform)) {
        return NextResponse.json({ error: 'platform must be "ios" or "android"' }, { status: 400 })
    }

    // --- Upsert channel ---
    const channel = await prisma.channel.upsert({
        where: { name: channelName.toLowerCase().trim() },
        create: { name: channelName.toLowerCase().trim() },
        update: {},
    })

    // --- Create the Update record ---
    const update = await prisma.update.create({
        data: {
            platform,
            runtimeVersion,
            channelId: channel.id,
            extra: extra,
            assets: { create: [] },
        },
    })

    ensureGlobalAssetsDir()

    // --- Save the JS bundle ---
    const bundleBuffer = Buffer.from(await bundleFile.arrayBuffer())
    // expo-updates format: base64url-encoded SHA-256 hash (NO sha256: prefix)
    const bundleHash = crypto.createHash('sha256').update(bundleBuffer).digest('base64url')

    const globalBundlePath = getGlobalBundlePath(bundleHash)
    if (!fs.existsSync(globalBundlePath)) {
        fs.writeFileSync(globalBundlePath, bundleBuffer)
    }

    const bundleAsset = await prisma.asset.create({
        data: {
            hash: bundleHash,
            key: crypto.randomUUID(), // CRITICAL: must be unique per bundle so client doesn't cache it across updates!
            fileExt: 'bundle',
            // Store filename purely for reference, though we don't need it to read the file anymore
            meta: JSON.stringify({ type: 'bundle', filename: 'bundle.bundle' }),
            updateId: update.id,
        },
    })

    // --- Save optional extra assets ---
    const extraAssets: { id: string; key: string; filename: string }[] = []
    const assetFiles = formData.getAll('assets') as File[]

    for (const assetFile of assetFiles) {
        const assetBuffer = Buffer.from(await assetFile.arrayBuffer())
        const assetHash = crypto.createHash('sha256').update(assetBuffer).digest('base64url')
        const ext = path.extname(assetFile.name).replace('.', '') || 'bin'
        const assetKey = path.basename(assetFile.name, path.extname(assetFile.name))
        const assetFilename = `${assetKey}.${ext}`

        // --- Global Deduplication Logic ---
        const globalAssetPath = getGlobalAssetPath(assetHash, ext)
        if (!fs.existsSync(globalAssetPath)) {
            fs.writeFileSync(globalAssetPath, assetBuffer)
        }

        const assetRecord = await prisma.asset.create({
            data: {
                hash: assetHash,
                key: assetKey,
                fileExt: ext,
                meta: JSON.stringify({
                    originalName: assetFile.name,
                    filename: assetFilename
                }),
                updateId: update.id,
            },
        })
        extraAssets.push({ id: assetRecord.id, key: assetKey, filename: assetFilename })
    }

    return NextResponse.json(
        {
            success: true,
            updateId: update.id,
            channel: channel.name,
            platform,
            runtimeVersion,
            bundleAssetId: bundleAsset.id,
            extraAssets,
        },
        { status: 201 }
    )
}
