import instance, { urls } from './base.js'

export default class Shop {
  constructor(shopId) {
    this.shopId = shopId
    this.headers = { 'x-shard': `shopid=${this.shopId}` }
  }

  updateAct_(activityId, activityContentList) {
    let data = {
      service: 'ShopActivityNcpService',
      method: 'updateShopActivityInfoWithAutoDelay',
      params: {
        activityId,
        activityUpdateInfoDTO: {
          activityContentList,
          activityDateTime: {
            dates: [
              {
                beginDate: dayjs().startOf('day').format('YYYY-MM-DD'),
                endDate: dayjs().startOf('day').add(11, 'month').format('YYYY-MM-DD')
              }
            ],
            times: [{ beginTime: '00:00:00', endTime: '23:59:59' }],
            weekdays: [1, 2, 3, 4, 5, 6, 7]
          },
          baiduPlatform: true,
          effectiveCondition: { shopReductionShareWithSkuActivity: false },
          elePlatform: true
        },
        autoDelaySwitch: true,
        shopId: this.shopId
      }
    }
    return instance.post(urls.shop.updateAct, data, { headers: this.headers })
  }

  getAct(activityId) {
    let data = {
      service: 'ShopActivityNcpService',
      method: 'getShopActivityDetail',
      params: {
        activityId,
        detailType: 'ALL',
        shopId: this.shopId
      }
    }
    return instance.post(urls.shop.getAct, data, { headers: this.headers })
  }

  listActs() {
    let data = {
      service: 'MarketingCenterService',
      method: 'getActivities',
      params: {
        request: {
          page: { pageNum: 1, pageSize: 50, total: 0 },
          searchCondition: { status: 'ACTIVATED', createSource: 'UN_LIMIT', date: null },
          shopId: this.shopId,
          source: 'PC'
        }
      }
    }
    return instance.post(urls.shop.listActs, data, { headers: this.headers })
  }

  async findAct(title) {
    try {
      const data = await this.listActs()
      if(!data || !data.activities) return Promise.reject('list acts failed')
      const act = data.activities.find(v=>v.title == title)
      if(!act) return Promise.reject({err: 'act not found'})
      return Promise.resolve(act)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async updateAct(title, rules) {
    try {
      let act = await this.findAct(title)
      let contents = act.ruleVO.activityItemContents
      let activityContentList = contents.map((v, i) => ({
        ...v,
        benefit: { content: rules[i].benefit, type: 'REDUCTION' },
        condition: { content: rules[i].condition, type: 'QUOTA' }
      }))
      return this.updateAct_(act.activityId, activityContentList)
    } catch (err) {
      return Promise.reject(err)
    }
  }
}


