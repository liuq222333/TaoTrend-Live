/* ============================================================
   <PlatformBadge>
   ----------------------------------------------------------------
   平台标签 pill — 用 hairline + accent 颜色描边
   spec 来源: PAGES_SPEC.md §共享组件 6
   ============================================================ */
import type { Platform } from '@/api/types'

interface PlatformConfig {
  label: string
  color: string
  bg: string
  border: string
}

const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  taobao: {
    label: '淘宝',
    color: '#fda4af',
    bg: 'rgba(244,63,94,0.10)',
    border: 'rgba(244,63,94,0.4)',
  },
  douyin: {
    label: '抖音',
    color: '#c084fc',
    bg: 'rgba(168,85,247,0.10)',
    border: 'rgba(168,85,247,0.4)',
  },
  pdd: {
    label: '拼多多',
    color: '#fde68a',
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.4)',
  },
}

const PLATFORM_EN: Record<Platform, string> = {
  taobao: 'TAOBAO',
  douyin: 'DOUYIN',
  pdd: 'PDD',
}

export interface PlatformBadgeProps {
  platform: Platform | string
  /** 显示中文（默认）还是 EN code */
  variant?: 'cn' | 'en'
  /** 紧凑模式：仅文字，无背景，仅 dot + color */
  dotOnly?: boolean
}

export default function PlatformBadge({
  platform,
  variant = 'en',
  dotOnly = false,
}: PlatformBadgeProps) {
  const p = (platform as Platform) in PLATFORM_CONFIG
    ? (platform as Platform)
    : 'taobao'
  const cfg = PLATFORM_CONFIG[p]
  const label = variant === 'cn' ? cfg.label : PLATFORM_EN[p]

  if (dotOnly) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: cfg.color,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: cfg.color,
            boxShadow: `0 0 8px ${cfg.color}`,
          }}
        />
        {label}
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 10px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 9999,
        fontFamily: 'var(--font-display)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 1.4,
        lineHeight: 1.6,
        textTransform: 'uppercase',
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: cfg.color,
        }}
      />
      {label}
    </span>
  )
}
