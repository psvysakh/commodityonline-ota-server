import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
    // Read the credentials from the environment variables
    const adminUsername = process.env.ADMIN_USERNAME
    const adminPassword = process.env.ADMIN_PASSWORD

    // If credentials are not set, allow access without authentication
    // (This is useful for local development if .env is missing)
    if (!adminUsername || !adminPassword) {
        return NextResponse.next()
    }

    const basicAuth = req.headers.get('authorization')

    if (basicAuth) {
        const authValue = basicAuth.split(' ')[1]
        const [user, pwd] = atob(authValue).split(':')

        if (user === adminUsername && pwd === adminPassword) {
            return NextResponse.next()
        }
    }

    // If credentials do not match or are not provided, return a 401 response
    return new NextResponse('Authentication Required', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Secure Area"',
        },
    })
}

export const config = {
    // Only run middleware on dashboard routes.
    // We EXCLUDE:
    // 1. /api/* (where the mobile app and CLI publisher interact)
    // 2. /_next/* (static Next.js assets)
    // 3. /favicon.ico (site favicon)
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
