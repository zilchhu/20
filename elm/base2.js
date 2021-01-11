import axios from 'axios'

const id = '93BCCA769F6E4C93A59109C2A10B959C|1609401300631'
const ksid = 'MTBJZWMTA1MjUzOTA0OTU1MTAxTlQ2YUZiZDZQ'

const instance2 = axios.create({
  baseURL: 'https://httpizza.ele.me/',
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

instance2.interceptors.request.use(
  config => {
    if (config.method == 'post') {
      config.data = {
        ksid,
        ...config.data
      }
    }
    return config
  },
  err => Promise.reject(err)
)

instance2.interceptors.response.use(
  res => {
    return Promise.resolve(res.data)
  },
  err => Promise.reject(err)
)

export default instance2

