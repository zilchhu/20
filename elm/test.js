import App, { loop, wrap, readXls, readJson } from './app.js'
import knex from 'knex'
import flatten from 'flatten'
import dayjs from 'dayjs'

const knx = knex({
  client: 'mysql',
  connection: {
    host: '192.168.3.112',
    user: 'root',
    password: '123456',
    database: 'naicai'
  }
})

function omit(obj, ks) {
  let newKs = Object.keys(obj).filter(v => !ks.includes(v))
  let newObj = newKs.reduce((res, k) => {
    return { ...res, [k]: obj[k] }
  }, {})
  return newObj
}

async function renameFood(id, oldName, newName) {
  const app = new App(id)

  try {
    const food = await app.food.find(oldName)
    const res = await app.food.updateName(food.id, newName)
    return Promise.resolve(res.name)
  } catch (err) {
    return Promise.reject(err)
  }
}

async function test_rename() {
  try {
    let data = await readXls('elm/饿了么品名整理(1).xlsx', '333')
    data = data.filter(v => v.更新后品名 != '').map(v => [v.shop_id, v.name, v.更新后品名])
    await loop(renameFood, data, false)
  } catch (error) {
    console.error(error)
  }
}

async function updateFoodMinPurchase(id, name) {
  const app = new App(id)
  try {
    const food = await app.food.find(name)
    const res = await app.food.updateMinPurchase([food.id], 1)
    return Promise.resolve(res)
  } catch (err) {
    return Promise.reject(err)
  }
}

async function test_minPurchase() {
  try {
    let [data, _] = await knx.raw(
      `SELECT * FROM ele_food_manage WHERE DATE(insert_date) = CURDATE()  AND activity_price > 8 AND min_purchase_quantity >= 2`
    )
    data = data.map(v => [v.shop_id, v.name])
    await loop(updateFoodMinPurchase, data, false)
  } catch (error) {
    console.error(error)
  }
}

async function updateAct(id, name, benefit) {
  const app = new App(id)
  try {
    let acts = await app.act.foodAct.list()
    let act = acts.find(v => v.name == name)

    if (act) {
      // const actContent = await app.act.foodAct.content(act.activityId, act.foodId)

      // const actMaxCount = await app.act.foodAct.getCount()
      // if (
      //   actMaxCount.maxActivitySkuCountPerOrder != -1 &&
      //   actMaxCount.maxActivitySkuCountPerOrder < actContent.effectTimes
      // ) {
      //   await app.act.foodAct.updateCount(actContent.effectTimes == 10000 ? -1 : actContent.effectTimes)

      // }
      await app.act.foodAct.invalid(act.activityId, act.foodId)
      await app.act.foodAct.updateCount(-1)

      const res = await app.act.foodAct.create(act.foodId, benefit, 10000)
      return Promise.resolve(res)
    } else {
      let effectTimes = 10000
      if (parseFloat(benefit) < 5) effectTimes = 1
      else if (parseFloat(benefit) < 8) effectTimes = 2

      // const actMaxCount = await app.act.foodAct.getCount()
      // if (actMaxCount.maxActivitySkuCountPerOrder != -1 && actMaxCount.maxActivitySkuCountPerOrder < effectTimes) {
      //   await app.act.foodAct.updateCount(effectTimes == 10000 ? -1 : effectTimes)
      // }

      await app.act.foodAct.updateCount(-1)

      const food = await app.food.find(name)
      const res = await app.act.foodAct.create(food.specs[0].id, benefit, effectTimes)
      return Promise.resolve(res)
    }
  } catch (err) {
    return Promise.reject(err)
  }
}

async function updateActTime(id, activityId, foodId, name, actPrice) {
  const app = new App(id)
  try {
    const actContent = await app.act.content(activityId, foodId)
    const actMaxCount = await app.act.getCount()
    if (
      actMaxCount.maxActivitySkuCountPerOrder != -1 &&
      actMaxCount.maxActivitySkuCountPerOrder < actContent.effectTimes
    ) {
      await app.act.updateCount(actContent.effectTimes == 10000 ? -1 : actContent.effectTimes)
    }
    // const res = await app.act.create(foodId, actPrice, actContent.effectTimes)
    const res = await app.act.update(
      activityId,
      foodId,
      actPrice,
      actContent.effectTimes,
      actContent.activityTime.date.beginDate
    )
    return Promise.resolve(res)
  } catch (err) {
    return Promise.reject(err)
  }
}

async function log_acts(id) {
  try {
    const app = new App(id)
    let acts = await app.act.foodAct.list()
    acts = acts.filter(act => act.rule.tags.find(v => v == '超值换购'))
    const res = await knx('test_el_acts_').insert(
      acts.map(v => ({
        shopId: id,
        activityId: v.activityId,
        foodId: v.foodId,
        skuId: v.skuId,
        name: v.name,
        price: v.rule.price
      }))
    )
    return Promise.resolve(res)
  } catch (e) {
    return Promise.reject(e)
  }
}

async function test_acttime() {
  try {
    let shops = await knx('elm_shops_').select().where({ restaurantType: 'LEAF' })
    shops = shops.map(v => [v.id])
    await loop(log_acts, shops, false)
    // let data = await knx('test_el_acts_').select()
    // data = data.map(v => [v.shopId, v.activityId, v.foodId, v.name, v.price])
    // let data = readJson('elm/log/log.json').map(v => v.meta)
    // await loop(updateActTime, data)
  } catch (error) {
    console.error(error)
  }
}

async function updatePlan(id, name, minPurchase, boxPrice, price, actPrice) {
  const app = new App(id)
  try {
    let result = {}
    // if (!minPurchase && !boxPrice && !price && !actPrice) return Promise.resolve(result)
    // if (!price && !boxPrice) return Promise.resolve(result)
    const food = await app.food.find(name)
    if (minPurchase) {
      const purchaseRes = await app.food.updateMinPurchase([food.id], minPurchase)
      result.purchaseRes = purchaseRes
    }

    if (price) {
      const priceRes = await app.food.updateFoodSpecs(
        food.id,
        food.specs.map(spec => ({ ...spec, packageFee: boxPrice, price }))
      )
      result.priceRes = priceRes.specs
    }

    if (boxPrice) {
      const boxRes = await app.food.updatePackageFee(
        food.id,
        food.specs.map(spec => spec.id),
        boxPrice
      )
      result.boxRes = boxRes
    }
    if (actPrice) {
      const actRes = await updateAct(id, name, actPrice)
      result.actRes = actRes
    }
    return Promise.resolve(result)
  } catch (err) {
    return Promise.reject(err)
  }
}

async function test_updateCount(id) {
  try {
    const app = new App(id)
    const res = await app.act.foodAct.updateCount(-1)
    return Promise.resolve(res)
  } catch (e) {
    return Promise.reject(e)
  }
}

async function test_plan() {
  try {
    let data = await readXls('elm/雪花球重上.xlsm', '饿了么雪花球重上')
    // data = data.map(v=>[v.id, v.分类, 2, 0.5, 6.9, 2.99])
    data = data.map(v => [v.门店id, '雪花球【6粒】$', null, null, null, 8.8])
    // let data = readJson('elm/log/log.json').map(v => v.meta)
    await loop(updatePlan, data, false)
  } catch (error) {
    console.error(error)
  }
}

async function updateSell(id, name, sell) {
  const app = new App(id)
  try {
    const food = await app.food.find(name)
    // const act = await app.act.find(name)
    // let actPrice = parseFloat(act.rule.price)
    const res = await app.food.updateSellStatus(
      food.id,
      food.specs.map(spec => spec.id),
      sell
    )
    return Promise.reject(res)
  } catch (err) {
    return Promise.reject(err)
  }
}

async function test_offsell() {
  try {
    let data = await readXls('elm/雪花球重上.xlsm', '饿了么雪花球重上')
    data = data.map(v => [v.门店id, v.品名, false])
    await loop(updateSell, data, false)
  } catch (error) {
    console.error(error)
  }
}

async function editFood(id, name) {
  const app = new App(id)
  try {
    const foods = await app.food.searchFood(name)
    let results = []
    for (let food of foods) {
      try {
        if (food.name.includes('扫码') || food.name.includes('红包')) continue
        let foodview = await app.food.getFoodView(food.id)
        foodview = foodview.food

        let res = await app.food.editFood(food.id, { ...foodview, notDeliverAlone: true })
        results.push(res)
      } catch (err) {
        return Promise.reject({ err, meta: food.name })
      }
    }
    return Promise.resolve(results)
  } catch (err) {
    return Promise.reject(err)
  }
}

async function test_notdeliveralone() {
  try {
    let data = await knx('elm_shops_').select().where({ restaurantType: 'LEAF' })
    data = data.map(v => [v.id, '0元'])
    await loop(editFood, data, false)
  } catch (error) {
    console.error(error)
  }
}

async function updateActRule(id, rules) {
  const app = new App(id)
  try {
    const res = await app.shop.updateAct('店铺满减', rules)
    return Promise.resolve(res)
  } catch (err) {
    return Promise.reject(err)
  }
}

async function test_actRule() {
  try {
    let r1 = [
      { benefit: 6, condition: 16 },
      { benefit: 10, condition: 32 },
      { benefit: 14, condition: 48 },
      { benefit: 18, condition: 60 },
      { benefit: 28, condition: 100 }
    ]
    let r2 = [
      { benefit: 4, condition: 15 },
      { benefit: 7, condition: 30 },
      { benefit: 10, condition: 45 },
      { benefit: 13, condition: 60 },
      { benefit: 28, condition: 100 }
    ]
    let r3 = [
      { benefit: 6, condition: 15 },
      { benefit: 9, condition: 30 },
      { benefit: 12, condition: 45 },
      { benefit: 15, condition: 60 },
      { benefit: 30, condition: 100 }
    ]
    let r4 = [
      { benefit: 8, condition: 16 },
      { benefit: 12, condition: 32 },
      { benefit: 16, condition: 48 },
      { benefit: 20, condition: 60 },
      { benefit: 30, condition: 100 }
    ]
    let r1ids = [500795650, 500729113, 2044188288, 2036923650, 500823702, 500626322]
    let data = r1ids.map(v => [v, r1])
    await loop(updateActRule, data)
  } catch (error) {
    console.log(error)
  }
}

async function updateDeliverActTime(id) {
  const app = new App(id)
  try {
    const act = await app.act.find('减配送费')
    const instanceId = new URL(act.url).searchParams.get('playInstanceId')
    let form = await app.act.deliverAct.getForm(instanceId)
    let newForm = flatten(
      form.map(item => item.components.map(c => ({ id: c.id, fieldName: c.fieldName, value: c.value })))
    )
    let target = newForm.findIndex(v => v.fieldName == '日期')
    newForm[target] = {
      id: newForm[target].id,
      value: JSON.stringify({ beginDate: dayjs().startOf('day').format('YYYY-MM-DD'), endDate: '2021-07-31' })
    }
    target = newForm.findIndex(v => v.fieldName == '配送方式')
    newForm[target] = {
      id: newForm[target].id,
      value: JSON.stringify({ value: newForm[target].value, standardId: newForm[target].value })
    }
    newForm = newForm.map(v => omit(v, ['fieldName']))
    const res = await app.act.deliverAct.saveForm(instanceId, newForm)
    return Promise.resolve(res)
  } catch (e) {
    return Promise.reject(e)
  }
}

async function createDeliverAct(id) {
  const app = new App(id)
  try {
    const act = await app.act.find('减配送费')
    const instanceId = new URL(act.url).searchParams.get('playInstanceId')
    let form = await app.act.deliverAct.getForm(instanceId)
    let newForm = flatten(
      form.map(item => item.components.map(c => ({ id: c.id, fieldName: c.fieldName, value: c.value })))
    )
    let target = newForm.findIndex(v => v.fieldName == '日期')
    newForm[target] = {
      id: newForm[target].id,
      value: JSON.stringify({ beginDate: dayjs().startOf('day').format('YYYY-MM-DD'), endDate: '2021-07-31' })
    }
    target = newForm.findIndex(v => v.fieldName == '配送方式')
    newForm[target] = {
      id: newForm[target].id,
      value: JSON.stringify({ value: newForm[target].value, standardId: newForm[target].value })
    }
    newForm = newForm.map(v => omit(v, ['fieldName']))
    await app.act.deliverAct.invalid(instanceId)
    const res = await app.act.deliverAct.create(newForm)
    return Promise.resolve(res)
  } catch (e) {
    return Promise.reject(e)
  }
}

async function test_updateDeliverTime() {
  try {
    let data = await readJson('elm/log/log.json')
    data = data.map(v => v.meta)
    await loop(updateDeliverActTime, data, false)
  } catch (error) {
    console.error(error)
  }
}

async function logLow(id) {
  const app = new App(id)

  try {
    const { infoOptimizeItems } = await app.food.listForOptimize()
    const data = infoOptimizeItems.map(v =>
      v.lowQualityIndicators.map(k => ({
        shopId: v.shopId,
        itemId: v.itemId,
        itemName: v.itemName,
        lowIndicator: k.name
      }))
    )
    console.log(data)
    const res = await knx('test_elm_low_').insert(flatten(data))
    return Promise.resolve(res)
  } catch (e) {
    return Promise.reject(e)
  }
}

async function test_loglow() {
  try {
    let data = await knx('elm_shops_').select().where({ restaurantType: 'LEAF' })
    data = data.map(v => [v.id])
    await loop(logLow, data, false)
  } catch (error) {
    console.error(error)
  }
}

async function updateDesc(id, name, desc) {
  const app = new App(id)
  try {
    const food = await app.food.find(name)
    return app.food.updateFoodDesc(food.id, desc)
  } catch (e) {
    return Promise.reject(e)
  }
}

async function updateMaterial(id, name, material) {
  const app = new App(id)
  try {
    const food = await app.food.find(name)
    const foodView = await app.food.getFoodView(food.id)
    const m = await app.food.findMaterial(material)
    const p = foodView.food.properties.map(v => ({
      ...v,
      details:
        v.details.length == 1 ? v.details.concat([{ ...v.details[0], name: v.details[0].name + '.' }]) : v.details
    }))
    const data = { ...foodView.food, itemMaterials: [{ materialId: m.id, materialName: m.name }], properties: p }
    return app.food.editFood(food.id, data)
  } catch (e) {
    return Promise.reject(e)
  }
}

async function updateLabel(id, name, label) {
  const app = new App(id)
  try {
    const labelMap = {
      新品: 'NEW',
      招牌菜: 'FEATURED',
      辣: 'SPICY'
    }
    const food = await app.food.find(name)
    const foodView = await app.food.getFoodView(food.id)

    const p = foodView.food.properties.map(v => ({
      ...v,
      details:
        v.details.length == 1 ? v.details.concat([{ ...v.details[0], name: v.details[0].name + '.' }]) : v.details
    }))
    const data = { ...foodView.food, labels: [labelMap[label]], properties: p }
    return app.food.editFood(food.id, data)
  } catch (e) {
    return Promise.reject(e)
  }
}

async function test() {
  try {
    let data = await readXls('elm/饿了么低质量(1)(1).xlsx', 'c2')
    data = data.filter(v => v.特色 != '')
    let data2 = await knx('test_elm_low_')
      .select()
      .whereIn(
        'itemName',
        data.map(v => v.itemName)
      )
      .andWhere('lowIndicator', 'like', '%特色%')
    data2 = data2
      // .slice(data2.length - 38000)
      .map(v => ({ ...v, material: data.find(k => k.itemName == v.itemName).特色 }))
      .map(v => [v.shopId, v.itemName, v.material])
      .slice(0, 1000)

    // let data = await readJson('elm/log/log.json')
    // data = data.map(v => v.meta)
    await loop(updateLabel, data2, false)
  } catch (error) {
    console.error(error)
  }
}

test()

// 0  1  2  3
// 4  5  6  7
// 8  9  10 11
// 12 13 14 15
// 16 17 18 19
// 20 21 22 23
// 24 25 26 27
// 28 29 30 31
// 32 33 34 35
// 36 37 38 39

// test_plan()
// test_rename()
// test_acttime()
// test_offsell()
