import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button, Form, Input, App } from 'antd'
import Aurora from '@/components/Aurora'
import { authApi } from '@/api/services'
import { useAuth } from '@/auth/AuthContext'

export default function Login() {
  const nav = useNavigate()
  const location = useLocation()
  const { setUser } = useAuth()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { user: string; password: string }) => {
    setLoading(true)
    try {
      const r = await authApi.login(values.user, values.password)
      if (r.code === 0 && r.user_id && r.user_name) {
        setUser({
          user_id: r.user_id,
          user_name: r.user_name,
          avatar_seed: r.avatar_seed,
        })
        message.success(r.msg || '登录成功')
        const from = (location.state as { from?: { pathname: string } } | null)?.from
          ?.pathname
        nav(from || '/app/overview', { replace: true })
      } else {
        message.error(r.msg || '登录失败')
      }
    } catch {
      message.error('登录失败，请检查账号密码或服务状态')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
        background: '#0a0a0d',
      }}
    >
      {/* cyberpunk aurora — pulse / flame / cyan */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.6 }}>
        <Aurora
          colorStops={['#a855f7', '#f43f5e', '#0ea5e9']}
          amplitude={1.0}
          blend={0.5}
          speed={0.6}
        />
      </div>
      {/* horizon fade */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(10,10,13,0) 20%, rgba(10,10,13,0.65) 75%, #0a0a0d 100%)',
        }}
      />
      {/* faint grid */}
      <div
        className="bg-soft-grid"
        style={{ position: 'absolute', inset: 0, opacity: 0.25 }}
      />

      {/* top brand bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '24px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 5,
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            color: '#fff',
            textDecoration: 'none',
            fontFamily: 'Inter Tight, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 2.4,
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #a855f7, #f43f5e)',
            }}
          />
          TAOTREND · LIVE
        </Link>
        <div className="u-eyebrow">SECURE TERMINAL · ENCRYPTED</div>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 4,
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          alignItems: 'center',
          padding: '120px 80px 80px',
          gap: 80,
        }}
      >
        {/* LEFT: mission copy */}
        <div>
          <div className="u-eyebrow" style={{ marginBottom: 24, color: '#c084fc' }}>
            MISSION · LIVE-STREAM INTELLIGENCE
          </div>
          <h1 className="u-display-xxl" style={{ margin: 0 }}>
            TAOTREND
            <br />
            <span
              style={{
                background:
                  'linear-gradient(120deg, #a855f7 0%, #f43f5e 50%, #0ea5e9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              LIVE
            </span>
            <br />
            CONSOLE
          </h1>
          <p
            style={{
              maxWidth: 480,
              marginTop: 32,
              color: 'rgba(229,231,235,0.7)',
              fontSize: 17,
              lineHeight: 1.47,
              letterSpacing: '-0.374px',
            }}
          >
            一个为电商运营设计的直播间趋势分析与商品智能推荐平台。
            采集三平台直播间、计算品类热度、基于收藏行为推荐最相关商品。
          </p>

          <div
            style={{
              marginTop: 56,
              display: 'flex',
              gap: 48,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: 24,
            }}
          >
            {[
              ['25 000+', 'PRODUCTS'],
              ['5 000+', 'LIVESTREAMS'],
              ['item-CF', 'RECOMMEND'],
            ].map(([v, k]) => (
              <div key={k}>
                <div
                  className="u-kpi-numeric"
                  style={{
                    fontSize: 28,
                    background:
                      'linear-gradient(120deg, #a855f7, #f43f5e)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {v}
                </div>
                <div className="u-eyebrow" style={{ marginTop: 6, fontSize: 11 }}>
                  {k}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: login form */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              padding: '40px 36px',
              background: 'rgba(10,10,13,0.72)',
              border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: 12,
              backdropFilter: 'saturate(180%) blur(20px)',
              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
              boxShadow: '0 0 60px rgba(168,85,247,0.18)',
            }}
          >
            <div className="u-eyebrow" style={{ marginBottom: 8, color: '#c084fc' }}>
              AUTH · STEP 01
            </div>
            <h2
              className="u-display-lg"
              style={{ margin: 0, fontSize: 32, letterSpacing: 0.4 }}
            >
              SIGN IN
            </h2>
            <p
              style={{
                marginTop: 12,
                color: 'rgba(229,231,235,0.6)',
                fontSize: 13,
                letterSpacing: 0.2,
              }}
            >
              使用账号密码进入控制台。测试账号：test001 / 123456
            </p>

            <Form
              layout="vertical"
              onFinish={onFinish}
              size="large"
              requiredMark={false}
              style={{ marginTop: 28 }}
            >
              <Form.Item
                label="ACCOUNT"
                name="user"
                rules={[{ required: true, message: '请输入账号' }]}
              >
                <Input placeholder="账号 / 工号" autoComplete="username" />
              </Form.Item>
              <Form.Item
                label="PASSWORD"
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password placeholder="密码" autoComplete="current-password" />
              </Form.Item>
              <Form.Item style={{ marginTop: 28, marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                >
                  ENGAGE
                </Button>
              </Form.Item>
            </Form>

            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: 'rgba(229,231,235,0.6)',
              }}
            >
              <span>No account?</span>
              <Link
                to="/register"
                style={{ color: '#c084fc', textDecoration: 'underline' }}
              >
                REQUEST ACCESS →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* bottom telemetry strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '14px 40px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          letterSpacing: 1.6,
          color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase',
          background: 'rgba(10,10,13,0.6)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span>● SYSTEM NOMINAL</span>
        <span>BUILD 2026.05 · TAOTREND.LIVE</span>
        <span>LATENCY · 12MS</span>
      </div>
    </div>
  )
}
