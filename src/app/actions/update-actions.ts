'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function toggleUpdatePublishStatus(id: string, isPublished: boolean) {
    try {
        await prisma.update.update({
            where: { id },
            data: {
                // @ts-ignore - Bypass Next.js TS cache for newly added Prisma field
                isPublished
            } as any
        })
        revalidatePath('/updates')
        // @ts-ignore - Bypass Next.js TS typings issue for cache tags
        revalidateTag('manifest')
        return { success: true }
    } catch (error) {
        console.error('Failed to toggle publish status:', error)
        return { success: false, error: 'Failed to update publish status' }
    }
}
