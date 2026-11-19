import Taro from '@tarojs/taro'
import type { Match } from '../data/league'

const BASE = process.env.TARO_APP_API || ''
const CLOUD_ENV = process.env.TARO_APP_CLOUD_ENV || ''

export type RemoteLeague = {
  matches: Match[]
  updatedAt?: string
}

function record(info: Record<string, unknown>) {
  try {
    Taro.setStorageSync('xiangchao:lastSync', info)
  } catch {
    // Storage is optional; syncing still works without it.
  }
}

function valid(data: unknown): data is RemoteLeague {
  return !!data && Array.isArray((data as RemoteLeague).matches)
}

/** Production reads from a WeChat cloud function, so data updates need no review release. */
export function initCloud() {
  if (process.env.TARO_ENV !== 'weapp' || !CLOUD_ENV) return
  Taro.cloud.init({ env: CLOUD_ENV, traceUser: false })
}

async function fromCloud(): Promise<RemoteLeague | null> {
  if (process.env.TARO_ENV !== 'weapp' || !CLOUD_ENV) return null
  try {
    const res = await Taro.cloud.callFunction({ name: 'league' })
    if (!valid(res.result)) {
      console.warn('[xiangchao] cloud function returned invalid data')
      return null
    }
    record({ ok: true, at: Date.now(), count: res.result.matches.length, via: 'cloud' })
    return res.result
  } catch (e) {
    record({ ok: false, error: String(e), via: 'cloud' })
    console.warn('[xiangchao] cloud function failed', e)
    return null
  }
}

async function fromHttp(): Promise<RemoteLeague | null> {
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
    if (res.statusCode !== 200 || !valid(data)) {
      record({ ok: false, status: res.statusCode, via: 'http' })
      console.warn('[xiangchao] league response invalid', res.statusCode)
      return null
    }
    record({ ok: true, at: Date.now(), count: data.matches.length, via: 'http' })
    return data
  } catch (e) {
    record({ ok: false, error: String(e), via: 'http' })
    console.warn('[xiangchao] league request failed', e)
    return null
  }
}

/** Returns null when every source fails; bundled data stays usable. */
export async function fetchLeague(): Promise<RemoteLeague | null> {
  return (await fromCloud()) ?? (await fromHttp())
}
