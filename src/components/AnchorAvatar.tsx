/* ============================================================
   <AnchorAvatar>
   ----------------------------------------------------------------
   主播头像：seed → gradient circle + 首字母
   spec 来源: PAGES_SPEC.md §共享组件 5
   ============================================================ */
import type { CSSProperties } from 'react'
import { gradientFromSeed } from '@/lib/placeholder'

export interface AnchorAvatarProps {
  /** seed 字符串：通常用 anchor.avatar_seed 或 anchor_id */
  seed: string
  /** 显示文字（默认取 seed 首字符，提供 nickname 时取首字符更佳） */
  initial?: string
  /** 像素 size，常用 40 / 64 / 96 */
  size?: 32 | 40 | 56 | 64 | 80 | 96 | 120
  /** 是否在头像右下角显示状态点 */
  status?: 'live' | 'idle' | 'off'
  /** 外层 className */
  className?: string
  /** 外层 style */
  style?: CSSProperties
}

const STATUS_COLOR: Record<NonNullable<AnchorAvatarProps['status']>, string> = {
  live: '#84cc16',
  idle: '#fbbf24',
  off: '#71717a',
}

export default function AnchorAvatar({
  seed,
  initial,
  size = 40,
  status,
  className,
  style,
}: AnchorAvatarProps) {
  const [from, to] = gradientFromSeed(seed)
  const letter = (initial ?? seed.slice(0, 1) ?? 'A')
    .toUpperCase()
    .replace(/[^A-Z0-9一-龥]/g, 'A')[0] ?? 'A'

  const statusSize = Math.max(8, Math.round(size * 0.18))

  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${from}, ${to})`,
        border: '1px solid var(--hairline-soft)',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: Math.max(11, Math.round(size * 0.38)),
        letterSpacing: '-0.02em',
        userSelect: 'none',
        boxShadow:
          size >= 64
            ? '0 4px 24px -8px rgba(168,85,247,0.45)'
            : 'none',
        ...style,
      }}
    >
      {letter}
      {status && (
        <span
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: statusSize,
            height: statusSize,
            borderRadius: '50%',
            background: STATUS_COLOR[status],
            border: '2px solid var(--ink-900)',
          }}
        />
      )}
    </span>
  )
}
