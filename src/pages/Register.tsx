import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Form, Input, App } from 'antd'
import Aurora from '@/components/Aurora'
import { authApi } from '@/api/services'
import { useAuth } from '@/auth/AuthContext'

interface FormValues {
  user: string
  user_name: string
  password: string
  confirm: string
}

export default function Register() {
  const nav = useNavigate()
  const { setUser } = useAuth()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: FormValues) => {
    setLoading(true)
    try {
      const r = await authApi.register(values.user, values.password, values.user_name)
      if (r.code === 0 && r.user_id && r.user_name) {
        setUser({
          user_id: r.user_id,
          user_name: r.user_name,
          avatar_seed: r.avatar_seed,
        })
        message.success(r.msg || '注册成功')
        nav('/app/overview', { replace: true })
      } else {
        message.error(r.msg || '注册失败')
      }
    } catch {
      message.error('注册失败，请稍后重试')
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
      <div style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
        <Aurora
          colorStops={['#f43f5e', '#a855f7', '#0ea5e9']}
          amplitude={0.9}
          blend={0.45}
          speed={0.55}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(10,10,13,0) 20%, rgba(10,10,13,0.65) 75%, #0a0a0d 100%)',
        }}
      />
      <div
        className="bg-soft-grid"
        style={{ position: 'absolute', inset: 0, opacity: 0.22 }}
      />

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
        <div className="u-eyebrow">ACCESS REQUEST · STEP 02</div>
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
        <div>
          <div className="u-eyebrow" style={{ marginBottom: 24, color: '#fda4af' }}>
            NEW OPERATOR · ENROLLMENT
          </div>
          <h1 className="u-display-xxl" style={{ margin: 0 }}>
            REQUEST
            <br />
            <span
              style={{
                background:
                  'linear-gradient(120deg, #f43f5e 0%, #a855f7 50%, #0ea5e9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ACCESS
            </span>
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
            创建新账号以接入直播数据控制台。
            系统将基于您的收藏与浏览记录, 通过 item-CF 协同过滤算法为您匹配最相关的商品。
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              padding: '40px 36px',
              background: 'rgba(10,10,13,0.72)',
              border: '1px solid rgba(244,63,94,0.25)',
              borderRadius: 12,
              backdropFilter: 'saturate(180%) blur(20px)',
              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
              boxShadow: '0 0 60px rgba(244,63,94,0.18)',
            }}
          >
            <div className="u-eyebrow" style={{ marginBottom: 8, color: '#fda4af' }}>
              AUTH · STEP 02
            </div>
            <h2
              className="u-display-lg"
              style={{ margin: 0, fontSize: 32, letterSpacing: 0.4 }}
            >
              CREATE ACCOUNT
            </h2>

            <Form
              layout="vertical"
              onFinish={onFinish}
              size="large"
              requiredMark={false}
              style={{ marginTop: 28 }}
            >
              <Form.Item
                label="ACCOUNT ID"
                name="user"
                rules={[{ required: true, message: '请输入账号' }]}
              >
                <Input placeholder="账号 / 工号" />
              </Form.Item>
              <Form.Item
                label="OPERATOR NAME"
                name="user_name"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="用户名" />
              </Form.Item>
              <Form.Item
                label="PASSWORD"
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password placeholder="密码" />
              </Form.Item>
              <Form.Item
                label="CONFIRM"
                name="confirm"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请再次输入密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value)
                        return Promise.resolve()
                      return Promise.reject(new Error('两次密码不一致'))
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="确认密码" />
              </Form.Item>
              <Form.Item style={{ marginTop: 28, marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                >
                  REQUEST ACCESS
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
              <span>Have an account?</span>
              <Link
                to="/login"
                style={{ color: '#fda4af', textDecoration: 'underline' }}
              >
                ← SIGN IN
              </Link>
            </div>
          </div>
        </div>
      </div>

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
