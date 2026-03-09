'use client'

import { useState } from 'react'

export default function DeleteChannelButton({ id }: { id: string }) {
    const [isDeleting, setIsDeleting] = useState(false)

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this channel? Any updates tied to it will also be deleted.')) {
            return
        }

        setIsDeleting(true)
        try {
            const res = await fetch(`/api/channels/${id}`, { method: 'DELETE' })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to delete channel')
            }
            window.location.reload()
        } catch (err: any) {
            alert(err.message)
            setIsDeleting(false)
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
                background: 'rgba(255, 60, 60, 0.1)',
                color: '#ff4444',
                border: '1px solid rgba(255, 60, 60, 0.2)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            }}
        >
            <span style={{ fontSize: 10 }}>🗑</span> {isDeleting ? '...' : 'Delete'}
        </button>
    )
}
