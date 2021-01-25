import axios from 'axios'
import urls_ from './url.js'

const namespace = 'axios-retry'

const id = 'F87A24ACA93043258B7D4AE0FD4F2246|1609236931131'
const metas = {
  appName: 'melody',
  appVersion: '4.4.0',
  ksid: 'MTBJZWMTA1MjUzOTA0OTU1MTAxTlQ2YUZiZDZQ'
}
const ncp = '2.0.0'

const instance = axios.create({
  baseURL: 'https://app-api.shop.ele.me/',
  headers: {
    accept: 'application/json, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'zh-CN,zh;q=0.9',
    'content-length': '280',
    'content-type': 'application/json;charset=UTF-8',
    'invocation-protocol': 'Napos-Communication-Protocol-2',
    origin: 'https://melody-goods.faas.ele.me',
    referer: 'https://melody-goods.faas.ele.me/',
    'sec-ch-ua': `"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"`,
    'sec-ch-ua-mobile': '?0',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
    'x-eleme-requestid': `${id}`
  }
})

instance.interceptors.request.use(
  config => {
    if (config.method == 'post') {
      config[namespace] = config[namespace] || {}
      config[namespace].data = config.data
      config[namespace].retryCount = config[namespace].retryCount || 0

      config.data = {
        id,
        metas,
        ncp,
        ...config.data
      }
    }
    // console.log(config)
    return config
  },
  err => Promise.reject(err)
)

instance.interceptors.response.use(
  res => {
    if (res.data.error != null || res.data.error != undefined) {
      return Promise.reject(res.data.error)
    }
    return res.data.result == null ? Promise.resolve(res.data) : Promise.resolve(res.data.result)
  },
  error => {
    const config = error.config

    if (!config || !config[namespace]) {
      return Promise.reject(error)
    }

    const shouldRetry = /ETIMEDOUT|ECONNRESET/.test(error.code) && config[namespace].retryCount < 3

    if (shouldRetry) {
      config[namespace].retryCount += 1

      console.log('retry...', config[namespace].retryCount)
      return new Promise(resolve =>
        setTimeout(() => resolve(instance({ ...config, data: config[namespace].data })), 600)
      )
    }

    return Promise.reject(error)
  }
)

export default instance
export const urls = urls_
