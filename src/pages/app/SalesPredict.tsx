/* ============================================================
   P09 / /app/predict — SALES PREDICT
   PAGES_SPEC.md §P09
   ============================================================ */
import { useEffect, useMemo, useState } from 'react'
import { Button, Form, InputNumber, Select, Slider, message } from 'antd'
import type { EChartsOption } from 'echarts'
import PageHero from '@/components/PageHero'
import KpiTile from '@/components/KpiTile'
import ChartCard from '@/components/ChartCard'
import { baseDarkOption, darkAxis } from '@/lib/chart'
import { categoryApi, intelApi } from '@/api/services'
import type {
  Category,
  PieDatum,
  SalesPredictResponse,
} from '@/api/types'

interface FormValues {
  category?: number
  price?: number
  anchor_tier?: 'top' | 'mid' | 'long_tail' | ''
  duration?: number
}

const TIERS = [
  { label: '头部主播 · TOP', value: 'top' },
  { label: '中部主播 · MID', value: 'mid' },
  { label: '腰尾部 · LONG TAIL', value: 'long_tail' },
]

export default function SalesPredictPage() {
  const [form] = Form.useForm<FormValues>()
  const [tree, setTree] = useState<Category[]>([])
  const [result, setResult] = useState<SalesPredictResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let alive = true
    categoryApi
      .list()
      .then((r) => alive && setTree(r.data ?? []))
      .catch(console.error)
    return () => {
      alive = false
    }
  }, [])

  const flatCats = useMemo(() => flattenTree(tree), [tree])

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const r = await intelApi.salesPredict({
        category: values.category ?? '',
        price: values.price ?? '',
        anchor_tier: values.anchor_tier ?? '',
        duration: values.duration ?? '',
      })
      setResult(r)
      if (r.code !== 0 && r.msg) message.warning(r.msg)
    } catch (err) {
      console.error(err)
      message.error('预测计算失败')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- 分布 bar ---------- */
  const distOption: EChartsOption = useMemo(() => {
    const dist: PieDatum[] = result?.dist ?? []
    return {
      ...baseDarkOption,
      grid: { left: 56, right: 24, top: 24, bottom: 32 },
      tooltip: {
        ...baseDarkOption.tooltip,
        trigger: 'axis',
        valueFormatter: (v) => `${v} 场`,
      },
      xAxis: {
        type: 'category',
        data: dist.map((d) => d.name),
        ...darkAxis(),
        axisLabel: { ...darkAxis().axisLabel, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        ...darkAxis(),
      },
      series: [
        {
          name: '直播场次',
          type: 'bar',
          barWidth: 24,
          data: dist.map((d) => d.value),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#a855f7' },
                { offset: 1, color: 'rgba(168,85,247,0.15)' },
              ],
            },
            borderRadius: [6, 6, 0, 0],
          },
        },
      ],
    }
  }, [result])

  /* ---------- 百分位 gauge ---------- */
  const gaugeOption: EChartsOption = useMemo(() => {
    const pct = (result?.percentile ?? 0) * 100
    return {
      ...baseDarkOption,
      series: [
        {
          type: 'gauge',
          radius: '88%',
          progress: { show: true, width: 14, roundCap: true },
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [0.4, '#3b1465'],
                [0.7, '#7e22ce'],
                [1, '#a855f7'],
              ],
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: '#71717a',
            fontSize: 10,
            distance: -22,
          },
          pointer: {
            length: '70%',
            width: 4,
            itemStyle: { color: '#a855f7' },
          },
          anchor: { show: true, size: 12, itemStyle: { color: '#a855f7' } },
          detail: {
            valueAnimation: true,
            formatter: (v: number) => `${v.toFixed(1)}%`,
            color: '#fff',
            fontFamily: 'Inter Tight',
            fontSize: 28,
            fontWeight: 700,
            offsetCenter: [0, '52%'],
          },
          title: {
            offsetCenter: [0, '76%'],
            color: '#a1a1aa',
            fontSize: 11,
            fontFamily: 'Inter Tight',
          },
          data: [{ value: pct, name: 'PERCENTILE' }],
        },
      ],
    }
  }, [result])

  return (
    <div>
      <PageHero
        eyebrow="06·INTEL · I-01"
        title="SALES PREDICT"
        description="根据品类、价格段、主播等级与直播时长，从历史样本中匹配相似直播间，输出 GMV 的 6 维统计与分布。"
      />

      {/* Param form */}
      <section
        style={{
          background: 'var(--ink-850)',
          border: '1px solid var(--hairline-soft)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div
          className="u-eyebrow"
          style={{ color: 'var(--text-3)', fontSize: 10, marginBottom: 16 }}
        >
          PARAMETERS · INPUT
        </div>
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            category: undefined,
            price: 99,
            anchor_tier: 'mid',
            duration: 120,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <Form.Item label="CATEGORY · 品类" name="category">
              <Select
                allowClear
                placeholder="全部品类"
                options={flatCats.map((c) => ({
                  label: `${c.icon_glyph ?? '✦'} ${c.name}`,
                  value: c.id,
                }))}
              />
            </Form.Item>
            <Form.Item label="UNIT PRICE · 价格 (元)" name="price">
              <InputNumber min={1} max={9999} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="ANCHOR TIER · 主播等级" name="anchor_tier">
              <Select options={TIERS} placeholder="选择主播等级" />
            </Form.Item>
            <Form.Item
              label={
                <span>
                  DURATION · 直播时长{' '}
                  <span style={{ color: 'var(--text-3)' }}>
                    ({form.getFieldValue('duration') ?? 120} min)
                  </span>
                </span>
              }
              name="duration"
            >
              <Slider min={15} max={360} step={15} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button
              onClick={() => {
                form.resetFields()
                setResult(null)
              }}
            >
              RESET
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              PREDICT →
            </Button>
          </div>
        </Form>
      </section>

      {result && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <KpiTile
              eyebrow="P-01 · AVG GMV"
              value={(result.avg ?? 0) / 1e4}
              decimals={2}
              prefix="¥"
              unit="万"
              accent="pulse"
              index={1}
              hint="样本均值"
            />
            <KpiTile
              eyebrow="P-02 · MEDIAN"
              value={(result.median ?? 0) / 1e4}
              decimals={2}
              prefix="¥"
              unit="万"
              accent="cyan"
              index={2}
              hint="中位数"
            />
            <KpiTile
              eyebrow="P-03 · MAX"
              value={(result.max ?? 0) / 1e4}
              decimals={2}
              prefix="¥"
              unit="万"
              accent="lime"
              index={3}
              hint="历史最高"
            />
            <KpiTile
              eyebrow="P-04 · MIN"
              value={(result.min ?? 0) / 1e4}
              decimals={2}
              prefix="¥"
              unit="万"
              accent="flame"
              index={4}
              hint="历史最低"
            />
            <KpiTile
              eyebrow="P-05 · SAMPLES"
              value={result.count ?? 0}
              unit="场"
              accent="pulse"
              index={5}
              hint="匹配样本数"
            />
            <KpiTile
              eyebrow="P-06 · PERCENTILE"
              value={(result.percentile ?? 0) * 100}
              decimals={1}
              unit="%"
              accent="pulse"
              index={6}
              hint="您输入价格在样本中的位次"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
              gap: 24,
            }}
          >
            <ChartCard
              eyebrow="CHART · SP-01"
              title="GMV DISTRIBUTION"
              option={distOption}
              height={300}
            />
            <ChartCard
              eyebrow="CHART · SP-02"
              title="PERCENTILE GAUGE"
              option={gaugeOption}
              height={300}
            />
          </div>
        </>
      )}

      {!result && (
        <div
          style={{
            padding: '48px 32px',
            textAlign: 'center',
            background: 'var(--ink-850)',
            border: '1px dashed var(--hairline-strong)',
            borderRadius: 12,
            color: 'var(--text-3)',
            fontFamily: 'var(--font-display)',
            letterSpacing: 0.8,
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 8 }}>
            填入参数并点击 <span style={{ color: 'var(--accent-pulse)' }}>PREDICT</span> 开始预测
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', letterSpacing: 1.2 }}>
            STATUS · IDLE
          </div>
        </div>
      )}
    </div>
  )
}

function flattenTree(cats: Category[]): Category[] {
  const out: Category[] = []
  for (const c of cats) {
    out.push(c)
    if (c.children?.length) out.push(...flattenTree(c.children))
  }
  return out
}
