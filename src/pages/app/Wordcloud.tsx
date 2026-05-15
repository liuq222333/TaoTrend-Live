/* ============================================================
   P10 / /app/wordcloud — PRODUCT TOKEN CLOUD
   PAGES_SPEC.md §P10
   echarts-wordcloud (note: must import for side-effect register)
   ============================================================ */
import { useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import type { EChartsOption } from 'echarts'
// register wordcloud chart type (side-effect)
import 'echarts-wordcloud'
import PageHero from '@/components/PageHero'
import ChartCard from '@/components/ChartCard'
import { baseDarkOption, palette } from '@/lib/chart'
import { intelApi } from '@/api/services'
import type { WordCloudItem } from '@/api/types'

export default function WordcloudPage() {
  const [data, setData] = useState<WordCloudItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    intelApi
      .wordcloud()
      .then((r) => alive && setData(r.data ?? []))
      .catch((err) => {
        console.error(err)
        message.error('词云数据加载失败')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const option: EChartsOption = useMemo(() => {
    return {
      ...baseDarkOption,
      tooltip: {
        ...baseDarkOption.tooltip,
        formatter: (params) => {
          const p = params as { name: string; value: number }
          return `<div style="font-family:'Inter Tight',sans-serif;">
            <div style="font-size:10px;color:#a1a1aa;letter-spacing:1.2px;margin-bottom:4px;">TOKEN</div>
            <div style="color:#fff;font-weight:600;font-size:14px;">${p.name}</div>
            <div style="color:#c084fc;font-family:'JetBrains Mono',monospace;margin-top:4px;font-size:11px;">
              FREQ · ${p.value}
            </div>
          </div>`
        },
      },
      series: [
        {
          type: 'wordCloud',
          shape: 'circle',
          left: 'center',
          top: 'center',
          width: '90%',
          height: '90%',
          sizeRange: [14, 72],
          rotationRange: [-90, 90],
          rotationStep: 45,
          gridSize: 10,
          drawOutOfBound: false,
          shrinkToFit: true,
          textStyle: {
            fontFamily: 'Inter Tight, "PingFang SC", "Microsoft YaHei"',
            fontWeight: 700,
            color: () => palette[Math.floor(Math.random() * palette.length)],
          },
          emphasis: {
            focus: 'self',
            textStyle: {
              shadowBlur: 12,
              shadowColor: 'rgba(168,85,247,0.8)',
            },
          },
          data: data.map((d) => ({ name: d.name, value: d.value })),
        },
      ],
    } as EChartsOption
  }, [data])

  const top10 = data.slice(0, 10)

  return (
    <div>
      <PageHero
        eyebrow="06·INTEL · I-02"
        title="TOKEN CLOUD"
        description="对全部商品名称做中文分词后，统计高频词汇——揭示当下电商市场最热的关键词与品类语义。"
      />

      <ChartCard
        eyebrow="CHART · WC-01"
        title="PRODUCT TITLE FREQUENCY"
        option={option}
        height={520}
        loading={loading}
        footer={
          top10.length > 0 ? (
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span
                className="u-eyebrow"
                style={{ color: 'var(--text-3)', fontSize: 10 }}
              >
                TOP 10 ·
              </span>
              {top10.map((w, i) => (
                <span
                  key={w.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'var(--ink-800)',
                    border: '1px solid var(--hairline-soft)',
                    fontFamily: 'var(--font-display)',
                    fontSize: 11,
                    color: 'var(--text-2)',
                  }}
                >
                  <span style={{ color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
                    #{i + 1}
                  </span>
                  <span>{w.name}</span>
                  <span style={{ color: 'var(--accent-pulse)', fontFamily: 'var(--font-mono)' }}>
                    {w.value}
                  </span>
                </span>
              ))}
            </div>
          ) : null
        }
      />
    </div>
  )
}
