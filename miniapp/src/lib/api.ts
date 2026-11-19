import Taro from '@tarojs/taro'
import type { Match } from '../data/league'

const BASE = process.env.TARO_APP_API || ''

export type RemoteLeague = {
  matches: Match[]
  updatedAt?: string
}

/** Returns null when no API is configured or the request fails; local seed stays usable. */
export async function fetchLeague(): Promise<RemoteLeague | null> {
  if (!BASE) return null
  try {
    console.info(`[xiangchao] fetching ${BASE}/api/league`)
    const res = await Taro.request({
      url: `${BASE}/api/league`,
      method: 'GET',
      dataType: 'json',
      timeout: 5000,
    })
    const raw = res.data as RemoteLeague | string
    const data = typeof raw === 'string' ? (JSON.parse(raw) as RemoteLeague) : raw
    if (res.statusCode !== 200 || !data || !Array.isArray(data.matches)) {
      Taro.setStorageSync('xiangchao:lastSync', { ok: false, status: res.statusCode })
      console.warn('[xiangchao] league response invalid', res.statusCode)
      return null
    }
    Taro.setStorageSync('xiangchao:lastSync', {
      ok: true,
      at: Date.now(),
      count: data.matches.length,
    })
    return data
  } catch (e) {
    Taro.setStorageSync('xiangchao:lastSync', { ok: false, error: String(e) })
    console.warn('[xiangchao] league request failed', e)
    return null
  }
}
