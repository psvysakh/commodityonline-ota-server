import { prisma } from '@/lib/prisma'
import CreateChannelForm from '@/components/CreateChannelForm'

export const dynamic = 'force-dynamic'

export default async function ChannelsPage() {
    const channels = await prisma.channel.findMany({
        include: { _count: { select: { updates: true } } },
        orderBy: { createdAt: 'asc' },
    })

    return (
        <div style={{ padding: '36px 40px', maxWidth: 800 }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                    Deployment <span className="gradient-text">Channels</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Channels let you target different user groups. E.g. <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>production</code> vs <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>staging</code>.
                </p>
            </div>

            {/* Existing Channels */}
            <div className="glass-card" style={{ marginBottom: 24, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700 }}>
                        Active Channels <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 13 }}>({channels.length})</span>
                    </h2>
                </div>
                {channels.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
                        No channels created yet. Create one below.
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Channel Name</th>
                                <th>Total Updates</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {channels.map((ch) => (
                                <tr key={ch.id}>
                                    <td>
                                        <span className="badge badge-channel">⬡ {ch.name}</span>
                                    </td>
                                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                        {ch._count.updates}
                                    </td>
                                    <td style={{ fontSize: 12 }}>
                                        {new Date(ch.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Channel */}
            <div className="glass-card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Create New Channel</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                    Channel names are lowercase. When you publish an update, a channel is auto-created if it doesn't exist.
                </p>
                <CreateChannelForm />
            </div>
        </div>
    )
}
