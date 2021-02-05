import App, { loop, wrap, readXls, readJson } from './app.js'
import knex from 'knex'
import flatten from 'flatten'
import dayjs from 'dayjs'
import fs from 'fs'
import sleep from 'sleep-promise'
import schedule from 'node-schedule'

const knx = knex({
  client: 'mysql',
  connection: {
    host: '192.168.3.112',
    user: 'root',
    password: '123456',
    database: 'naicai'
  }
})

// async function t1() {
//   try {
//     const data = await readXls('elm/饿了么低质量(1)(1).xlsx', 'c2')
//     console.log(await knx('test_elm_low_temp_').insert(data))
//   } catch (error) {
//     console.error(error)
//   }
// }

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
    let [data, _] = await knx.raw(`SELECT * FROM ele_food_manage  WHERE DATE(insert_date) = CURDATE() 
      AND  (name LIKE '%草莓脏脏茶%' OR name LIKE '%芒果脏脏茶%') AND name NOT LIKE '%+%' ORDER BY shop_id`)
    data = data.filter(v => v.修改后产品名 != '').map(v => [v.shop_id, v.name, v.name.replace('外卖不挂杯属于正常现象', '只可冷饮')])
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
      const actContent = await app.act.foodAct.content(act.activityId, act.foodId)

      // const actMaxCount = await app.act.foodAct.getCount()
      // if (
      //   actMaxCount.maxActivitySkuCountPerOrder != -1 &&
      //   actMaxCount.maxActivitySkuCountPerOrder < actContent.effectTimes
      // ) {
      //   await app.act.foodAct.updateCount(actContent.effectTimes == 10000 ? -1 : actContent.effectTimes)

      // }
      await app.act.foodAct.invalid(act.activityId, act.foodId)
      await app.act.foodAct.updateCount(-1)

      const res = await app.act.foodAct.create(act.foodId, benefit, actContent.effectTimes)
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

async function updatePlan(id, name, minPurchase, boxPrice, price, actPrice, skuType) {
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

    if (boxPrice) {
      const boxRes = await app.food.updatePackageFee(
        food.id,
        food.specs.map(spec => spec.id),
        boxPrice
      )
      result.boxRes = boxRes
    }

    if (price) {
      if ((skuType || food.recentSales <= 30) && price > food.specs[0].price * 1.4) {
        const priceRes = await updateSku(id, name, null, price)
        result.priceRes = priceRes.specs
      } else {
        const priceRes = await app.food.updateFoodSpecs(
          food.id,
          food.specs.map(spec => ({ ...spec, packageFee: boxPrice, price }))
        )
        result.priceRes = priceRes.specs
      }
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
    let data = await readXls('elm/plan/饿了么修改.xls', '修改原价13.8')
    // data = data.map(v=>[v.id, v.分类, 2, 0.5, 6.9, 2.99])
    data = data.map(v => [v.门店id, v.品名, null, null, 13.8, null, false])
    // data = data.map(v => [v.门店id, v.品名])

    // let data = readJson('elm/log/log.json')
    //   .filter(v => v.err.code == 'ETIMEDOUT')
    //   .map(v => v.meta)
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

async function batchRemove(id, name) {
  const app = new App(id)
  try {
    const food = await app.food.find(name)
    return app.food.batchRemove([{ foodId: food.id, foodSpecIds: food.specs.map(spec => spec.id) }])
  } catch (e) {
    return Promise.reject(e)
  }
}

async function test_offsell() {
  try {
    let [data, _] = await knx.raw(`SELECT * FROM ele_food_manage WHERE DATE(insert_date) = CURDATE() 
    AND (name LIKE '%0元吃%' OR name LIKE '%0元购%')`)

    data = data.map(v => [v.shop_id, v.name, false])
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

async function updateSubsidy(shopId) {
  const app = new App(shopId)
  try {
    const act = await app.act.find('百亿补贴')

    const instanceId = new URL(act.url).searchParams.get('playInstanceId')
    const { globalId } = await app.act.subsidyAct.getGlobalId(instanceId)

    let { rules } = await app.act.subsidyAct.getInfo(instanceId)
    rules[6].value = JSON.parse(rules[6].value)
    rules[6].value.rule[0].benefit = 6
    rules[6].value.rule[1].benefit = 10
    // rules[6].value.rule[2].benefit = 14
    rules[6].value = JSON.stringify(rules[6].value)
    let formFields = [rules[0], rules[6]]

    return app.act.subsidyAct.modify(globalId, formFields)
  } catch (e) {
    return Promise.reject(e)
  }
}

async function test_subsidy() {
  try {
    let data = await readXls('elm/plan/1.饿了么满减活动检查.xlsx', '1.饿了么满减活动检查')
    data = data.map(v => [v.shop_id])
    await loop(updateSubsidy, data, false)
  } catch (error) {
    console.error(error)
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

async function updateSku(id, name, boxPrice, price) {
  const app = new App(id)
  try {
    const food = await app.food.find(name)
    const foodView = await app.food.getFoodView(food.id)
    let specs = [foodView.food.specs[0]]
    specs[0].name = '1'
    specs.push({
      name: '2',
      price,
      weight: 0,
      calorie: null,
      stock: 10000,
      maxStock: 10000,
      packageFee: boxPrice || specs[0].packageFee,
      stockStatus: 0,
      onShelf: true
    })
    const edited = await app.food.editFood(food.id, { ...foodView.food, specs })
    await sleep(600)
    const editedfoodView = await app.food.getFoodView(food.id)
    let spec = editedfoodView.food.specs.find(v => v.name == '2')
    if (!spec) return Promise.reject({ err: 'spec not found' })
    spec.name = ''
    return app.food.editFood(food.id, { ...editedfoodView.food, specs: [spec] })
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

async function updateCateModel(id, name, model) {
  const app = new App(id)
  try {
    const food = await app.food.find(name)
    const foodView = await app.food.getFoodView(food.id)
    const c = await app.food.findCategoryModel(model)
    const p = foodView.food.properties.map(v => ({
      ...v,
      details:
        v.details.length == 1
          ? v.details
              .map(d => ({ ...d, name: d.name.trim() }))
              .concat([{ ...v.details[0], name: v.details[0].name + '.' }])
          : v.details.map(d => ({ ...d, name: d.name.trim() }))
    }))
    const data = { ...foodView.food, categoryModel: c, properties: p }
    return app.food.editFood(food.id, data)
  } catch (e) {
    return Promise.reject(e)
  }
}

async function updateJoinHot(id, name) {
  const app = new App(id)
  try {
    const food = await app.food.find(name)
    const foodView = await app.food.getFoodView(food.id)

    const p = foodView.food.properties.map(v => ({
      ...v,
      details:
        v.details.length == 1
          ? v.details
              .map(d => ({ ...d, name: d.name.trim() }))
              .concat([{ ...v.details[0], name: v.details[0].name + '.' }])
          : v.details.map(d => ({ ...d, name: d.name.trim() }))
    }))
    const data = { ...foodView.food, joinHotGoods: true, properties: p }
    return app.food.editFood(food.id, data)
  } catch (e) {
    return Promise.reject(e)
  }
}

async function test_improve_low() {
  try {
    // let data = await readXls('elm/饿了么低质量(1)(1).xlsx', 'c2')
    // data = data.filter(v => v.特色 != '')
    // let data2 = await knx('test_elm_low_')
    //   .select()
    //   .whereIn(
    //     'itemName',
    //     data.map(v => v.itemName)
    //   )
    //   .andWhere('lowIndicator', 'like', '%特色%')
    // data2 = data2
    //   // .slice(data2.length - 38000)
    //   .map(v => ({ ...v, label: data.find(k => k.itemName == v.itemName).特色 }))
    //   .map(v => [v.shopId, v.itemName, v.label])

    // let data = await readJson('elm/log/log.json')

    let data = `501293027
    500976597
    2069431636
    500978127
    337665077
    2066637616
    500807110
    500977657
    2072124325
    2073060793
    501331920
    501307859
    2034961279
    2069439328
    2000369921
    2000553854
    501120413
    500626322
    2069421855
    2059321589
    2032806756
    2001309447
    500961678
    2036859197
    2000057696
    2059371239
    337387076
    2043020189
    2043612048
    500807611
    2036923650
    501402505
    501653898
    500944311
    2059311820
    2044383148
    2073266660
    501117346
    501655396
    501101401
    500710740
    2062149223
    501348209
    2036922361
    2044399437
    501348216
    501080384
    500920696
    500968820
    501088111
    500850028
    500729113
    501125407
    500707083
    2032450032
    500146966
    500795650
    2062189579
    501127997
    2069409212
    2042668330
    2073271161
    500162851
    172784456
    2043111617
    168048393
    501686519
    337359625
    2000490542
    2057184191
    500845819
    2073264822
    500969722
    2044914885
    501128428
    500850414
    2072106679
    500732131
    2044387559
    500673257
    501625510
    2041788658
    2055892428
    500600465
    2042487542
    500823702
    500605574
    2043361951
    2044188288
    2042678427
    337417083
    500610750
    2069361212
    2044401323
    501676694
    337447273
    501120677
    2062014821
    2043923028
    2065996973
    501629032
    171032999
    2066605754
    2001214161
    501403768
    501103172
    161591866
    2044199033
    500818047
    2043662434
    2041713180
    2038550574
    2038390986
    2001338621
    2043017855
    500958310
    500960871
    500978275
    500959331
    2059374461
    156821661
    2001036419
    500920339
    500962839
    2073255007
    501129234
    2062149432
    2043574809
    336835017
    2073319496
    500621367
    2069415609
    500795963
    174342019
    2056477563
    2073252478
    2036933766
    500178466
    2043160124
    2036842642
    2019402155
    2041830473
    2058440522
    `
      .split('\n')
      .map(v => v.trim())

    let foods = `火腿烤冷面$
    相思红豆奶茶【必抢】$
    双拼奶茶【必抢】$
    招牌水果茶(大杯)
    草莓脏脏茶(外卖不挂杯属于正常现象)$
    网红柠檬鸡爪【4小个】$
    杨枝甘露【必抢】$
    【新品必抢】血糯米奶茶$
    椰汁糕(8块)$
    焦糖布丁$
    芝士焗番薯
    芝士葡萄【大杯】$
    多肉葡萄【大杯】$
    招牌芋圆奶茶$
    【正宗】螺蛳粉$
    复古蛋糕奶茶$
    酱拌刀削面【必抢】$
    【暖冬新品】芋泥波波茶$`
      .split('\n')
      .map(v => v.trim())

    for (let food of foods) {
      let data2 = data.map(v => [v, food])
      await loop(updateJoinHot, data2, false)
    }
  } catch (error) {
    console.error(error)
  }
}

async function test_logAppeal() {
  try {
    let data = await knx('elm_shops_').select().where({ restaurantType: 'LEAF' })
    data = data.map(v => [v.id])
    await loop(logAppeal, data, false)
  } catch (error) {
    console.error(error)
  }
}

async function logAppeal(id) {
  try {
    const app = new App(id)
    const cats = await app.food.listFoodCat()
    let data = []
    for (let cat of cats) {
      try {
        let foods = await app.food.listFoods(cat.id)
        foods = foods
          .filter(food => food.itemAuditInfoList)
          .map(food => ({
            id: food.id,
            name: food.name,
            shopId: id,
            auditStatus: food.itemAuditInfoList[0].auditStatus,
            detail: food.itemAuditInfoList[0].detail
          }))
        data.push(foods)
      } catch (e) {
        console.error(e)
        continue
      }
    }
    return knx('test_elm_appeal_').insert(flatten(data))
  } catch (e) {
    return Promise.reject(e)
  }
}

async function appeal(id, name) {
  try {
    const app = new App(id)
    const food = await app.food.find(name)
    // APPEAL_FAILED AUDIT_FAILED
    if (!food.itemAuditInfoList || food.itemAuditInfoList[0].auditStatus == 'APPEALING')
      return Promise.reject({ err: 'no need' })
    return app.food.appeal(food.itemAuditInfoList[0])
  } catch (e) {
    return Promise.reject(e)
  }
}

async function neverAppeal(id, name) {
  try {
    const app = new App(id)
    const food = await app.food.find(name)
    // APPEAL_FAILED AUDIT_FAILED
    if (!food.itemAuditInfoList || /APPEAL_FAILED|AUDIT_FAILED/.test(food.itemAuditInfoList[0].auditStatus))
      return Promise.reject({ err: 'no need' })
    return app.food.neverAppeal(food.itemAuditInfoList[0])
  } catch (e) {
    return Promise.reject(e)
  }
}

async function test_appeal() {
  try {
    let data = await readXls('elm/plan/工作簿3.xlsx', 'Sheet1')
    data = data.map(v => [v.id, v.产品名])
    await loop(neverAppeal, data, false)
  } catch (error) {
    console.error(error)
  }
}

async function test_invalid_update() {
  try {
    let data = await readXls('elm/plan/1-04饿了么单折扣商品起送查询(1).xlsx', '1-04饿了么单折扣商品起送查询')
    data = data.map(v => [v.shop_id, v.name, v.修改后原价, v.修改后折扣价])
    await loop(helper, data, true)
  } catch (error) {
    console.error(error)
  }

  async function helper(id, name, price, actPrice) {
    try {
      const app = new App(id)
      const food = await app.food.findInCats(name)
      const actId = food.activities[0] ? food.activities[0].activityId : null
      if (actId) {
        console.log(actId, food.name, food.specs[0].id)
        console.log(await app.act.foodAct.invalid(actId, food.specs[0].id))
      }
      await sleep(3000)
      return updatePlan(id, name, null, null, price, actPrice)
    } catch (e) {
      return Promise.reject(e)
    }
  }
}

async function test_autotask() {
  try {
    let tasks = {
      原价扣点折扣价: async function () {
        try {
          console.log('原价扣点折扣价')
          let task = await knx('test_task_').select().where({ title: '原价扣点折扣价', platform: '饿了么' })
          if (!task) return
          let [data, _] = await knx.raw(task[0].sql)
          data = data.map(v => [v.门店id, v.品名, null, null, null, parseFloat(v.原价) - 1])
          await loop(updatePlan, data, false)
        } catch (e) {
          console.error(e)
        }
      },
      两份起购餐盒费: async function () {
        try {
          console.log('两份起购餐盒费')
          let task = await knx('test_task_').select().where({ title: '两份起购餐盒费', platform: '饿了么' })
          if (!task) return
          let [data, _] = await knx.raw(task[0].sql)
          data = data.map(v => [v.门店id, v.品名, null, 1.5, null, null])
          await loop(updatePlan, data, false)
        } catch (e) {
          console.error(e)
        }
      },
      两份起购无餐盒费: async function () {
        try {
          console.log('两份起购无餐盒费')
          let task = await knx('test_task_').select().where({ title: '两份起购无餐盒费', platform: '饿了么' })
          if (!task) return
          let [data, _] = await knx.raw(task[0].sql)
          data = data.map(v => [v.门店id, v.品名, null, 0.5, null, null])
          await loop(updatePlan, data, false)
        } catch (e) {
          console.error(e)
        }
      },
      常规产品无餐盒费: async function () {
        try {
          console.log('常规产品无餐盒费')
          let task = await knx('test_task_').select().where({ title: '常规产品无餐盒费', platform: '饿了么' })
          if (!task) return
          let [data, _] = await knx.raw(task[0].sql)
          data = data.map(v => [v.门店id, v.品名, null, 1, null, null])
          await loop(updatePlan, data, false)
        } catch (e) {
          console.error(e)
        }
      },
      非: async function () {
        try {
          console.log('非')
          let task = await knx('test_task_').select().where({ title: '≠6.9+0.5', platform: '饿了么' })
          if (!task) return
          let [data, _] = await knx.raw(task[0].sql)
          data = data.map(v => [v.shop_id, v.name, null, 0.5, 6.9, null])
          await loop(updatePlan, data, false)
        } catch (e) {
          console.error(e)
        }
      },
      原价餐盒凑起送: async function () {
        try {
          console.log('原价餐盒凑起送')
          let task = await knx('test_task_').select().where({ title: '原价餐盒凑起送', platform: '饿了么' })
          if (!task) return
          let [data, _] = await knx.raw(task[0].sql)
          data = data.map(v => [v.门店id, v.品名, null, 1, 13.8, null])
          await loop(updatePlan, data, false)
        } catch (e) {
          console.error(e)
        }
      },
      甜品粉面套餐: async function () {
        try {
          console.log('甜品粉面套餐')
          let task = await knx('test_task_').select().where({ title: '甜品粉面套餐', platform: '饿了么' })
          if (!task) return
          let [data, _] = await knx.raw(task[0].sql)
          data = data.map(v => [v.门店id, v.品名, null, 2, 27.8, 15.8])
          await loop(updatePlan, data, false)
        } catch (e) {
          console.error(e)
        }
      },
      贡茶粉面套餐: async function () {
        try {
          console.log('贡茶粉面套餐')
          let task = await knx('test_task_').select().where({ title: '贡茶粉面套餐', platform: '饿了么' })
          if (!task) return
          let [data, _] = await knx.raw(task[0].sql)
          data = data.map(v => [v.门店id, v.品名, null, 2, 29.6, 15.8])
          await loop(updatePlan, data, false)
        } catch (e) {
          console.error(e)
        }
      },
      除原价扣点加料价格: async function () {
        try {
          console.log('除原价扣点加料价格')
          let task = await knx('test_task_').select().where({ title: '除原价扣点加料价格', platform: '饿了么' })
          if (!task) return
          let [data, _] = await knx.raw(task[0].sql)
          data = data.map(v => [v.门店id, v.品名, null, 0, 6, null])
          await loop(updatePlan, data, false)
        } catch (e) {
          console.error(e)
        }
      },
      两份起购起购数: async function () {
        try {
          console.log('两份起购起购数')
          let task = await knx('test_task_').select().where({ title: '两份起购起购数', platform: '饿了么' })
          if (!task) return
          let [data, _] = await knx.raw(task[0].sql)
          data = data.map(v => [v.门店id, v.品名, 2, null, null, null])
          await loop(updatePlan, data, false)
        } catch (e) {
          console.error(e)
        }
      }
    }
    await tasks['原价扣点折扣价']()
    await tasks['两份起购餐盒费']()
    await tasks['两份起购无餐盒费']()
    await tasks['常规产品无餐盒费']()
    await tasks['非']()
    await tasks['原价餐盒凑起送']()
    await tasks['甜品粉面套餐']()
    await tasks['贡茶粉面套餐']()
    await tasks['除原价扣点加料价格']()
    await tasks['两份起购起购数']()
  } catch (error) {
    console.error(error)
  }
}

async function updateAttrs(id, name, props) {
  try {
    const app = new App(id)
    const food = await app.food.find(name)
    return app.food.updateFoodAttrs([food.id], props)
  } catch (e) {
    return Promise.reject(e)
  }
}

async function test_updateAttrs() {
  try {
    let [data, _] = await knx.raw(`SELECT * FROM ele_food_manage  WHERE DATE(insert_date) = CURDATE() 
      AND  (name LIKE '%草莓脏脏茶%' OR name LIKE '%芒果脏脏茶%') AND name NOT LIKE '%+%' ORDER BY shop_id`)
    const props = [
      { name: '温度', details: ['正常冰', '多冰', '少冰', '去冰'] },
      { name: '甜度', details: ['正常糖', '少糖', '半糖', '多糖'] }
    ]
    data = data.map(v => [v.shop_id, v.name, props])
    await loop(updateAttrs, data, false)
  } catch (error) {
    console.error(error)
  }
}

// console.log('auto task ...')
// let j = schedule.scheduleJob('0 2 * * *', async function (fireDate) {
//   console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date())
//   await test_autotask()
// })

// test_updateAttrs()
test_autotask()
// test_offsell()
// test_appeal()
// test_improve_low()
// test()
// test_plan()
// test_invalid_update()
// test_subsidy()
// test_loglow()
// test_improve_low()
// test_logAppeal()
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

test_plan()
// test_rename()
// test_acttime()
// test_offsell()
