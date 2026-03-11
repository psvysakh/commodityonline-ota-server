import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import DeleteUpdateButton from '@/components/DeleteUpdateButton'
import RollbackButton from '@/components/RollbackButton'
import LocalTime from '@/components/LocalTime'
import ChannelFilter from '@/components/ChannelFilter'
import TogglePublishButton from '@/components/TogglePublishButton'

export const dynamic = 'force-dynamic'

export default async function UpdatesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const platformParam = typeof params.platform === 'string' ? params.platform.toLowerCase() : undefined
    const rawChannel = typeof params.channel === 'string' ? params.channel.toLowerCase() : undefined
    const channelParam = rawChannel || 'production'

    const whereClause: any = {}
    if (platformParam && ['ios', 'android'].includes(platformParam)) {
        whereClause.platform = platformParam
    }
    if (channelParam !== 'all') {
        whereClause.channel = { name: channelParam }
    }

    const updates = await prisma.update.findMany({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        include: { channel: true, _count: { select: { assets: true } } },
        orderBy: { createdAt: 'desc' },
    })

    const allChannels = await prisma.channel.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    const tabs = [
        { label: 'All', value: undefined },
        { label: 'iOS', value: 'ios' },
        { label: 'Android', value: 'android' },
    ]

    return (
        <div style={{ padding: '36px 40px', width: '100%', maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                        All <span className="gradient-text">Updates</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        {updates.length} total updates across {platformParam ? `the ${platformParam} platform` : 'all platforms'} {channelParam !== 'all' ? `in the ${channelParam} channel` : ''}.
                    </p>
                </div>
                <Link href="/publish" className="btn-primary">
                    ✦ Publish New Update
                </Link>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <ChannelFilter channels={allChannels} currentChannel={channelParam} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {tabs.map(tab => {
                        const isActive = platformParam === tab.value
                        
                        const p = new URLSearchParams()
                        if (tab.value) p.set('platform', tab.value)
                        if (rawChannel) p.set('channel', rawChannel)
                        const href = p.toString() ? `?${p.toString()}` : '?'

                        return (
                            <Link
                                key={tab.label}
                                href={href}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    background: isActive ? 'var(--bg-elevated)' : 'transparent',
                                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    border: `1px solid ${isActive ? 'var(--border-color)' : 'transparent'}`,
                                    textDecoration: 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {tab.label}
                            </Link>
                        )
                    })}
                </div>
            </div>

            <div className="glass-card" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                {updates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>No updates found</div>
                        <div style={{ fontSize: 14, marginBottom: 20 }}>There are no updates for this platform yet.</div>
                        <Link href="/publish" className="btn-primary" style={{ display: 'inline-flex' }}>
                            ✦ Publish First Update
                        </Link>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Update ID</th>
                                <th>Platform</th>
                                <th>Channel</th>
                                <th>Status</th>
                                <th>Runtime Version</th>
                                <th>Assets</th>
                                <th>Installs</th>
                                <th>Published</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {updates.map((u: any) => (
                                <tr key={u.id} style={{ opacity: u.isPublished ? 1 : 0.6 }}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span title={u.id}>{u.id.slice(0, 12)}…</span>
                                            {u.isMandatory && (
                                                <span style={{ 
                                                    background: 'rgba(239, 68, 68, 0.15)', 
                                                    color: '#ef4444', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '4px', 
                                                    fontSize: 10, 
                                                    fontWeight: 'bold', 
                                                    textTransform: 'uppercase', 
                                                    fontFamily: 'sans-serif',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)'
                                                }}>
                                                    Mandatory
                                                </span>
                                            )}
                                        </div>
                                        {u.message && (
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, fontFamily: 'sans-serif', fontWeight: 500 }}>
                                                <span style={{ opacity: 0.6 }}>↳</span> {u.message}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge badge-${u.platform}`}>{u.platform}</span>
                                    </td>
                                    <td>
                                        <span className="badge badge-channel">{u.channel.name}</span>
                                    </td>
                                    <td>
                                        <TogglePublishButton id={u.id} isPublished={u.isPublished} />
                                    </td>
                                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                        v{u.runtimeVersion}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>
                                        {u._count.assets} file{u._count.assets !== 1 ? 's' : ''}
                                    </td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        {u.installs}
                                    </td>
                                    <td style={{ fontSize: 12 }}>
                                        <LocalTime dateStr={u.createdAt.toISOString()} />
                                    </td>
                                    <td>
                                        <RollbackButton id={u.id} />
                                        <DeleteUpdateButton id={u.id} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
