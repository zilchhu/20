import axios from 'axios'
import knex from 'knex'

const knx = knex({
  client: 'mysql',
  connection: {
    host: '192.168.3.112',
    user: 'root',
    password: '123456',
    database: 'naicai'
  }
})

const namespace = 'axios-retry'

let { ks_id } = await knx('ele_info_manage').first('ks_id')

const id = '93BCCA769F6E4C93A59109C2A10B959C|1609401300631'
const ksid = ks_id

const instance2 = axios.create({
  baseURL: 'https://httpizza.ele.me/',
  responseType: 'json',
  timeout: 5000,
  headers: {
    accept: '*/*',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'zh-CN,zh;q=0.9',
    cookie:
      'ubt_ssid=jjejf45i3g21gq7u9q0qsx7285p26no9_2020-07-23; cna=mN6fF0ZBfUoCAbcM883H0GeQ; _ga=GA1.2.1935531342.1595506439; perf_ssid=k8hpmuq7iwcmfh1w8uk3hlndqmjcbq5n_2020-07-24; ut_ubt_ssid=aw4uycga06hsyjzob32dq8a4qx2e3lsy_2020-08-02; UTUSER=0; NEW_PC=1; ksid=OTA3YJMTA1MjUzOTA0OTU1MTAxTlhJSldrazJQ; shopId=500828380; xlly_s=1; isg=BHh4l27ubJoDqr9W917y8XMrSSYK4dxrv6RabLLpErNmzRu3W_Fu-t6shcX9nZRD; l=eB_OlV6eOjYt6yMZBO5wnurza77tUIRf1sPzaNbMiInca6ZlOFgTHNCQGMH25dtjgt5AMeKyJvGCeR3BJ4z38AkDBeYB8ZBzJF96Je1..; tfstk=cGEfBOchPIAf1q_w0-6ybaRMMyoOZ1vICZG0hyt_YtVRVr2fiGtEOxE4SCK-JY1..',
    origin: 'https://ele-melody-merchant.faas.ele.me',
    referer: 'https://ele-melody-merchant.faas.ele.me/',
    'sec-ch-ua': '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.104 Safari/537.36',
    'x-eleme-requestid': 'AE1FCBF314F24D09ABD5F696967EFF46|1614933408225'
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
