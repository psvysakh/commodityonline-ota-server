import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUploadAuth } from '@/lib/upload-auth'

/**
 * POST /api/upload/begin
 *
 * First step of the chunked upload protocol.
 * Creates the Update + upserts the Channel, then returns the new updateId.
 * The caller then uploads each asset individually via POST /api/upload/asset.
 *
 * Body (JSON):
 *   platform        : "ios" | "android"
 *   runtimeVersion  : string
 *   channelName     : string
 *   extra           : string | null  (stringified JSON of app.json extra)
 */
export async function POST(req: NextRequest) {
    const authError = validateUploadAuth(req)
    if (authError) return authError
    const body = await req.json()
    const { platform, runtimeVersion, channelName, extra = null } = body

    if (!platform || !runtimeVersion || !channelName) {
        return NextResponse.json(
            { error: 'Missing required fields: platform, runtimeVersion, channelName' },
            { status: 400 }
        )
    }

    if (!['ios', 'android'].includes(platform)) {
        return NextResponse.json({ error: 'platform must be "ios" or "android"' }, { status: 400 })
    }

    const channel = await prisma.channel.upsert({
        where: { name: channelName.toLowerCase().trim() },
        create: { name: channelName.toLowerCase().trim() },
        update: {},
    })

    const update = await prisma.update.create({
        data: {
            platform,
            runtimeVersion,
            channelId: channel.id,
            extra: extra ?? null,
            assets: { create: [] },
        },
    })

    return NextResponse.json({ updateId: update.id, channelId: channel.id }, { status: 201 })
}
