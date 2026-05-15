import axios from 'axios'
import { message } from 'antd'

const isDev = import.meta.env.DEV
export const apiBase = isDev ? '/api' : 'http://localhost:8001/api'

export const http = axios.create({
  baseURL: apiBase,
  withCredentials: true,
  timeout: 30_000,
})

http.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        message.warning('请先登录')
        window.location.href = '/login'
      }
    } else if (status >= 500) {
      message.error('服务异常，请稍后重试')
    }
    return Promise.reject(error)
  },
)
