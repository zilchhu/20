import axios from 'axios'

const id = '93BCCA769F6E4C93A59109C2A10B959C|1609401300631'
const ksid = 'YTJLNZMTA1MjUzOTA0OTU1MTAxTlVCMkl6dDhQ'

const instance2 = axios.create({
  baseURL: 'https://httpizza.ele.me/',
  headers: {
    accept: 'application/json, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'zh-CN,zh;q=0.9',
    'content-type': 'application/json;charset=UTF-8',
    // 'invocation-protocol': 'Napos-Communication-Protocol-2',
    origin: 'https://melody-goods.faas.ele.me',
    referer: 'https://melody-goods.faas.ele.me/',
    cookie:
      'ubt_ssid=jjejf45i3g21gq7u9q0qsx7285p26no9_2020-07-23; cna=mN6fF0ZBfUoCAbcM883H0GeQ; _ga=GA1.2.1935531342.1595506439; perf_ssid=k8hpmuq7iwcmfh1w8uk3hlndqmjcbq5n_2020-07-24; ut_ubt_ssid=aw4uycga06hsyjzob32dq8a4qx2e3lsy_2020-08-02; UTUSER=0; crystalTab=FINANCE; ksid=YTJLNZMTA1MjUzOTA0OTU1MTAxTlVCMkl6dDhQ; xlly_s=1; tfstk=c5PcBS4L6-kfkRHudsGb8V3pYBXdZ7RZx5P7a7nXpC735PVPi6pyLTVlrmq06d1..; l=eB_OlV6eOjYt6EFDKOfZourza779jIRAguPzaNbMiOCP9M1p5rxGB6GIZyT9CnGVhsN9R3uKcXmQBeYBqIxJLNDqfDgX7FMmn; isg=BElJp23hTfUdyg6Fzumzsrp0WHWjlj3I5peNVuu-zTBvMmlEM-eKmSdgdJaEatUA',
    'sec-ch-ua': `"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"`,
    'sec-ch-ua-mobile': '?0',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36'
    // 'x-eleme-requestid': `${id}`
  }
})

instance2.interceptors.request.use(
  config => {
    if (config.method == 'post') {
      config.data = {
        ksid,
        ...config.data
      }
    } else if (config.method == 'get') {
      config.params = {
        ksid,
        ...config.params
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
