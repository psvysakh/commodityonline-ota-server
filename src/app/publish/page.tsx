'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function PublishPage() {
    const router = useRouter()
    const bundleInputRef = useRef<HTMLInputElement>(null)
    const assetsInputRef = useRef<HTMLInputElement>(null)

    const [form, setForm] = useState({
        platform: 'android',
        runtimeVersion: '1',
        channelName: 'production',
    })
    const [bundleFile, setBundleFile] = useState<File | null>(null)
    const [assetFiles, setAssetFiles] = useState<File[]>([])
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
    const [dragging, setDragging] = useState(false)

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) setBundleFile(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!bundleFile) {
            setResult({ success: false, message: 'Please select a bundle file.' })
            return
        }

        setLoading(true)
        setResult(null)

        try {
            const fd = new FormData()
            fd.append('platform', form.platform)
            fd.append('runtimeVersion', form.runtimeVersion)
            fd.append('channelName', form.channelName)
            fd.append('bundle', bundleFile)
            assetFiles.forEach((f) => fd.append('assets', f))

            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            const data = await res.json()

            if (res.ok) {
                setResult({ success: true, message: `✓ Update published! ID: ${data.updateId}` })
                setBundleFile(null)
                setAssetFiles([])
                setTimeout(() => router.push('/updates'), 1500)
            } else {
                setResult({ success: false, message: data.error || 'Upload failed' })
            }
        } catch {
            setResult({ success: false, message: 'Network error. Is the server running?' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: '36px 40px', maxWidth: 700 }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                    <span className="gradient-text">Publish</span> Update
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Upload a JavaScript bundle from <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 5 }}>npx expo export</code> to push an OTA update.
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text-secondary)' }}>
                        Update Configuration
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Platform
                            </label>
                            <select
                                className="select-field"
                                value={form.platform}
                                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                            >
                                <option value="android">Android</option>
                                <option value="ios">iOS</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Runtime Version
                            </label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="1"
                                value={form.runtimeVersion}
                                onChange={(e) => setForm({ ...form, runtimeVersion: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Channel
                            </label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="production"
                                value={form.channelName}
                                onChange={(e) => setForm({ ...form, channelName: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text-secondary)' }}>
                        Bundle File <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(required)</span>
                    </h2>

                    <div
                        className={`drop-zone ${dragging ? 'active' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => bundleInputRef.current?.click()}
                    >
                        <input
                            ref={bundleInputRef}
                            type="file"
                            accept=".bundle,.js,.pack"
                            style={{ display: 'none' }}
                            onChange={(e) => e.target.files?.[0] && setBundleFile(e.target.files[0])}
                        />
                        {bundleFile ? (
                            <div>
                                <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                                    {bundleFile.name}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {(bundleFile.size / 1024).toFixed(1)} KB — Click to change
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                    Drag & drop your bundle file here
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                    or click to browse — <code>.bundle</code> file from <code>expo export</code>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                        Extra Assets <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Images, fonts, and other assets referenced by your bundle.
                    </p>
                    <input
                        ref={assetsInputRef}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            if (e.target.files) setAssetFiles(Array.from(e.target.files))
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => assetsInputRef.current?.click()}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            padding: '10px 16px',
                            color: 'var(--text-secondary)',
                            fontSize: 13,
                            cursor: 'pointer',
                            marginBottom: assetFiles.length > 0 ? 12 : 0,
                        }}
                    >
                        📎 Choose asset files
                    </button>
                    {assetFiles.length > 0 && (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            {assetFiles.length} file(s) selected:{' '}
                            {assetFiles.map((f) => f.name).join(', ')}
                        </div>
                    )}
                </div>

                {result && (
                    <div
                        style={{
                            padding: '14px 18px',
                            borderRadius: 10,
                            marginBottom: 16,
                            background: result.success
                                ? 'rgba(16, 185, 129, 0.1)'
                                : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${result.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            color: result.success ? '#34d399' : '#f87171',
                            fontSize: 14,
                            fontWeight: 500,
                        }}
                    >
                        {result.message}
                    </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                    {loading ? '⏳ Publishing...' : '✦ Publish Update'}
                </button>
            </form>
        </div>
    )
}
