import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import DeleteUpdateButton from '@/components/DeleteUpdateButton'
import RollbackButton from '@/components/RollbackButton'
import LocalTime from '@/components/LocalTime'

export const dynamic = 'force-dynamic'

export default async function UpdatesPage() {
    const updates = await prisma.update.findMany({
        include: { channel: true, _count: { select: { assets: true } } },
        orderBy: { createdAt: 'desc' },
    })

    return (
        <div style={{ padding: '36px 40px', maxWidth: 1100 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                        All <span className="gradient-text">Updates</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        {updates.length} total updates across all channels and platforms.
                    </p>
                </div>
                <Link href="/publish" className="btn-primary">
                    ✦ Publish New Update
                </Link>
            </div>

            <div className="glass-card" style={{ overflow: 'hidden' }}>
                {updates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>No updates published yet</div>
                        <div style={{ fontSize: 14, marginBottom: 20 }}>Push your first OTA update to get started.</div>
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
                                <th>Runtime Version</th>
                                <th>Assets</th>
                                <th>Installs</th>
                                <th>Published</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {updates.map((u) => (
                                <tr key={u.id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)' }}>
                                        <span title={u.id}>{u.id.slice(0, 12)}…</span>
                                        {u.message && (
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'sans-serif' }}>
                                                {u.message}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge badge-${u.platform}`}>{u.platform}</span>
                                    </td>
                                    <td>
                                        <span className="badge badge-channel">{u.channel.name}</span>
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
