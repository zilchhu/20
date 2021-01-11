import instance, { urls } from './base.js'
import instance2 from './base2.js'

import dayjs from 'dayjs'

export default class Act {
  constructor(shopId) {
    this.foodAct = new FoodAct(shopId)
    this.deliverAct = new DeliverAct(shopId)
    this.shopId = shopId
    this.headers = { 'x-shard': `shopid=${this.shopId}` }
  }

  list() {
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
    return instance.post(urls.act.list, data, { headers: this.headers })
  }

  async find(title) {
    try {
      const listRes = await this.list()
      if (!listRes) return Promise.reject({ err: 'act list failed' })
      const { activities } = listRes
      const acttivity = activities.find(v => v.title == title)
      if (!acttivity) return Promise.reject({ err: 'act not found' })
      return Promise.resolve(acttivity)
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

class FoodAct {
  constructor(shopId) {
    this.shopId = shopId
    this.headers = { 'x-shard': `shopid=${this.shopId}` }
  }

  list_() {
    let data = {
      service: 'MarketingCenterService',
      method: 'getFoods',
      params: {
        request: {
          page: { pageNum: 1, pageSize: 200, total: 0 },
          searchCondition: { foodName: '', status: 'ACTIVATED', createSource: 'UN_LIMIT', date: null },
          shopId: this.shopId,
          source: 'PC'
        }
      }
    }
    return instance.post(urls.act.foodAct.list, data, { headers: this.headers })
  }

  async list() {
    try {
      const acts = await this.list_()
      if (!acts || !acts.foods) return Promise.reject({ err: 'acts list failed' })
      return Promise.resolve(acts.foods)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async find(name) {
    try {
      let acts = await this.list()
      if (!acts || !acts.foods) return Promise.reject({ err: 'act list failed' })
      let act = acts.foods.find(v => v.name == name)
      if (!act) return Promise.reject({ err: 'act find failed' })
      return Promise.resolve(act)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  content(activityId, foodId) {
    let data = {
      service: 'SkuActivityNcpService',
      method: 'getSkuActivityContent',
      params: {
        activityId,
        foodId,
        shopId: this.shopId
      }
    }
    return instance.post(urls.act.foodAct.content, data, { headers: this.headers })
  }

  getCount() {
    let data = {
      service: 'ActivityRegulationService',
      method: 'getMaxActivitySkuCountPerOrderRule',
      params: {
        shopId: this.shopId
      }
    }
    return instance.post(urls.act.foodAct.getCount, data, { headers: this.headers })
  }

  updateCount(maxCount) {
    let data = {
      service: 'ActivityShowService',
      method: 'updateShopShareMaxCount',
      params: { shopId: this.shopId, maxCount }
    }
    return instance.post(urls.act.foodAct.updateCount, data, { headers: this.headersf })
  }

  create_(skus, activity) {
    let data = {
      service: 'SkuActivityNcpService',
      method: 'createAndParticipatePriceActivity',
      params: {
        shopId: this.shopId,
        skus,
        activity: {
          activityTime: {
            dates: [
              {
                beginDate: dayjs().startOf('day').format('YYYY-MM-DD'),
                endDate: '2021-07-31'
              }
            ],
            times: [{ beginTime: '00:00:00', endTime: '23:59:59' }],
            weekdays: [1, 2, 3, 4, 5, 6, 7]
          },
          autoDelaySwitch: true,
          baiduPlatform: true,
          condition: 1,
          conditionType: 'ONLY',
          effectiveCondition: { forPeople: 'ALL_CUSTOM' },
          elePlatform: true,
          icon: { backgroud: '#FAA43C', text: '特' },
          source: 'SELF_MARKETING',
          stockDTO: { stock: 10000, stockType: 'DAILY' },
          tied: false,
          shopId: this.shopId,
          ...activity
        }
      }
    }
    return instance.post(urls.act.foodAct.create, data, { headers: this.headers })
  }

  async create(foodId, benefit, effectTimes = 10000) {
    try {
      let skus = [
        {
          stock: 10000,
          foodId,
          benefit
        }
      ]
      let activity = {
        benefit,
        effectTimes
      }
      const create_Res = await this.create_(skus, activity)
      return Promise.resolve(create_Res)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  update(activityId, foodId, benefit, effectTimes, beginDate) {
    let data = {
      service: 'SkuActivityNcpService',
      method: 'updateSkuActivityItem',
      params: {
        activityId,
        activityUpdateInfoDTO: {
          activityTime: {
            dates: [{ beginDate, endDate: '2021-07-31' }],
            times: [{ beginTime: '00:00:00', endTime: '23:59:59' }],
            weekdays: [1, 2, 3, 4, 5, 6, 7]
          },
          benefit,
          effectTimes,
          forPeople: 'ALL_CUSTOM',
          stock: 10000
        },
        foodId,
        shopId: this.shopId
      }
    }
    return instance.post(urls.act.foodAct.update, data, { headers: this.headers })
  }

  invalid(activityId, foodId) {
    let data = {
      service: 'ActivityNcpService',
      method: 'invalidActivity',
      params: {
        activityId,
        comment: '要创建新活动',
        foodId,
        shopId: this.shopId
      }
    }
    return instance.post(urls.act.foodAct.invalid, data, { headers: this.headers })
  }

  create2_(skus, activity) {
    let data = {
      service: 'SkuActivityNcpService',
      method: 'createAndParticipatePriceActivity',
      params: {
        shopId: this.shopId,
        skus,
        activity: {
          activityTime: {
            dates: [
              {
                beginDate: dayjs().startOf('day').format('YYYY-MM-DD'),
                endDate: '2021-07-31'
              }
            ],
            times: [{ beginTime: '00:00:00', endTime: '23:59:59' }],
            weekdays: [1, 2, 3, 4, 5, 6, 7]
          },
          baiduPlatform: true,
          condition: 1,
          conditionType: 'ONLY',
          effectiveCondition: { forPeople: 'ALL_CUSTOM' },
          elePlatform: true,
          icon: {backgroud: "#FAA43C", text: "换"},
          source: 'SELF_MARKETING',
          stockDTO: { stock: 10000, stockType: 'DAILY' },
          tied: true,
          shopId: this.shopId,
          ...activity
        }
      }
    }
    return instance.post(urls.act.foodAct.create, data, { headers: this.headers })
  }

  async create2(foodId, benefit, effectTimes = 10000) {
    try {
      let skus = [
        {
          stock: 10000,
          foodId,
          benefit
        }
      ]
      let activity = {
        benefit,
        effectTimes
      }
      const create_Res = await this.create2_(skus, activity)
      return Promise.resolve(create_Res)
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

class DeliverAct {
  constructor(shopId) {
    this.shopId = shopId
    this.headers = { 'x-shard': `shopid=${this.shopId}` }
  }

  getForm(playInstanceId) {
    let data = {
      request: {
        playInstanceId,
        playType: 'SELF_DELIVERY_REDUCTION',
        shopId: this.shopId
      }
    }
    return instance2.post(urls.act.deliverAct.getForm, data, { headers: this.headers })
  }

  saveForm(playInstanceId, playRules) {
    let data = {
      request: {
        clientType: 'PC',
        playInstanceId,
        playRules,
        playType: 'SELF_DELIVERY_REDUCTION',
        shopId: this.shopId
      }
    }
    return instance2.post(urls.act.deliverAct.saveForm, data, { headers: this.headers })
  }

  create(playRules) {
    let data = {
      request: {
        clientType: 'PC',
        playRules,
        playType: 'SELF_DELIVERY_REDUCTION',
        shopId: this.shopId
      }
    }
    return instance2.post(urls.act.deliverAct.create, data, { headers: this.headers })
  }

  invalid(playInstanceId) {
    let data = {
      request: {
        comment: '要创建新活动',
        playInstanceId,
        shopId: this.shopId
      }
    }
    return instance2.post(urls.act.deliverAct.invalid, data, { headers: this.headers })
  }
}
