'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RollbackButton({ id }: { id: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleRollback = async () => {
        if (!confirm('Are you sure you want to rollback to this update? It will be republished as the latest version.')) return
        setLoading(true)

        try {
            const res = await fetch('/api/updates/rollback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updateId: id })
            });
            const data = await res.json();

            if (!res.ok) {
                alert(`Rollback failed: ${data.error}`);
            }
        } catch (e: any) {
            alert(`Network error: ${e.message}`);
        }

        router.refresh()
        setLoading(false)
    }

    return (
        <button className="btn-secondary" onClick={handleRollback} disabled={loading} style={{ marginRight: 8 }}>
            {loading ? '…' : '↺ Rollback'}
        </button>
    )
}
