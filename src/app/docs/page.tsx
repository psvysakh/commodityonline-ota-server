export default function DocsPage() {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://YOUR_SERVER_IP:3000'

    const codeBlock = (code: string) => (
        <pre
            style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '16px 20px',
                fontSize: 13,
                lineHeight: 1.7,
                overflowX: 'auto',
                marginTop: 12,
                fontFamily: 'monospace',
                color: '#a5f3fc',
            }}
        >
            {code}
        </pre>
    )

    return (
        <div style={{ padding: '36px 40px', maxWidth: 800 }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                    Client <span className="gradient-text">Setup Guide</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Follow these steps to connect your Expo React Native app to this server.
                </p>
            </div>

            {[
                {
                    step: '1',
                    title: 'Install expo-updates',
                    desc: 'In your Expo project, install the expo-updates library:',
                    code: `npx expo install expo-updates`,
                },
                {
                    step: '2',
                    title: 'Configure app.json',
                    desc: `Edit your app.json to point updates to this server. Set the updates URL to this server's manifest endpoint:`,
                    code: `{
  "expo": {
    "runtimeVersion": {
      "policy": "nativeVersion"
    },
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "url": "${baseUrl}/api/manifest"
    }
  }
}`,
                },
                {
                    step: '3',
                    title: 'Configure expo-updates in code (optional)',
                    desc: 'You can specify the channel at runtime or via build config. For a static channel, set EAS_UPDATE_CHANNEL in your build env. Alternatively, the client will send expo-channel-name: "production" by default.',
                    code: `// app.config.js — dynamic config example
module.exports = {
  expo: {
    extra: {
      channel: process.env.CHANNEL ?? 'production',
    },
    updates: {
      url: '${baseUrl}/api/manifest',
    },
  },
}`,
                },
                {
                    step: '4',
                    title: 'Build your native app once',
                    desc: 'Before OTA updates work, each user must install the base native build. Build it with EAS Build or locally:',
                    code: `# Build the base app (only needed once per native change)
npx expo run:android
npx expo run:ios`,
                },
                {
                    step: '5',
                    title: 'Publish a JS-only update',
                    desc: 'Whenever you change only JavaScript/assets, export and upload via this dashboard:',
                    code: `# In your Expo project:
npx expo export --platform android
# or
npx expo export --platform ios

# Then upload the .bundle file via the "Publish Update" page`,
                },
                {
                    step: '6',
                    title: 'Test updates',
                    desc: 'On next app launch, expo-updates will call our manifest endpoint. If a newer update exists for the device\'s runtime version and channel, it will be downloaded in the background and applied on the next restart.',
                    code: `# The expo-updates client sends these headers to /api/manifest:
expo-platform: android
expo-runtime-version: 1.0.0
expo-channel-name: production
expo-current-update-id: <current-update-id>`,
                },
            ].map((item) => (
                <div key={item.step} className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 14,
                                flexShrink: 0,
                                marginTop: 2,
                            }}
                        >
                            {item.step}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.desc}</p>
                            {codeBlock(item.code)}
                        </div>
                    </div>
                </div>
            ))}

            <div
                className="glass-card"
                style={{
                    padding: 24,
                    background: 'rgba(16,185,129,0.05)',
                    borderColor: 'rgba(16,185,129,0.15)',
                }}
            >
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#34d399' }}>
                    ✓ What can be updated OTA?
                </h3>
                <ul style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 2, paddingLeft: 20 }}>
                    <li>JavaScript/TypeScript code changes</li>
                    <li>UI changes (styles, layouts, animations)</li>
                    <li>New screens or features written in JS</li>
                    <li>Images, fonts, JSON assets bundled in JS</li>
                </ul>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '16px 0 8px', color: '#f87171' }}>
                    ✗ What requires a new store build?
                </h3>
                <ul style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 2, paddingLeft: 20 }}>
                    <li>Adding or removing native modules</li>
                    <li>Changes to app.json permissions or entitlements</li>
                    <li>Upgrading the Expo SDK version</li>
                    <li>Any change to native (Java/Kotlin/Swift/ObjC) code</li>
                </ul>
            </div>
        </div>
    )
}
