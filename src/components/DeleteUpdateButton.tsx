'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteUpdateButton({ id }: { id: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (!confirm('Delete this update? This cannot be undone.')) return
        setLoading(true)
        try {
            const res = await fetch(`/api/updates/${id}`, { method: 'DELETE' })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Failed to delete update')
            }
            alert('Update deleted successfully.')
            router.refresh()
        } catch (error: any) {
            console.error('Delete error:', error)
            alert(error.message || 'An error occurred while deleting.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            className="btn-danger"
            onClick={handleDelete}
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
        >
            {loading ? '⏳ Deleting...' : '🗑 Delete'}
        </button>
    )
}
