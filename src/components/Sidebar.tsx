'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const nav = [
    {
        section: 'Dashboard',
        items: [
            { href: '/', label: 'Overview', icon: '◈' },
            { href: '/updates', label: 'Updates', icon: '⬆' },
            { href: '/channels', label: 'Channels', icon: '⬡' },
        ],
    },
    {
        section: 'Actions',
        items: [
            { href: '/publish', label: 'Publish Update', icon: '✦' },
        ],
    },
    {
        section: 'Integration',
        items: [
            { href: '/docs', label: 'Client Setup Guide', icon: '⌗' },
        ],
    },
]

export default function Sidebar() {
    const pathname = usePathname()

    const [theme, setTheme] = useState('dark')

    useEffect(() => {
        const stored = localStorage.getItem('theme') || 'dark'
        setTheme(stored)
        document.documentElement.setAttribute('data-theme', stored)
    }, [])

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark'
        setTheme(next)
        localStorage.setItem('theme', next)
        document.documentElement.setAttribute('data-theme', next)
    }

    return (
        <aside
            style={{
                width: 240,
                minHeight: '100vh',
                background: 'var(--bg-sidebar)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                padding: '0 12px 24px',
                flexShrink: 0,
            }}
        >
            {/* Logo */}
            <div style={{ padding: '24px 14px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            flexShrink: 0,
                        }}
                    >
                        ⚡
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                            OTA Server
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expo Updates</div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, paddingTop: 8 }}>
                {nav.map((group) => (
                    <div key={group.section}>
                        <div className="section-label">{group.section}</div>
                        {group.items.map((item) => {
                            const isActive =
                                item.href === '/'
                                    ? pathname === '/'
                                    : pathname.startsWith(item.href)
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                >
                                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div
                style={{
                    padding: '14px',
                    borderTop: '1px solid var(--border)',
                    marginTop: 'auto',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Theme
                    </div>
                    <button
                        onClick={toggleTheme}
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 20,
                            padding: '4px 10px',
                            color: 'var(--text-primary)',
                            fontSize: 12,
                            cursor: 'pointer',
                        }}
                    >
                        {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                    </button>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        Expo Updates Protocol
                    </div>
                    Self-hosted OTA update server for React Native apps. No store submissions needed.
                </div>
            </div>
        </aside>
    )
}
