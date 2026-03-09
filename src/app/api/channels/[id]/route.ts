import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    if (!id) {
        return NextResponse.json({ error: 'Missing channel ID parameter' }, { status: 400 })
    }

    try {
        // Find the channel first to ensure it exists
        const channel = await prisma.channel.findUnique({
            where: { id }
        })

        if (!channel) {
            return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
        }

        // Prevent deleting the default 'production' channel (as a safety precaution)
        if (channel.name === 'production') {
            return NextResponse.json({ error: 'Cannot delete the main production channel' }, { status: 403 })
        }

        // The Prisma schema is set up with onDelete: Cascade for Updates in a Channel,
        // so deleting the channel will also delete all its associated updates and their records.
        // NOTE: This does NOT delete the physical files from R2/disk to be safe and fast.
        await prisma.channel.delete({
            where: { id }
        })

        revalidatePath('/channels')

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Failed to delete channel:', error)
        return NextResponse.json({ error: 'Internal server error while deleting channel.' }, { status: 500 })
    }
}
