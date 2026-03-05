import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureGlobalAssetsDir, getGlobalAssetPath, getGlobalBundlePath } from '@/lib/storage'
import { validateUploadAuth } from '@/lib/upload-auth'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

/**
 * POST /api/upload/asset?updateId=<uuid>
 *
 * Uploads a SINGLE asset (or one CHUNK of a large asset) for an already-created Update.
 *
 * Standard form data (all uploads):
 *   hash        : base64url SHA-256 of the FULL original file
 *   key         : asset key
 *   fileExt     : extension without leading dot (e.g. "bundle", "png", "ttf")
 *   originalName: original filename
 *   file        : File blob — the full file OR one chunk
 *   encoding    : "gzip" | "identity" (default identity)
 *
 * Chunked upload extra fields (for files > proxy limit, e.g. the JS bundle):
 *   chunkIndex  : 0-based index of this chunk
 *   totalChunks : total number of chunks for this file
 *
 * Chunk upload behaviour:
 *   - Each chunk is saved as  <globalPath>.chunk.<chunkIndex>
 *   - After the last chunk (chunkIndex === totalChunks-1) all pieces are
 *     concatenated into the final file and the temp files are deleted.
 *   - The DB Asset record is only created once the full file is assembled.
 *   - Intermediate chunks return 202 Accepted with no assetId.
 *
 * When `file` is omitted entirely, the server checks that the hash already
 * exists on disk (deduplication). Returns 422 if it does not.
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

    const formData = await req.formData()
    const hash = formData.get('hash') as string
    const key = formData.get('key') as string
    const fileExt = formData.get('fileExt') as string
    const fileBlob = formData.get('file') as File | null
    const originalName = (formData.get('originalName') as string) ?? `${key}.${fileExt}`
    const encoding = (formData.get('encoding') as string) ?? 'identity'

    // Chunked upload metadata
    const chunkIndexStr = formData.get('chunkIndex') as string | null
    const totalChunksStr = formData.get('totalChunks') as string | null
    const isChunked = chunkIndexStr !== null && totalChunksStr !== null

    if (!hash || !key || !fileExt) {
        return NextResponse.json({ error: 'Missing required fields: hash, key, fileExt' }, { status: 400 })
    }

    ensureGlobalAssetsDir()

    const isBundle = fileExt === 'bundle'
    const globalPath = isBundle ? getGlobalBundlePath(hash) : getGlobalAssetPath(hash, fileExt)

    // ── Chunked upload path ────────────────────────────────────────────────────
    if (isChunked && fileBlob) {
        const chunkIndex = parseInt(chunkIndexStr!, 10)
        const totalChunks = parseInt(totalChunksStr!, 10)

        if (!fs.existsSync(globalPath)) {
            // Save this chunk to a temp file
            const chunkPath = `${globalPath}.chunk.${chunkIndex}`
            const chunkBuf = Buffer.from(await fileBlob.arrayBuffer())
            fs.mkdirSync(path.dirname(chunkPath), { recursive: true })
            fs.writeFileSync(chunkPath, chunkBuf)

            // If this is the LAST chunk, assemble all pieces
            if (chunkIndex === totalChunks - 1) {
                const parts: Buffer[] = []
                for (let i = 0; i < totalChunks; i++) {
                    const p = `${globalPath}.chunk.${i}`
                    parts.push(fs.readFileSync(p))
                    fs.unlinkSync(p)
                }
                let assembled = Buffer.concat(parts)
                if (encoding === 'gzip') assembled = zlib.gunzipSync(assembled)
                fs.writeFileSync(globalPath, assembled)
                // Fall through to create the DB record below
            } else {
                // Intermediate chunk received — not done yet
                return NextResponse.json({ status: 'chunk_received', chunkIndex }, { status: 202 })
            }
        }
        // If globalPath already exists (cached from a previous upload), skip assembly
    }

    // ── Single-file (non-chunked) upload path ──────────────────────────────────
    else if (fileBlob) {
        if (!fs.existsSync(globalPath)) {
            let buf = Buffer.from(await fileBlob.arrayBuffer())
            if (encoding === 'gzip') buf = zlib.gunzipSync(buf)
            fs.mkdirSync(path.dirname(globalPath), { recursive: true })
            fs.writeFileSync(globalPath, buf)
        }
    }

    // ── No file provided — must already exist (deduplication) ─────────────────
    else {
        if (!fs.existsSync(globalPath)) {
            return NextResponse.json(
                { error: `Asset with hash "${hash}" not found on server. Send the file.` },
                { status: 422 }
            )
        }
    }

    // Create the DB Asset record (once global file is present)
    const asset = await prisma.asset.create({
        data: {
            hash,
            key: isBundle ? crypto.randomUUID() : key,
            fileExt,
            meta: JSON.stringify({ originalName, filename: `${key}.${fileExt}` }),
            updateId,
        },
    })

    return NextResponse.json({ assetId: asset.id }, { status: 201 })
}
