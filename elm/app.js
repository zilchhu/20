import Food from './food.js'
import Act from './act.js'
import Shop from './shop.js'
import sleep from 'sleep-promise'

import log from './log/log.js'
import xls2Json from 'xls-to-json'
import util from 'util'
import fs from 'fs'

const axls2Json = util.promisify(xls2Json)

export default class App {
  constructor(shopId) {
    this.food = new Food(shopId)
    this.act = new Act(shopId)
    this.shop = new Shop(shopId)
  }
}

export async function wrap(f, meta) {
  try {
    console.log(...meta)
    const res = await f(...meta)
    console.log(res)
  } catch (err) {
    console.error(err)
    log({meta, err})
  }
}

export async function loop(f, dataSource, slow) {
  try {
    let count = dataSource.length
    for(let data of dataSource) {
      console.log(count)
      await wrap(f, data)
      if(slow) await sleep(4000)
      count -= 1
    }
  } catch (err) {
    console.error(err)
  }
}

export async function readXls(path, sheet) {
  try {
    let res = await axls2Json({
      input: `${path}`,
      sheet,
      output: `${path}.json`
    })
    return res
  } catch (err) {
    console.error(err)
    return null
  }
}

export function readJson(path) {
  return JSON.parse(fs.readFileSync(path))
}