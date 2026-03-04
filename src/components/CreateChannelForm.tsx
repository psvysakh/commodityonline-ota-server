'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateChannelForm() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        setLoading(true)
        setError('')

        const res = await fetch('/api/channels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        })

        const data = await res.json()
        if (res.ok) {
            setName('')
            router.refresh()
        } else {
            setError(data.error || 'Failed to create channel')
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Channel Name
                </label>
                <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. staging, beta, v2-rollout"
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                />
                {error && <div style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{error}</div>}
            </div>
            <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
                {loading ? '…' : '+ Create'}
            </button>
        </form>
    )
}
