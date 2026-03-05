import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const S3_ENDPOINT = process.env.S3_ENDPOINT!
const S3_REGION = process.env.S3_REGION ?? 'auto'
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID!
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY!
export const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL!

if (!S3_ENDPOINT || !S3_BUCKET_NAME || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    console.warn('[s3] WARNING: S3 environment variables are not configured. File uploads will fail.')
}

export const s3 = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
})

/**
 * Checks if a file with the given key already exists in the R2 bucket.
 * Returns true if found, false if not.
 */
export async function s3FileExists(key: string): Promise<boolean> {
    try {
        await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }))
        return true
    } catch {
        return false
    }
}

/**
 * Generates a pre-signed PUT URL for the given S3 key.
 * The caller can then HTTP PUT the file bytes directly to this URL.
 * URL expires in 15 minutes.
 */
export async function generatePresignedUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    })
    return getSignedUrl(s3, command, { expiresIn: 900 })
}

/**
 * Returns the public CDN URL for the given S3 key.
 * e.g. https://pub-xxxx.r2.dev/bundles/abc123.hbc
 */
export function getPublicUrl(key: string): string {
    return `${S3_PUBLIC_URL}/${key}`
}

/**
 * Maps a file extension to a common MIME type.
 */
export function getMimeType(fileExt: string): string {
    const mimeTypes: Record<string, string> = {
        hbc: 'application/octet-stream',
        bundle: 'application/octet-stream',
        js: 'application/javascript',
        json: 'application/json',
        ttf: 'font/ttf',
        otf: 'font/otf',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
    }
    return mimeTypes[fileExt.toLowerCase()] ?? 'application/octet-stream'
}
