import { useEffect, useMemo, useState } from 'react'
import { Empty, Table, message } from 'antd'
import type { TableProps } from 'antd'
import type { EChartsOption } from 'echarts'
import PageHero from '@/components/PageHero'
import KpiTile from '@/components/KpiTile'
import ChartCard from '@/components/ChartCard'
import { baseDarkOption, darkAxis, palette } from '@/lib/chart'
import { categoryApi } from '@/api/services'
import type { CategoryOpportunity } from '@/api/types'

export default function CategoryOpportunityPage() {
  const [items, setItems] = useState<CategoryOpportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    categoryApi
      .opportunity()
      .then((r) => alive && setItems(r.data ?? []))
      .catch((err) => {
        console.error(err)
        message.error('品类机会数据加载失败')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const top = items[0]
  const highCount = items.filter((i) => i.opportunity_score >= 70).length
  const lowCompetition = items.filter((i) => i.competition_index <= 0.55).length
  const avgGrowth = items.length
    ? items.reduce((sum, i) => sum + i.growth_rate, 0) / items.length
    : 0

  const barOption: EChartsOption = useMemo(() => ({
    ...baseDarkOption,
    grid: { left: 90, right: 24, top: 18, bottom: 24 },
    tooltip: { ...baseDarkOption.tooltip, trigger: 'axis' },
    xAxis: { type: 'value', max: 100, ...darkAxis() },
    yAxis: {
      type: 'category',
      data: items.slice(0, 8).map((i) => i.category_name),
      ...darkAxis(),
    },
    series: [
      {
        type: 'bar',
        data: items.slice(0, 8).map((i) => i.opportunity_score),
        barWidth: 14,
        itemStyle: { color: '#a855f7', borderRadius: [0, 6, 6, 0] },
      },
    ],
  }), [items])

  const scatterOption: EChartsOption = useMemo(() => ({
    ...baseDarkOption,
    color: palette,
    grid: { left: 56, right: 24, top: 24, bottom: 36 },
    tooltip: {
      ...baseDarkOption.tooltip,
      formatter: (p: any) => {
        const item = items[p.dataIndex]
        return `${item.category_name}<br/>增长率 ${(item.growth_rate * 100).toFixed(1)}%<br/>竞争 ${(item.competition_index * 100).toFixed(1)}%`
      },
    },
    xAxis: {
      type: 'value',
      name: '竞争指数',
      ...darkAxis(),
      axisLabel: { ...darkAxis().axisLabel, formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
    },
    yAxis: {
      type: 'value',
      name: '增长率',
      ...darkAxis(),
      axisLabel: { ...darkAxis().axisLabel, formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (v: number[]) => Math.max(10, Math.min(32, v[2] / 3)),
        data: items.map((i) => [i.competition_index, i.growth_rate, i.opportunity_score]),
      },
    ],
  }), [items])

  const columns: TableProps<CategoryOpportunity>['columns'] = [
    {
      title: '品类',
      dataIndex: 'category_name',
      render: (v, row) => `${row.icon_glyph ?? '✦'} ${v}`,
    },
    {
      title: 'GMV',
      dataIndex: 'gmv',
      align: 'right',
      sorter: (a, b) => a.gmv - b.gmv,
      render: (v) => `¥${(Number(v) / 1e4).toFixed(1)} 万`,
    },
    {
      title: '增长率',
      dataIndex: 'growth_rate',
      align: 'right',
      sorter: (a, b) => a.growth_rate - b.growth_rate,
      render: (v) => <span style={{ color: Number(v) >= 0 ? 'var(--accent-lime)' : 'var(--accent-flame)' }}>{(Number(v) * 100).toFixed(1)}%</span>,
    },
    {
      title: '竞争指数',
      dataIndex: 'competition_index',
      align: 'right',
      sorter: (a, b) => a.competition_index - b.competition_index,
      render: (v) => `${(Number(v) * 100).toFixed(1)}%`,
    },
    {
      title: '机会分',
      dataIndex: 'opportunity_score',
      align: 'right',
      sorter: (a, b) => a.opportunity_score - b.opportunity_score,
      defaultSortOrder: 'descend',
      render: (v) => <span style={{ color: 'var(--accent-pulse)' }}>{Number(v).toFixed(1)}</span>,
    },
    {
      title: '原因',
      dataIndex: 'reason',
    },
  ]

  return (
    <div>
      <PageHero
        eyebrow="02·CATEGORY · OPPORTUNITY"
        title="CATEGORY OPPORTUNITY"
        description="综合增长、GMV、客单价、转化和竞争指数，识别更值得投入的机会品类。"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KpiTile eyebrow="O-01 · HIGH SCORE" value={highCount} unit="类" accent="pulse" index={1} hint="机会分 >= 70" />
        <KpiTile eyebrow="O-02 · AVG GROWTH" value={avgGrowth * 100} decimals={1} unit="%" accent="lime" index={2} hint="平均增长率" />
        <KpiTile eyebrow="O-03 · BEST" value={top?.opportunity_score ?? 0} decimals={1} accent="cyan" index={3} hint={top?.category_name ?? '暂无'} />
        <KpiTile eyebrow="O-04 · LOW COMP." value={lowCompetition} unit="类" accent="flame" index={4} hint="低竞争品类" />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 24,
          marginBottom: 24,
        }}
      >
        <ChartCard eyebrow="OPPORTUNITY · RANK" title="TOP CATEGORY SCORE" option={barOption} height={340} loading={loading} />
        <ChartCard eyebrow="GROWTH × COMPETITION" title="OPPORTUNITY MAP" option={scatterOption} height={340} loading={loading} />
      </div>

      <Table<CategoryOpportunity>
        rowKey="category_id"
        loading={loading}
        dataSource={items}
        columns={columns}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无品类机会数据" /> }}
      />
    </div>
  )
}
