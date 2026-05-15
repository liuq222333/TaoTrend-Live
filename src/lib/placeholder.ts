/* ============================================================
   Seed-based SVG gradient placeholder (商品图 / 主播头像)
   - 不依赖外网，0 byte additional bundle weight
   - 同 Landing 的 gradientImage() 同源
   ============================================================ */

const GRADIENT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['#f43f5e', '#7e22ce'],
  ['#7e22ce', '#0ea5e9'],
  ['#0ea5e9', '#84cc16'],
  ['#a855f7', '#ec4899'],
  ['#fbbf24', '#f43f5e'],
  ['#22d3ee', '#a855f7'],
  ['#84cc16', '#0ea5e9'],
  ['#ec4899', '#7e22ce'],
] as const

function hashIndex(seed: string, mod: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(h) % mod
}

export function gradientFromSeed(seed: string): readonly [string, string] {
  return GRADIENT_PAIRS[hashIndex(seed, GRADIENT_PAIRS.length)]
}

/**
 * 600×600 SVG data URI 占位图。
 * 用于商品卡 / 主播详情 hero / 直播间商品缩略图。
 */
export function gradientImage(seed: string, label?: string): string {
  const [from, to] = gradientFromSeed(seed)
  const display = label?.slice(0, 4) ?? seed.slice(0, 4)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${from}"/>
        <stop offset="1" stop-color="${to}"/>
      </linearGradient>
      <radialGradient id="r" cx="0.2" cy="0.2" r="0.9">
        <stop offset="0" stop-color="white" stop-opacity="0.45"/>
        <stop offset="1" stop-color="white" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="600" height="600" fill="url(#g)"/>
    <rect width="600" height="600" fill="url(#r)"/>
    <text x="36" y="92" font-family="Inter Tight, system-ui, sans-serif" font-size="20" font-weight="500" fill="white" opacity="0.65" letter-spacing="6">SEED · ${seed.slice(0, 6).toUpperCase()}</text>
    <text x="34" y="540" font-family="Inter Tight, system-ui, sans-serif" font-size="120" font-weight="800" fill="white" opacity="0.95">${escapeXml(display)}</text>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

/**
 * 主播 / 用户头像专用：圆形渐变 + 首字母。
 * 96×96 viewBox，size 由外层 css 控制。
 */
export function avatarImage(seed: string, initial?: string): string {
  const [from, to] = gradientFromSeed(seed)
  const letter = (initial ?? seed.slice(0, 1) ?? 'A').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="ag" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${from}"/>
        <stop offset="1" stop-color="${to}"/>
      </linearGradient>
    </defs>
    <circle cx="48" cy="48" r="48" fill="url(#ag)"/>
    <text x="48" y="60" text-anchor="middle" font-family="Inter Tight, system-ui, sans-serif" font-size="40" font-weight="700" fill="white">${escapeXml(letter)}</text>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
