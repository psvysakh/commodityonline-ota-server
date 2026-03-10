'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function toggleUpdatePublishStatus(id: string, isPublished: boolean) {
    try {
        await prisma.update.update({
            where: { id },
            data: { isPublished }
        })
        
        revalidatePath('/updates')
        return { success: true }
    } catch (error) {
        console.error('Failed to toggle publish status:', error)
        return { success: false, error: 'Failed to update publish status' }
    }
}
