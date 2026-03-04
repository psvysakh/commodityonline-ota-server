import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/updates/track
 *
 * Increments the install counter for a specific update.
 * Used by the app client to report a successful OTA install.
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

        const update = await prisma.update.update({
            where: { id: updateId },
            data: {
                installs: { increment: 1 }
            }
        })

        return NextResponse.json({ success: true, installs: update.installs })
    } catch (e: any) {
        // We return 200 even on error to not block the app
        console.error('[Track Error]', e)
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 200 })
    }
}
