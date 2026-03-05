import { NextRequest, NextResponse } from 'next/server'

/**
 * Validates the upload API secret from the request header.
 *
 * The publish script sends the secret via the `x-upload-secret` header.
 * The server reads the expected secret from the `UPLOAD_API_SECRET` env var.
 *
 * - If `UPLOAD_API_SECRET` is not set, a warning is printed and requests are
 *   allowed through (useful for local dev without any config).
 * - If it IS set, the header must match exactly or a 401 is returned.
 *
 * Returns `null` if auth passes, or a `NextResponse` with a 401 error if it fails.
 */
export function validateUploadAuth(req: NextRequest): NextResponse | null {
    const expected = process.env.UPLOAD_API_SECRET

    if (!expected) {
        // No secret configured — open access (warn in dev, not in production)
        if (process.env.NODE_ENV === 'production') {
            console.warn('[OTA] WARNING: UPLOAD_API_SECRET is not set. Upload endpoints are unprotected!')
        }
        return null
    }

    const provided = req.headers.get('x-upload-secret') ?? ''

    if (provided !== expected) {
        return NextResponse.json(
            { error: 'Unauthorized: invalid or missing upload secret. Set x-upload-secret header.' },
            { status: 401 }
        )
    }

    return null
}
