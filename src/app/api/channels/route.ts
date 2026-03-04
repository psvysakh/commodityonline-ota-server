import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/channels - list all channels
export async function GET() {
    const channels = await prisma.channel.findMany({
        include: { _count: { select: { updates: true } } },
        orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(channels)
}

// POST /api/channels - create a new channel
export async function POST(req: NextRequest) {
    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
        return NextResponse.json({ error: 'Channel name is required' }, { status: 400 })
    }

    try {
        const channel = await prisma.channel.create({ data: { name: name.toLowerCase().trim() } })
        return NextResponse.json(channel, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Channel already exists' }, { status: 409 })
    }
}
