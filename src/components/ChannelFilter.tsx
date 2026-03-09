'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function ChannelFilter({ channels, currentChannel }: { channels: { id: string, name: string }[], currentChannel?: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value
        const params = new URLSearchParams(searchParams.toString())

        if (val === 'all') {
            params.delete('channel')
        } else {
            params.set('channel', val)
        }

        const newUrl = params.toString() ? `?${params.toString()}` : '?'
        router.push(newUrl)
    }

    return (
        <select
            value={currentChannel || 'all'}
            onChange={handleChange}
            style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                padding: '8px 32px 8px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239C9C9C%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px top 50%',
                backgroundSize: '10px auto'
            }}
        >
            <option value="all">All Channels</option>
            {channels.map(ch => (
                <option key={ch.id} value={ch.name}>{ch.name}</option>
            ))}
        </select>
    )
}
