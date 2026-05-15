/* ============================================================
   P14 / /app/me/account — OPERATOR PROFILE
   PAGES_SPEC.md §P14
   单卡 640px max-width，Form 改密
   ============================================================ */
import { useState } from 'react'
import { Button, Form, Input, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import PageHero from '@/components/PageHero'
import AnchorAvatar from '@/components/AnchorAvatar'
import { useAuth } from '@/auth/AuthContext'
import { authApi } from '@/api/services'

interface FormValues {
  user_name: string
  old_pass: string
  pass_word: string
  confirm: string
}

export default function AccountPage() {
  const { user, refresh } = useAuth()
  const [form] = Form.useForm<FormValues>()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (values: FormValues) => {
    if (values.pass_word !== values.confirm) {
      message.error('两次新密码不一致')
      return
    }
    setSubmitting(true)
    try {
      const r = await authApi.update(
        values.user_name,
        values.old_pass,
        values.pass_word,
      )
      if (r.code === 0) {
        message.success('账号信息已更新')
        await refresh()
        form.resetFields(['old_pass', 'pass_word', 'confirm'])
      } else {
        message.error(r.msg || '更新失败')
      }
    } catch (err) {
      console.error(err)
      message.error('更新失败，请检查旧密码')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHero
        eyebrow="07·ME · M-04"
        title="OPERATOR PROFILE"
        description={`OPERATOR · ${user?.user_id ?? '???'} · 修改昵称或密码不会影响登录会话。`}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <section
          style={{
            maxWidth: 640,
            width: '100%',
            background: 'var(--ink-850)',
            border: '1px solid var(--hairline-soft)',
            borderRadius: 12,
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* identity strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '16px 20px',
              background: 'var(--ink-800)',
              border: '1px solid var(--hairline-soft)',
              borderRadius: 10,
            }}
          >
            <AnchorAvatar
              seed={user?.avatar_seed || user?.user_id || 'me'}
              initial={user?.user_name?.[0]}
              size={64}
              status="live"
            />
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-1)',
                  letterSpacing: '-0.01em',
                }}
              >
                {user?.user_name || 'OPERATOR'}
              </div>
              <div
                className="u-eyebrow"
                style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}
              >
                USER · {user?.user_id ?? '—'}
              </div>
            </div>
          </div>

          {/* form */}
          <Form<FormValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{
              user_name: user?.user_name ?? '',
            }}
            onFinish={handleSubmit}
          >
            <Form.Item
              label="DISPLAY NAME · 昵称"
              name="user_name"
              rules={[{ required: true, message: '请输入昵称' }, { max: 32 }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="昵称"
                size="large"
              />
            </Form.Item>
            <Form.Item
              label="CURRENT PASSWORD · 旧密码"
              name="old_pass"
              rules={[{ required: true, message: '请输入旧密码以确认身份' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="旧密码"
                size="large"
              />
            </Form.Item>
            <Form.Item
              label="NEW PASSWORD · 新密码"
              name="pass_word"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码长度至少 6 位' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="新密码 (≥ 6 位)"
                size="large"
              />
            </Form.Item>
            <Form.Item
              label="CONFIRM · 再次确认"
              name="confirm"
              dependencies={['pass_word']}
              rules={[
                { required: true, message: '请再次输入新密码' },
                ({ getFieldValue }) => ({
                  validator(_r, value) {
                    if (!value || getFieldValue('pass_word') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('两次新密码不一致'))
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="再次确认新密码"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={submitting}
              >
                SAVE CHANGES
              </Button>
            </Form.Item>
          </Form>

          <div
            style={{
              paddingTop: 16,
              borderTop: '1px solid var(--hairline-soft)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-4)',
              letterSpacing: 0.8,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>STATUS · NOMINAL</span>
            <span>SESSION · ACTIVE</span>
          </div>
        </section>
      </div>
    </div>
  )
}
