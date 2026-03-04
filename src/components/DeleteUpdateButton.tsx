'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteUpdateButton({ id }: { id: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (!confirm('Delete this update? This cannot be undone.')) return
        setLoading(true)
        await fetch(`/api/updates/${id}`, { method: 'DELETE' })
        router.refresh()
        setLoading(false)
    }

    return (
        <button className="btn-danger" onClick={handleDelete} disabled={loading}>
            {loading ? '…' : '🗑 Delete'}
        </button>
    )
}
