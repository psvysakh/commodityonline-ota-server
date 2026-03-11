import fs from 'fs'
import crypto from 'crypto'

const BENCHMARK_SIZE_MB = 1
const SECRET = '925abfde8c28324fa602586b28b096d90491cdb972208f1258a378c42dae820a'

async function uploadBenchmark(serverUrl, sizeMb) {
    console.log(`\n---------------------------------`)
    console.log(`📡 Testing upload to: ${serverUrl}`)
    console.log(`📦 Payload size     : ${sizeMb} MB`)

    const buffer = crypto.randomBytes(sizeMb * 1024 * 1024)
    const hash = crypto.createHash('sha256').update(buffer).digest('base64url')
    const updateId = crypto.randomUUID()

    const fd = new FormData()
    fd.append('hash', hash)
    fd.append('key', 'benchmark_test')
    fd.append('fileExt', 'bin')
    fd.append('originalName', 'benchmark.bin')
    fd.append('file', new Blob([buffer], { type: 'application/octet-stream' }), 'benchmark.bin')

    const start = Date.now()
    try {
        const res = await fetch(`${serverUrl}/api/upload/asset?updateId=${updateId}`, {
            method: 'POST',
            headers: {
                'x-upload-token': SECRET
            },
            body: fd,
        })

        // Ensure stream consumed
        await res.text().catch(() => { })

        const durationSeconds = (Date.now() - start) / 1000
        const throughput = (sizeMb / durationSeconds).toFixed(2)

        console.log(`✅ Success!`)
        console.log(`⏳ Time           : ${durationSeconds.toFixed(2)} seconds`)
        console.log(`🚀 Speed          : ${throughput} MB/s (${(throughput * 1024).toFixed(0)} KB/s)`)

        if (durationSeconds > 10) {
            console.log(`⚠️  WARNING: Speed is very slow due to internet / Nginx throttling.`)
        }
    } catch (err) {
        console.log(`❌ Failed: ${err.message}`)
    }
}

async function run() {
    console.log(`\n=== 🧪 UPLOAD SPEED BENCHMARK ===`)

    // 1. Test localhost Next.js server (proves Node server handles bytes instantly)
    await uploadBenchmark('http://localhost:3000', BENCHMARK_SIZE_MB)

    // 2. Test Cloudways production server (proves network / Nginx proxy limits)
    await uploadBenchmark('https://phpstack-979358-6256434.cloudwaysapps.com', BENCHMARK_SIZE_MB)
}

run()
