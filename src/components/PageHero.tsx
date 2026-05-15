/* ============================================================
   <PageHero>
   ----------------------------------------------------------------
   每个业务页顶部的"控制台总标题"。
   triad: eyebrow (uppercase tracking) + display title + description
   spec 来源: PAGES_SPEC.md §共享组件 1
   ============================================================ */
import type { CSSProperties, ReactNode } from 'react'

export interface PageHeroProps {
  /** 比如 "01·OVERVIEW · CONTROL" — 大写 tracking 间距 */
  eyebrow: string
  /** 主标题，用 u-display-xxl 渲染（72-96px） */
  title: string
  /** 一句描述，最长 640px，text-2 灰 */
  description?: ReactNode
  /** Hero 右上角附加内容（status pill / sticky stat / pulse dot 等） */
  right?: ReactNode
  /** 标题下方的额外行（filter bar / form 等） */
  extra?: ReactNode
  /** Override default accent of eyebrow */
  accentColor?: string
  /** override style */
  style?: CSSProperties
}

export default function PageHero({
  eyebrow,
  title,
  description,
  right,
  extra,
  accentColor,
  style,
}: PageHeroProps) {
  return (
    <section
      style={{
        padding: '48px 0 56px',
        borderBottom: '1px solid var(--hairline)',
        marginBottom: 32,
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 32,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div
            className="u-eyebrow"
            style={{
              marginBottom: 14,
              color: accentColor ?? 'var(--accent-pulse)',
              fontWeight: 600,
              letterSpacing: 1.8,
            }}
          >
            {eyebrow}
          </div>
          <h1
            className="u-display-xxl"
            style={{
              margin: 0,
              fontSize: 'clamp(48px, 6vw, 88px)',
              letterSpacing: '-0.02em',
              lineHeight: 0.96,
              background:
                'linear-gradient(120deg, #ffffff 0%, #ffffff 60%, #cccccc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="text-body"
              style={{
                marginTop: 20,
                marginBottom: 0,
                maxWidth: 640,
                color: 'var(--text-2)',
              }}
            >
              {description}
            </p>
          )}
        </div>
        {right && (
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'flex-start',
              alignSelf: 'flex-start',
              paddingTop: 4,
            }}
          >
            {right}
          </div>
        )}
      </div>
      {extra && <div style={{ marginTop: 32 }}>{extra}</div>}
    </section>
  )
}

/** 一个用于 Hero 右侧的 LIVE · 3S pulse dot 小组件，复用 */
export function LivePill({ label = 'LIVE · 3S' }: { label?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid var(--hairline-strong)',
        background: 'rgba(168,85,247,0.08)',
        fontFamily: 'var(--font-display)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: 'var(--text-1)',
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          width: 8,
          height: 8,
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'var(--accent-pulse)',
            opacity: 0.7,
            animation: 'tt-ping 1.6s cubic-bezier(0,0,0.2,1) infinite',
          }}
        />
        <span
          style={{
            position: 'relative',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--accent-pulse)',
          }}
        />
      </span>
      <span>{label}</span>
    </span>
  )
}
