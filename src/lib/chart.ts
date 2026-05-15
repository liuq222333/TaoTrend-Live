/* ============================================================
   TaoTrend Live — ECharts dark theme
   Cyberpunk palette: pulse purple + flame pink + cyan + lime
   ============================================================ */

export const palette = [
  '#a855f7', // pulse-500 (primary)
  '#f43f5e', // flame-500
  '#0ea5e9', // sky cyan
  '#84cc16', // lime
  '#fbbf24', // amber
  '#ec4899', // hot pink
  '#22d3ee', // electric cyan
  '#ffffff',
]

export const platformColors: Record<string, string> = {
  taobao: '#f43f5e',
  douyin: '#a855f7',
  pdd: '#fbbf24',
}

export const baseDarkOption = {
  backgroundColor: 'transparent',
  color: palette,
  textStyle: {
    fontFamily: "'Inter Tight', system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    color: '#e5e7eb',
  },
  legend: {
    textStyle: { color: '#a1a1aa', fontSize: 11, letterSpacing: 0.6 },
    inactiveColor: '#3f3f46',
    itemWidth: 10,
    itemHeight: 10,
    icon: 'rect',
  },
  tooltip: {
    backgroundColor: 'rgba(10,10,13,0.95)',
    borderColor: 'rgba(168,85,247,0.45)',
    borderWidth: 1,
    textStyle: { color: '#fff', fontSize: 12 },
    padding: [8, 12],
    extraCssText: 'backdrop-filter: blur(8px); border-radius: 6px;',
  },
}

export function darkAxis() {
  return {
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
    axisTick: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
    axisLabel: {
      color: '#a1a1aa',
      fontSize: 11,
      letterSpacing: 0.4,
      fontFamily:
        "'Inter Tight', system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    nameTextStyle: { color: '#71717a', fontSize: 10, padding: [0, 0, 0, 0] },
  }
}

interface LinearGradient {
  type: 'linear'
  x: number
  y: number
  x2: number
  y2: number
  colorStops: Array<{ offset: number; color: string }>
}

/** Pulse-purple → flame-pink linear gradient for area/line fills. */
export const pulseFlameGradient: LinearGradient = {
  type: 'linear',
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: 'rgba(168,85,247,0.55)' },
    { offset: 1, color: 'rgba(244,63,94,0.05)' },
  ],
}

/** Cyan → purple gradient. */
export const cyanPurpleGradient: LinearGradient = {
  type: 'linear',
  x: 0,
  y: 0,
  x2: 1,
  y2: 0,
  colorStops: [
    { offset: 0, color: '#0ea5e9' },
    { offset: 1, color: '#a855f7' },
  ],
}
