import { Outlet } from 'react-router-dom'

/**
 * Landing 系页面（Landing 已自带 NavBar + Footer）
 * 这一层故意保持极简：不引入 AntD Layout，避免覆盖 cyberpunk 调性。
 */
export default function LandingLayout() {
  return <Outlet />
}
