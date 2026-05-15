import { useEffect, useMemo, useState } from 'react'
import { Layout, Menu, Dropdown, Modal, Tabs } from 'antd'
import { DownOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { menuItems, titleMap } from './menu'

const { Sider, Header, Content } = Layout

interface TabItem {
  key: string
  label: string
}

const DEFAULT_TAB: TabItem = { key: '/app/overview', label: 'CONTROL' }

export default function AppLayout() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  const [tabs, setTabs] = useState<TabItem[]>([DEFAULT_TAB])
  const [now, setNow] = useState<string>(() =>
    new Date().toLocaleTimeString('en-GB', { hour12: false }),
  )

  const selectedKey = useMemo(() => location.pathname, [location.pathname])

  useEffect(() => {
    const id = setInterval(
      () => setNow(new Date().toLocaleTimeString('en-GB', { hour12: false })),
      1000,
    )
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const title = titleMap[location.pathname]
    if (!title) return
    setTabs((prev) =>
      prev.some((t) => t.key === location.pathname)
        ? prev
        : [...prev, { key: location.pathname, label: title }],
    )
  }, [location.pathname])

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === '__logout__') {
      Modal.confirm({
        title: 'SIGN OUT',
        content: '确认退出当前会话？',
        okText: 'CONFIRM',
        cancelText: 'CANCEL',
        onOk: async () => {
          await logout()
          nav('/login', { replace: true })
        },
      })
      return
    }
    nav(key)
  }

  const closeTab = (key: string) => {
    const idx = tabs.findIndex((t) => t.key === key)
    const next = tabs.filter((t) => t.key !== key)
    setTabs(next.length ? next : [DEFAULT_TAB])
    if (location.pathname === key) {
      const target = next[idx - 1] || next[0] || DEFAULT_TAB
      nav(target.key)
    }
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--color-ink-900, #0a0a0d)' }}>
      <Sider
        width={236}
        theme="dark"
        style={{
          overflowY: 'auto',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          background: '#0a0a0d',
        }}
      >
        <div
          style={{
            padding: '24px 20px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="u-eyebrow" style={{ marginBottom: 6, color: '#c084fc' }}>
            TAOTREND · LIVE
          </div>
          <div
            style={{
              fontFamily: 'Inter Tight, system-ui, sans-serif',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              lineHeight: 1,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #a855f7, #f43f5e)',
              }}
            />
            CONSOLE
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 10,
              letterSpacing: 1.4,
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
            }}
          >
            v1.0 · {new Date().toISOString().slice(0, 10)}
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0, paddingBottom: 80, background: 'transparent' }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '14px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: '#0a0a0d',
            fontSize: 10,
            letterSpacing: 1.4,
            color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>STATUS · NOMINAL</span>
          <span style={{ color: '#84cc16' }}>● LIVE</span>
        </div>
      </Sider>
      <Layout style={{ background: '#0a0a0d' }}>
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
            paddingInline: 24,
            background: 'rgba(10,10,13,0.75)',
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 32,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div className="u-eyebrow" style={{ whiteSpace: 'nowrap' }}>
              T+ {now}
            </div>
            <Tabs
              type="editable-card"
              hideAdd
              activeKey={selectedKey}
              items={tabs.map((t) => ({
                key: t.key,
                label: t.label,
                closable: t.key !== '/app/overview',
              }))}
              onChange={(k) => nav(k)}
              onEdit={(targetKey, action) => {
                if (action === 'remove') closeTab(String(targetKey))
              }}
              style={{ flex: 1, marginBottom: -16 }}
              tabBarStyle={{ margin: 0, border: 'none' }}
            />
          </div>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'account',
                  icon: <UserOutlined />,
                  label: 'PROFILE',
                  onClick: () => nav('/app/me/account'),
                },
                { type: 'divider' },
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'SIGN OUT',
                  onClick: () =>
                    Modal.confirm({
                      title: 'SIGN OUT',
                      content: '确认退出当前会话？',
                      okText: 'CONFIRM',
                      cancelText: 'CANCEL',
                      onOk: async () => {
                        await logout()
                        nav('/login', { replace: true })
                      },
                    }),
                },
              ],
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                paddingLeft: 12,
                borderLeft: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #a855f7, #f43f5e)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  color: '#fff',
                }}
              >
                {(user?.user_name || 'U').slice(0, 1).toUpperCase()}
              </span>
              <span className="u-eyebrow-bright" style={{ fontSize: 11 }}>
                {user?.user_name || 'OPERATOR'}
              </span>
              <DownOutlined style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)' }} />
            </span>
          </Dropdown>
        </Header>
        <Content style={{ padding: '24px 32px 64px', background: '#0a0a0d' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
