import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import LocalTime from '@/components/LocalTime'

export const dynamic = 'force-dynamic'

async function getStats() {
  const [totalUpdates, totalChannels, iosUpdates, androidUpdates, recentUpdates] =
    await Promise.all([
      prisma.update.count(),
      prisma.channel.count(),
      prisma.update.count({ where: { platform: 'ios' } }),
      prisma.update.count({ where: { platform: 'android' } }),
      prisma.update.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { channel: true, _count: { select: { assets: true } } },
      }),
    ])

  return { totalUpdates, totalChannels, iosUpdates, androidUpdates, recentUpdates }
}

export default async function DashboardPage() {
  const stats = await getStats()

  const statCards = [
    {
      label: 'Total Updates',
      value: stats.totalUpdates,
      icon: '⬆',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
    },
    {
      label: 'Channels',
      value: stats.totalChannels,
      icon: '⬡',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.1)',
    },
    {
      label: 'iOS Updates',
      value: stats.iosUpdates,
      icon: '🍎',
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.1)',
    },
    {
      label: 'Android Updates',
      value: stats.androidUpdates,
      icon: '🤖',
      color: '#34d399',
      bg: 'rgba(52,211,153,0.1)',
    },
  ]

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 999,
            padding: '4px 14px',
            fontSize: 12,
            color: '#60a5fa',
            marginBottom: 16,
          }}
        >
          <span
            className="pulse-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#60a5fa',
              display: 'inline-block',
            }}
          />
          Server Online
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          <span className="gradient-text">Expo OTA</span> Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
          Push JavaScript updates directly to your users — no app store review required.
        </p>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 36,
        }}
      >
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: card.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                marginBottom: 16,
              }}
            >
              {card.icon}
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: card.color,
                lineHeight: 1,
                marginBottom: 6,
              }}
            >
              {card.value}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick action + Recent updates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* Quick Actions */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link
              href="/publish"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
                border: '1px solid rgba(59,130,246,0.2)',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 20 }}>✦</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Publish Update</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Push new JS bundle</div>
              </div>
            </Link>

            <Link
              href="/channels"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 20 }}>⬡</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Manage Channels</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>production, staging…</div>
              </div>
            </Link>

            <Link
              href="/docs"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 20 }}>⌗</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Client Setup</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configure your app</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Updates */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Updates</h2>
            <Link
              href="/updates"
              style={{ fontSize: 13, color: '#60a5fa', textDecoration: 'none', fontWeight: 500 }}
            >
              View all →
            </Link>
          </div>

          {stats.recentUpdates.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No updates yet</div>
              <div style={{ fontSize: 13 }}>
                Publish your first update to get started.
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Platform</th>
                  <th>Channel</th>
                  <th>Runtime</th>
                  <th>Installs</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUpdates.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {u.id.slice(0, 8)}…
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
                    <td style={{ color: 'var(--text-primary)' }}>v{u.runtimeVersion}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {u.installs}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <LocalTime dateStr={u.createdAt.toISOString()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
