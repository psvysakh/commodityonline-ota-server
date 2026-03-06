'use client'

import { useEffect, useState } from 'react'

export default function LocalTime({ dateStr }: { dateStr: string }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    if (!mounted) {
        // Render a placeholder or the UTC time before hydration
        return <span style={{ opacity: 0.5 }}>Loading...</span>
    }

    return (
        <span>
            {new Date(dateStr).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })}
        </span>
    )
}
