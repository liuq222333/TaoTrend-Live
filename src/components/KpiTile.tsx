/* ============================================================
   <KpiTile>
   ----------------------------------------------------------------
   总览页 / 详情页 用的指标块。
   eyebrow + CountUp number + unit + sub hint + corner ticks
   spec 来源: PAGES_SPEC.md §共享组件 2
   ============================================================ */
import type { CSSProperties, ReactNode } from 'react'
import CountUp from './CountUp'

export type Accent = 'pulse' | 'flame' | 'cyan' | 'lime' | 'amber' | 'mono'

const ACCENT_MAP: Record<Accent, string> = {
  pulse: '#a855f7',
  flame: '#f43f5e',
  cyan: '#0ea5e9',
  lime: '#84cc16',
  amber: '#fbbf24',
  mono: '#f8f8fa',
}

const ACCENT_GLOW: Record<Accent, string> = {
  pulse: 'rgba(168,85,247,0.45)',
  flame: 'rgba(244,63,94,0.45)',
  cyan: 'rgba(14,165,233,0.45)',
  lime: 'rgba(132,204,22,0.45)',
  amber: 'rgba(251,191,36,0.45)',
  mono: 'rgba(248,248,250,0.3)',
}

export interface KpiTileProps {
  /** UPPERCASE 编号 + 名称，如 "K-01 · TOTAL GMV" */
  eyebrow: string
  /** 数字主体 — 会喂给 CountUp */
  value: number
  /** 单位，如 "亿" / "%" / "场" */
  unit?: string
  /** 数字前缀，如 "¥" */
  prefix?: string
  /** 二级 hint，如 "近 90 天" */
  hint?: ReactNode
  /** 序号 — 显示在右上角 */
  index?: number | string
  /** 主 accent 颜色，默认 pulse */
  accent?: Accent
  /** 数字精度（小数位） */
  decimals?: number
  /** 数字分隔符（默认 ","） */
  separator?: string
  /** CountUp 持续时间 */
  duration?: number
  /** 自定义样式 */
  style?: CSSProperties
}

export default function KpiTile({
  eyebrow,
  value,
  unit,
  prefix,
  hint,
  index,
  accent = 'pulse',
  decimals = 0,
  separator = ',',
  duration = 1.6,
  style,
}: KpiTileProps) {
  const color = ACCENT_MAP[accent]
  const glow = ACCENT_GLOW[accent]

  // CountUp 接受 number 但不支持小数位；用 decimals 做 scaling
  const scaled = decimals > 0 ? Number(value.toFixed(decimals)) : Math.round(value)

  return (
    <div
      className="u-corner-ticks"
      style={{
        position: 'relative',
        background: 'var(--ink-850)',
        border: '1px solid var(--hairline-soft)',
        borderRadius: 12,
        padding: '24px 24px 22px',
        minHeight: 152,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div
          className="u-eyebrow"
          style={{
            color: 'var(--text-3)',
            fontSize: 11,
            letterSpacing: 1.6,
            lineHeight: 1.2,
          }}
        >
          {eyebrow}
        </div>
        {index !== undefined && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-4)',
              letterSpacing: 1,
            }}
          >
            #{String(index).padStart(2, '0')}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          marginTop: 12,
        }}
      >
        {prefix && (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--text-2)',
            }}
          >
            {prefix}
          </span>
        )}
        <CountUp
          to={scaled}
          duration={duration}
          separator={separator}
          className="u-kpi-numeric"
        />
        {unit && (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 500,
              color: 'var(--text-3)',
              marginLeft: 4,
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {hint && (
        <div
          style={{
            marginTop: 12,
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: 'var(--text-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {hint}
        </div>
      )}

      {/* accent underline */}
      <div
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 0,
          height: 2,
          background: `linear-gradient(90deg, ${color} 0%, transparent 60%)`,
          opacity: 0.55,
        }}
      />
      {/* invisible glow color marker (uses var for css consumers) */}
      <style>{`:root { --kpi-tile-glow-${accent}: ${glow}; }`}</style>
      <span
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 36,
          height: 36,
          pointerEvents: 'none',
          background: `radial-gradient(circle at top right, ${glow}, transparent 70%)`,
        }}
      />
    </div>
  )
}

/* numeric color binding — kept on the CountUp via inline style on its className wrapper is enough,
   actual number color comes from .u-kpi-numeric (#fff by default).
   Per-accent number coloring needs custom span; expose helper below. */

export function KpiNumber({
  value,
  accent = 'pulse',
  duration = 1.6,
  decimals = 0,
  separator = ',',
  size = 56,
}: {
  value: number
  accent?: Accent
  duration?: number
  decimals?: number
  separator?: string
  size?: number
}) {
  const color = ACCENT_MAP[accent]
  const scaled = decimals > 0 ? Number(value.toFixed(decimals)) : Math.round(value)
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-display)',
        fontFeatureSettings: '"tnum"',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        color,
        fontSize: size,
      }}
    >
      <CountUp to={scaled} duration={duration} separator={separator} />
    </span>
  )
}
