import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Aurora from '@/components/Aurora'
import SplitText from '@/components/SplitText'
import CountUp from '@/components/CountUp'
import ScrollVelocity from '@/components/ScrollVelocity'
import GlitchText from '@/components/GlitchText'
import MagicBento from '@/components/MagicBento'
import TiltedCard from '@/components/TiltedCard'
import SplashCursor from '@/components/SplashCursor'

const gradientImage = (from: string, to: string, label: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
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
       <text x="36" y="92" font-family="Inter Tight, system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="22" font-weight="500" fill="white" opacity="0.7" letter-spacing="6">品类</text>
       <text x="34" y="540" font-family="Inter Tight, system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="120" font-weight="800" fill="white" opacity="0.95">${label}</text>
     </svg>`,
  )

const categories = [
  {
    label: '美妆',
    from: '#f43f5e',
    to: '#7e22ce',
    value: '¥12.1 亿',
    sub: '近 24 小时领涨',
    tag: '直播打赏 +37%',
  },
  {
    label: '数码',
    from: '#7e22ce',
    to: '#0ea5e9',
    value: '¥9.8 亿',
    sub: 'iPhone 17 发售浪潮',
    tag: '预售转化 11.4%',
  },
  {
    label: '服饰',
    from: '#0ea5e9',
    to: '#84cc16',
    value: '¥7.6 亿',
    sub: '盛夏精选上新',
    tag: '退货率 -0.6pt',
  },
]

function PulseDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pulse-500 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-pulse-500" />
    </span>
  )
}

function NavBar() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const hhmmss = time.toLocaleTimeString('zh-CN', { hour12: false })

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-ink-900/60 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-pulse-500 to-flame-500" />
          <span className="font-semibold tracking-tight text-ink-50">淘潮 TaoTrend</span>
          <span className="text-ink-400">/ 实时</span>
        </div>
        <nav className="hidden md:flex items-center gap-7 text-ink-200">
          <a className="hover:text-ink-50 transition">信号</a>
          <a className="hover:text-ink-50 transition">品类</a>
          <a className="hover:text-ink-50 transition">数据管道</a>
          <a className="hover:text-ink-50 transition">文档</a>
        </nav>
        <div className="flex items-center gap-3 font-mono text-ink-200">
          <PulseDot />
          <span className="hidden sm:inline">{hhmmss} 北京时间</span>
          <Link
            to="/login"
            className="ml-3 px-4 py-1.5 rounded-full border border-white/20 text-ink-50 hover:border-pulse-500 hover:text-pulse-300 transition"
          >
            登录
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Aurora background, vertically masked so it fades into the page */}
      <div className="pointer-events-none absolute inset-0 -z-10 mask-aurora">
        <div className="absolute inset-0 bg-hero-spot" />
        <div className="absolute inset-0 opacity-80">
          <Aurora colorStops={['#a855f7', '#f43f5e', '#0ea5e9']} amplitude={1.1} blend={0.55} speed={0.7} />
        </div>
        <div className="absolute inset-0 bg-soft-grid opacity-40" />
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-24 pb-28 md:pt-32 md:pb-40">
        <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-[0.25em] text-ink-200">
          <PulseDot />
          <span>实时 · 淘宝 + 天猫 + 拼多多</span>
          <span className="text-ink-400">v2.6 · Flink 2.0</span>
        </div>

        <div className="mt-8 max-w-5xl">
          <SplitText
            tag="h1"
            text="中文电商的实时脉搏。"
            textAlign="left"
            className="text-[clamp(2.75rem,6.5vw,6.25rem)] font-display font-semibold tracking-[-0.025em] leading-[1.1] text-ink-50"
            delay={60}
            duration={1.1}
            from={{ opacity: 0, y: 60, rotateX: -20 }}
            to={{ opacity: 1, y: 0, rotateX: 0 }}
          />
        </div>

        <div className="mt-6 max-w-2xl">
          <SplitText
            tag="p"
            text="横跨 910 万并发买家的亚秒级信号。基于 Hive、Spark、Flink 与 ClickHouse 构建——为下一个双十一而生。"
            textAlign="left"
            className="text-lg md:text-xl text-ink-200 leading-relaxed"
            delay={16}
            duration={0.9}
            splitType="words"
            from={{ opacity: 0, y: 14 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.05}
          />
        </div>

        {/* Hero KPIs */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
          <KpiTile prefix="¥" to={42.1} from={0} duration={2.4} suffix=" 亿" label="今日 GMV" sub="近 24 小时滚动" />
          <KpiTile to={912} duration={2.2} suffix=" 万" label="并发买家" sub="近 60 秒" />
          <KpiTile to={1.2} duration={1.8} suffix=" 秒" label="管道平均延迟" sub="Flink → ClickHouse" />
        </div>

        <div className="mt-10 flex items-center gap-4">
          <Link
            to="/login"
            className="px-6 py-3 rounded-full bg-ink-50 text-ink-900 font-medium hover:bg-pulse-300 transition-colors"
          >
            进入实时大厅 →
          </Link>
          <Link
            to="/register"
            className="px-6 py-3 rounded-full border border-white/15 text-ink-50 hover:border-white/40 transition-colors"
          >
            申请账号
          </Link>
        </div>
      </div>
    </section>
  )
}

function KpiTile({
  prefix,
  to,
  from,
  duration,
  suffix,
  label,
  sub,
}: {
  prefix?: string
  to: number
  from?: number
  duration?: number
  suffix?: string
  label: string
  sub: string
}) {
  return (
    <div className="bg-ink-900 p-7">
      <div className="text-xs font-mono uppercase tracking-widest text-ink-400">{label}</div>
      <div className="mt-3 flex items-baseline gap-1 text-ink-50">
        {prefix && <span className="text-2xl text-ink-200">{prefix}</span>}
        <CountUp
          to={to}
          from={from ?? 0}
          duration={duration ?? 2}
          separator=","
          className="text-5xl md:text-6xl font-semibold tracking-tight tabular-nums"
        />
        {suffix && <span className="text-2xl text-ink-200">{suffix}</span>}
      </div>
      <div className="mt-3 text-sm text-ink-400">{sub}</div>
    </div>
  )
}

function Marquee() {
  return (
    <section className="relative py-6 border-y border-white/5 bg-ink-900">
      <div className="text-pulse-300/90">
        <ScrollVelocity
          velocity={60}
          numCopies={6}
          texts={[
            '热搜 · 美妆 · 数码 · 服饰 · 家居 · 双十一 · 618 · 直播带货 · 预售 · ',
            '驱动者 · Hive · Spark · Flink · ClickHouse · Kafka · Pulsar · ',
          ]}
          className="px-4 text-3xl md:text-5xl font-display font-semibold tracking-[-0.02em]"
        />
      </div>
    </section>
  )
}

function BentoSection() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-pulse-300">02 · 数据墙</div>
            <SplitText
              tag="h2"
              text="今日信号。"
              textAlign="left"
              className="mt-3 text-4xl md:text-6xl font-display font-semibold tracking-[-0.02em] text-ink-50"
              delay={60}
              from={{ opacity: 0, y: 30 }}
              to={{ opacity: 1, y: 0 }}
            />
          </div>
          <p className="hidden md:block max-w-md text-ink-200">
            六块指标,秒级刷新。鼠标移上去——整片网格会跟着你的光标流动。
          </p>
        </div>

        <div className="flex justify-center">
          <MagicBento
            enableStars
            enableSpotlight
            enableBorderGlow
            enableTilt={false}
            clickEffect
            enableMagnetism
            spotlightRadius={400}
            glowColor="168, 85, 247"
          />
        </div>
      </div>
    </section>
  )
}

function CategoriesSection() {
  return (
    <section className="relative py-24 md:py-32 bg-ink-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 flex items-end justify-between gap-6">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-flame-300">03 · 关注</div>
            <SplitText
              tag="h2"
              text="大盘上的三个品类。"
              textAlign="left"
              className="mt-3 text-4xl md:text-6xl font-display font-semibold tracking-[-0.02em] text-ink-50"
              delay={60}
              from={{ opacity: 0, y: 30 }}
              to={{ opacity: 1, y: 0 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((c) => (
            <div key={c.label} className="flex flex-col gap-4">
              <TiltedCard
                imageSrc={gradientImage(c.from, c.to, c.label)}
                altText={c.label}
                captionText={c.tag}
                containerHeight="380px"
                containerWidth="100%"
                imageHeight="380px"
                imageWidth="100%"
                rotateAmplitude={12}
                scaleOnHover={1.06}
                showMobileWarning={false}
                showTooltip
                displayOverlayContent
                overlayContent={
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <div className="text-white/80 font-mono text-xs uppercase tracking-widest">{c.sub}</div>
                    <div className="text-white text-3xl font-semibold tracking-tight">{c.value}</div>
                  </div>
                }
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-200 font-medium">{c.label}</span>
                <span className="text-ink-400 font-mono">{c.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaSection() {
  return (
    <section className="relative py-32 md:py-48 overflow-hidden">
      <div className="absolute inset-0 bg-soft-grid opacity-30 -z-10" />
      <div className="mx-auto max-w-5xl px-6 text-center">
        <div className="flex justify-center">
          <GlitchText speed={0.6} enableShadows className="!text-[clamp(3.5rem,12vw,9rem)]">
            准备好了吗
          </GlitchText>
        </div>
        <p className="mt-10 text-ink-200 text-lg max-w-2xl mx-auto">
          距离双十一开盘还有 142 天。接入你的数据流,写三行 SQL,看全国实时下单。
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="px-8 py-4 rounded-full bg-ink-50 text-ink-900 font-medium hover:bg-pulse-300 transition-colors"
          >
            申请试用 →
          </Link>
          <Link to="/login" className="px-8 py-4 text-ink-200 hover:text-ink-50 transition-colors">
            已有账号 · 登录
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ink-400">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-md bg-gradient-to-br from-pulse-500 to-flame-500" />
          <span>© 2026 淘潮 TaoTrend · react-bits 展示项目</span>
        </div>
        <div className="flex items-center gap-5 font-mono">
          <a className="hover:text-ink-50 transition">GitHub</a>
          <a className="hover:text-ink-50 transition">文档</a>
          <a className="hover:text-ink-50 transition">运行状态</a>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="relative overflow-x-hidden">
      <SplashCursor
        SIM_RESOLUTION={96}
        DYE_RESOLUTION={1024}
        DENSITY_DISSIPATION={4}
        VELOCITY_DISSIPATION={2.2}
        SPLAT_RADIUS={0.18}
        SPLAT_FORCE={5500}
        RAINBOW_MODE
        TRANSPARENT
      />
      <NavBar />
      <Hero />
      <Marquee />
      <BentoSection />
      <CategoriesSection />
      <CtaSection />
      <Footer />
    </div>
  )
}
