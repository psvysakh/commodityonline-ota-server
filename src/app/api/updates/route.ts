import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/updates - list all updates (with assets)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get('channelId')
    const platform = searchParams.get('platform')

    const updates = await prisma.update.findMany({
        where: {
            ...(channelId ? { channelId } : {}),
            ...(platform ? { platform } : {}),
        },
        include: {
            channel: true,
            assets: true,
            _count: { select: { assets: true } },
        },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(updates)
}
