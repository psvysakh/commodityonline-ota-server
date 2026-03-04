import fs from 'fs'
import path from 'path'

// All uploaded update bundles are stored in /uploads inside the project
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

export function ensureUploadsDir() {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true })
    }
}

export function getUpdateDir(updateId: string): string {
    return path.join(UPLOADS_DIR, updateId)
}

export function ensureUpdateDir(updateId: string): string {
    const dir = getUpdateDir(updateId)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
    return dir
}

export function getAssetPath(updateId: string, filename: string): string {
    return path.join(getUpdateDir(updateId), filename)
}

// ─── Global Hash-Based Asset Pool ──────────────────────────────────────────

export const ASSETS_DIR = path.join(UPLOADS_DIR, 'assets')
export const BUNDLES_DIR = path.join(UPLOADS_DIR, 'bundles')
export const FONTS_DIR = path.join(UPLOADS_DIR, 'fonts')
export const IMAGES_DIR = path.join(UPLOADS_DIR, 'images')

export function ensureGlobalAssetsDir() {
    const dirs = [ASSETS_DIR, BUNDLES_DIR, FONTS_DIR, IMAGES_DIR]
    for (const d of dirs) {
        if (!fs.existsSync(d)) {
            fs.mkdirSync(d, { recursive: true })
        }
    }
}

export function getGlobalAssetPath(hash: string, ext: string): string {
    const e = ext.toLowerCase()
    let parent = ASSETS_DIR

    if (['ttf', 'otf', 'woff', 'woff2'].includes(e)) {
        parent = FONTS_DIR
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(e)) {
        parent = IMAGES_DIR
    }

    return path.join(parent, `${hash}.${ext}`)
}

export function getGlobalBundlePath(hash: string): string {
    return path.join(BUNDLES_DIR, `${hash}.bundle`)
}
