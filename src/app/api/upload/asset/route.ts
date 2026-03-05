import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureGlobalAssetsDir, getGlobalAssetPath, getGlobalBundlePath } from '@/lib/storage'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

/**
 * POST /api/upload/asset?updateId=<uuid>
 *
 * Second step of the chunked upload protocol.
 * Uploads a SINGLE asset (bundle or extra asset) for an already-created Update.
 *
 * Form data:
 *   hash     : string  – base64url SHA-256 hash of the file
 *   key      : string  – asset key (Metro hash or "bundle" for the JS bundle)
 *   fileExt  : string  – file extension without leading dot (e.g. "bundle", "png", "ttf")
 *   file     : File?   – OPTIONAL. If the server already has this hash, omit the file.
 *
 * When `file` is omitted, the server checks if the hash already exists on disk.
 * If it does, a new Asset DB row is created pointing to the existing global file.
 * If the file is missing AND no file was sent, a 422 is returned.
 */
export async function POST(req: NextRequest) {
    const updateId = req.nextUrl.searchParams.get('updateId')
    if (!updateId) {
        return NextResponse.json({ error: 'Missing ?updateId query parameter' }, { status: 400 })
    }

    const update = await prisma.update.findUnique({ where: { id: updateId } })
    if (!update) {
        return NextResponse.json({ error: `Update "${updateId}" not found` }, { status: 404 })
    }

    const formData = await req.formData()
    const hash = formData.get('hash') as string
    const key = formData.get('key') as string
    const fileExt = formData.get('fileExt') as string
    const fileBlob = formData.get('file') as File | null
    const originalName = (formData.get('originalName') as string) ?? `${key}.${fileExt}`

    if (!hash || !key || !fileExt) {
        return NextResponse.json({ error: 'Missing required fields: hash, key, fileExt' }, { status: 400 })
    }

    ensureGlobalAssetsDir()

    const isBundle = fileExt === 'bundle'
    const globalPath = isBundle ? getGlobalBundlePath(hash) : getGlobalAssetPath(hash, fileExt)

    // Save the file to disk if provided and not already stored
    if (fileBlob) {
        if (!fs.existsSync(globalPath)) {
            let buf = Buffer.from(await fileBlob.arrayBuffer())
            // Decompress if the client sent a gzip-compressed payload
            const encoding = (formData.get('encoding') as string) ?? 'identity'
            if (encoding === 'gzip') {
                buf = zlib.gunzipSync(buf)
            }
            fs.mkdirSync(path.dirname(globalPath), { recursive: true })
            fs.writeFileSync(globalPath, buf)
        }
    } else {
        // File not provided — make sure we already have it on disk
        if (!fs.existsSync(globalPath)) {
            return NextResponse.json(
                { error: `Asset with hash "${hash}" not found on server. Send the file.` },
                { status: 422 }
            )
        }
    }

    const asset = await prisma.asset.create({
        data: {
            hash,
            key: isBundle ? crypto.randomUUID() : key, // bundle key must be unique per update
            fileExt,
            meta: JSON.stringify({ originalName, filename: `${key}.${fileExt}` }),
            updateId,
        },
    })

    return NextResponse.json({ assetId: asset.id }, { status: 201 })
}
