import instance, { urls } from './base.js'

export default class Food {
  constructor(shopId) {
    this.shopId = shopId
    this.headers = { 'x-shard': `shopid=${shopId}` }
  }

  updateFoodCatSeq(categoryOrders) {
    let data = {
      service: 'FoodService',
      method: 'setGroupPosition',
      params: {
        shopId: this.shopId,
        categoryOrders
      }
    }
    return instance.post(urls.food.updateFoodCatSeq, data, { headers: this.headers })
  }

  updateFoodCat() {
    let data = {
      service: 'FoodService',
      method: 'updateFirstGroup',
      params: {}
    }
  }

  listFoodCat() {
    let data = {
      service: 'FoodService',
      method: 'queryCategoryWithFoodFilter',
      params: {
        shopId: this.shopId,
        foodFilter: 0,
        XHR_TIMEOUT: 30000
      }
    }
    return instance.post(urls.food.listFoodCat, data, { headers: this.headers })
  }

  listFoods(categoryId) {
    let data = {
      service: 'FoodService',
      method: 'queryFoodsByCategoryIdWithFoodFilter',
      params: {
        foodFilter: 0,
        shopType: 1,
        shopId: this.shopId,
        foodQueryPage: {
          categoryId,
          limit: 500,
          offset: 0
        }
      }
    }
    return instance.post(urls.food.listFoods, data, { headers: this.headers })
  }

  search(keyWord) {
    let data = {
      service: 'FoodService',
      method: 'getItemForSearch',
      params: {
        request: {
          shopId: this.shopId,
          keyWord
        }
      }
    }
    return instance.post(urls.food.search, data, { headers: this.headers })
  }

  async searchFood(keyWord) {
    try {
      const res = await this.search(keyWord)
      return Promise.resolve(res.itemOfName)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async find(name) {
    try {
      let res = await this.search(name.replace(/简食-|-10元|'0元购---|右-上点亮关注下单,|收️❤️臧店铺/, ''))
      if (!res || !res.itemOfName) return Promise.reject({ err: 'food search failed' })
      const data = res.itemOfName.find(v => v.name == name)
      if (!data) return Promise.reject({ err: 'food not find' })
      return Promise.resolve(data)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async findInCats(name) {
    try {
      const cats = await this.listFoodCat()
      for (let cat of cats) {
        try {
          const foods = await this.listFoods(cat.id)
          const food = foods.find(v => v.name == name)
          if (food) return Promise.resolve(food)
        } catch (e) {
          return Promise.reject(e)
        }
      }
      return Promise.reject('food not found')
    } catch (e) {
      return Promise.reject(e)
    }
  }

  updateName(itemId, name) {
    let data = {
      service: 'FoodService',
      method: 'updateGoodsAttr',
      params: {
        updateGoodsAttr: {
          itemId,
          name,
          shopId: this.shopId
        }
      }
    }
    return instance.post(urls.food.updateAttr, data, { headers: this.headers })
  }

  updateMinPurchase(itemIds, minPurchaseQuantity) {
    let data = {
      service: 'BatchFoodService',
      method: 'batchUpdateFood',
      params: {
        shopId: this.shopId,
        batchFood: {
          itemIds,
          minPurchaseQuantity,
          unit: '份',
          updateFoodType: 'ITEM_UNIT_AND_MINPURCHASEQUANTITY'
        }
      }
    }
    return instance.post(urls.food.batchUpdate, data, { headers: this.headers })
  }

  updateFoodSpecs(itemId, sfoodSpecs) {
    let data = {
      service: 'FoodService',
      method: 'updateGoodsAttr',
      params: {
        updateGoodsAttr: {
          itemId,
          shopId: this.shopId,
          sfoodSpecs
        }
      }
    }
    return instance.post(urls.food.updateAttr, data, { headers: this.headers })
  }

  updateFoodAttrs(itemIds, properties) {
    let data = {
      service: 'BatchFoodService',
      method: 'batchUpdateFood',
      params: {
        shopId: this.shopId,
        batchFood: {
          updateFoodType: 'ITEM_PROPERTIES',
          itemIds,
          properties
        }
      }
    }
    return instance.post(urls.food.batchUpdate, data, { headers: this.headers })
  }

  updatePackageFee(foodId, foodSpecIds, packageFee) {
    let data = {
      service: 'FoodService',
      method: 'batchUpdatePackageFee',
      params: {
        shopId: this.shopId,
        packageFee,
        foodsWithSpecId: [{ foodId, foodSpecIds }]
      }
    }
    return instance.post(urls.food.bupdatePackageFee, data, { headers: this.headers })
  }

  updateSellStatus(foodId, foodSpecIds, isOnShelf) {
    let data = {
      service: 'FoodService',
      method: 'batchUpdateSellStatus',
      params: {
        isOnShelf,
        foodsWithSpecId: [{ foodId, foodSpecIds }]
      }
    }
    return instance.post(urls.food.bupdateSell, data, { headers: this.headers })
  }

  getFoodView(foodId) {
    let data = {
      service: 'FoodService',
      method: 'getFoodView',
      params: {
        filter: 0,
        foodId
      }
    }
    return instance.post(urls.food.getFoodView, data, { headers: this.headers })
  }

  editFood(foodId, update) {
    let data = {
      service: 'FoodService',
      method: 'updateFood',
      params: {
        foodId,
        update
      }
    }
    return instance.post(urls.food.editFood, data, { headers: this.headers })
  }

  listForOptimize() {
    let data = {
      service: 'AssistantService',
      method: 'queryWaitForOptimizeItem',
      params: {
        itemDistributionQuery: { shopId: this.shopId }
      }
    }
    return instance.post(urls.food.forOptimize, data, { headers: this.headers })
  }

  listCategoryModels() {
    let data = {
      service: 'CategoryService',
      method: 'getCategoryList',
      params: {
        request: {
          includeProperties: false,
          shopId: this.shopId
        }
      }
    }
    return instance.post(urls.food.categoryModels, data, { headers: this.headers })
  }

  async findCategoryModel(cateName) {
    try {
      const { categoryList } = await this.listCategoryModels()
      if (!categoryList) return Promise.reject({ err: 'catemodels failed' })

      const root = { name: 'root', children: categoryList }

      const path = find(root, cateName, [])
      if (!path) return Promise.reject({ err: 'cate not found' })
      const categoryModel = path.reduceRight((s, v) => ({ ...v, children: [s] }))

      return Promise.resolve(categoryModel)
    } catch (err) {
      return Promise.reject(err)
    }

    function find(node, name, path) {
      if (node.children.length == 0) {
        if (node.name == name) {
          return path
        } else {
          path.splice(0, path.length)
          return null
        }
      } else {
        for (let child of node.children) {
          let n = find(child, name, [...path, child])
          if (n) return n
        }
      }
      return null
    }
  }

  updateFoodDesc(foodId, description) {
    let data = {
      service: 'BatchFoodService',
      method: 'batchUpdateFood',
      params: {
        batchFood: { itemIds: [foodId], description, updateFoodType: 'ITEM_DESCRIPTION' },
        shopId: this.shopId
      }
    }
    return instance.post(urls.food.batchUpdate, data, { headers: this.headers })
  }

  getMaterialTree() {
    let data = {
      service: 'MenuDataService',
      method: 'getMaterialTreeByShopId',
      params: { shopId: this.shopId }
    }
    return instance.post(urls.food.getMaterialTree, data, { headers: this.headers })
  }

  async findMaterial(name) {
    try {
      const materials = await this.getMaterialTree()
      const root = { name: 'root', children: materials, leaf: 0 }
      let f = find(root, name)
      if (!f) return Promise.reject({ err: 'material not found' })
      return Promise.resolve(f)
    } catch (e) {
      return Promise.reject(e)
    }

    function find(node, name) {
      if (node.children.length == 0) {
        if (node.name == name) {
          return node
        } else {
          return null
        }
      } else {
        for (let child of node.children) {
          let n = find(child, name)
          if (n) return n
        }
      }
      return null
    }
  }

  appeal(auditItem) {
    let data = {
      service: 'IllegalItemService',
      method: 'appealForControl',
      params: {
        shopId: this.shopId,
        auditItem
      }
    }
    return instance.post(urls.food.appeal, data, { headers: this.headers })
  }

  neverAppeal(auditItem) {
    let data = {
      service: 'IllegalItemService',
      method: 'neverShowAuditTips',
      params: {
        shopId: this.shopId,
        auditItem
      }
    }
    return instance.post(urls.food.neverAppeal, data, { headers: this.headers })
  }

  batchRemove(foodsWithSpecId) {
    let data = {
      service: 'FoodService',
      method: 'batchRemoveFoods',
      params: {
        filter: 0,
        foodsWithSpecId,
        shopId: this.shopId
      }
    }
    return instance.post(urls.food.batchRemove, data, { headers: this.headers })
  }
}
