import { useEffect, useMemo, useState } from 'react'
import { Empty, Table, Tag, message } from 'antd'
import type { TableProps } from 'antd'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHero from '@/components/PageHero'
import KpiTile from '@/components/KpiTile'
import ChartCard from '@/components/ChartCard'
import PlatformBadge from '@/components/PlatformBadge'
import { baseDarkOption, darkAxis } from '@/lib/chart'
import { monitorApi } from '@/api/services'
import type {
  MonitorAlert,
  MonitorLiveSpike,
  MonitorRiskAnchor,
  MonitorSummary,
} from '@/api/types'
import type { EChartsOption } from 'echarts'

export default function MonitorPage() {
  const [summary, setSummary] = useState<MonitorSummary | null>(null)
  const [alerts, setAlerts] = useState<MonitorAlert[]>([])
  const [spikes, setSpikes] = useState<MonitorLiveSpike[]>([])
  const [risks, setRisks] = useState<MonitorRiskAnchor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      monitorApi.summary(),
      monitorApi.alerts(),
      monitorApi.liveSpikes(),
      monitorApi.riskAnchors(),
    ])
      .then(([s, a, l, r]) => {
        if (!alive) return
        setSummary(s.data)
        setAlerts(a.data ?? [])
        setSpikes(l.data ?? [])
        setRisks(r.data ?? [])
      })
      .catch((err) => {
        console.error(err)
        message.error('监控数据加载失败')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const riskOption: EChartsOption = useMemo(() => ({
    ...baseDarkOption,
    grid: { left: 96, right: 24, top: 18, bottom: 24 },
    tooltip: { ...baseDarkOption.tooltip, trigger: 'axis' },
    xAxis: { type: 'value', max: 100, ...darkAxis() },
    yAxis: {
      type: 'category',
      data: risks.slice(0, 8).map((r) => r.nickname),
      ...darkAxis(),
    },
    series: [
      {
        type: 'bar',
        data: risks.slice(0, 8).map((r) => r.risk_score),
        barWidth: 14,
        itemStyle: { color: '#f43f5e', borderRadius: [0, 6, 6, 0] },
      },
    ],
  }), [risks])

  const spikeColumns: TableProps<MonitorLiveSpike>['columns'] = [
    {
      title: '直播间',
      dataIndex: 'title',
      render: (title, row) => (
        <Link to={`/app/livestreams/${row.id}`} style={{ color: 'var(--text-1)' }}>
          {title}
        </Link>
      ),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      width: 120,
      render: (p) => <PlatformBadge platform={p} />,
    },
    {
      title: '主播',
      dataIndex: 'anchor_name',
      width: 140,
    },
    {
      title: 'GMV',
      dataIndex: 'gmv',
      align: 'right',
      width: 130,
      render: (v) => `¥${(Number(v) / 1e4).toFixed(1)} 万`,
    },
    {
      title: '异常倍数',
      dataIndex: 'spike_ratio',
      align: 'right',
      width: 110,
      render: (v) => <span style={{ color: 'var(--accent-flame)' }}>{Number(v).toFixed(1)}x</span>,
    },
  ]

  const riskColumns: TableProps<MonitorRiskAnchor>['columns'] = [
    {
      title: '主播',
      dataIndex: 'nickname',
      render: (name, row) => (
        <Link to={`/app/anchors/${row.id}`} style={{ color: 'var(--text-1)' }}>
          {name}
        </Link>
      ),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      width: 120,
      render: (p) => <PlatformBadge platform={p} />,
    },
    {
      title: '退货率',
      dataIndex: 'return_rate',
      align: 'right',
      width: 110,
      render: (v) => `${(Number(v) * 100).toFixed(2)}%`,
    },
    {
      title: '风险分',
      dataIndex: 'risk_score',
      align: 'right',
      width: 110,
      render: (v) => <span style={{ color: 'var(--accent-flame)' }}>{Number(v).toFixed(1)}</span>,
    },
    {
      title: '原因',
      dataIndex: 'risk_reasons',
      render: (reasons: string[]) => reasons?.[0] ?? '—',
    },
  ]

  return (
    <div>
      <PageHero
        eyebrow="01·OVERVIEW · MONITOR"
        title="SIGNAL MONITOR"
        description="自动识别直播机会与风险：GMV 突增、高转化、低效流量、高退货主播和异常增长品类。"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KpiTile eyebrow="M-01 · ALERTS" value={summary?.alert_count ?? 0} unit="条" accent="pulse" index={1} hint="当前预警" />
        <KpiTile eyebrow="M-02 · HIGH RISK" value={summary?.high_risk_count ?? 0} unit="条" accent="flame" index={2} hint="高风险信号" />
        <KpiTile eyebrow="M-03 · OPPORTUNITY" value={summary?.opportunity_count ?? 0} unit="场" accent="lime" index={3} hint="机会直播间" />
        <KpiTile eyebrow="M-04 · CATEGORY" value={summary?.category_signal_count ?? 0} unit="类" accent="cyan" index={4} hint="异常品类" />
      </div>

      <section
        style={{
          background: 'var(--ink-850)',
          border: '1px solid var(--hairline-soft)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div className="u-eyebrow" style={{ color: 'var(--text-3)', fontSize: 10, marginBottom: 16 }}>
          ALERT STREAM
        </div>
        {alerts.length === 0 && !loading ? (
          <Empty description="当前无异常信号" />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {alerts.slice(0, 12).map((alert) => (
              <Link
                key={alert.id}
                to={targetPath(alert)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px minmax(0, 1fr) 130px',
                  gap: 16,
                  alignItems: 'center',
                  padding: '13px 14px',
                  border: '1px solid var(--hairline-soft)',
                  borderRadius: 8,
                  background: 'var(--ink-800)',
                  color: 'inherit',
                }}
              >
                <Tag color={alert.level === 'high' ? 'red' : alert.level === 'medium' ? 'gold' : 'blue'}>
                  {alert.level.toUpperCase()}
                </Tag>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text-1)', fontWeight: 600 }}>{alert.title}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 3 }}>{alert.message}</div>
                </div>
                <span style={{ color: 'var(--text-4)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {alert.created_at ? dayjs(alert.created_at).format('MM-DD HH:mm') : 'NOW'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
          gap: 24,
          marginBottom: 24,
        }}
      >
        <Table<MonitorLiveSpike>
          rowKey="id"
          loading={loading}
          dataSource={spikes}
          columns={spikeColumns}
          pagination={false}
          title={() => <span className="u-eyebrow">OPPORTUNITY · LIVE SPIKES</span>}
        />
        <ChartCard
          eyebrow="RISK · TOP ANCHORS"
          title="RISK SCORE"
          option={riskOption}
          height={360}
          loading={loading}
        />
      </div>

      <Table<MonitorRiskAnchor>
        rowKey="id"
        loading={loading}
        dataSource={risks}
        columns={riskColumns}
        pagination={{ pageSize: 8 }}
        title={() => <span className="u-eyebrow">RISK · ANCHORS</span>}
      />
    </div>
  )
}

function targetPath(alert: MonitorAlert) {
  if (alert.target_type === 'livestream') return `/app/livestreams/${alert.target_id}`
  if (alert.target_type === 'anchor') return `/app/anchors/${alert.target_id}`
  return '/app/categories/growth'
}
