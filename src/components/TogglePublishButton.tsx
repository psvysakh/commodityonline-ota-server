'use client'

import { useTransition } from 'react'
import { toggleUpdatePublishStatus } from '@/app/actions/update-actions'

export default function TogglePublishButton({ id, isPublished }: { id: string, isPublished: boolean }) {
    const [isPending, startTransition] = useTransition()

    return (
        <button
            onClick={() => startTransition(() => { toggleUpdatePublishStatus(id, !isPublished) })}
            disabled={isPending}
            className={`badge ${isPublished ? 'badge-ios' : ''}`}
            style={{
                background: isPublished ? 'rgba(76, 175, 80, 0.15)' : 'var(--bg-elevated)',
                color: isPublished ? '#4CAF50' : 'var(--text-muted)',
                border: `1px solid ${isPublished ? 'rgba(76, 175, 80, 0.3)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                opacity: isPending ? 0.5 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
            }}
            title={isPublished ? "Click to disable this update" : "Click to publish this update"}
        >
            <span style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                backgroundColor: isPublished ? '#4CAF50' : '#888' 
            }} />
            {isPublished ? 'Live' : 'Hidden'}
        </button>
    )
}
