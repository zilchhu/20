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
      let res = await this.search(name)
      if (!res || !res.itemOfName) return Promise.reject({ err: 'food search failed' })
      const data = res.itemOfName.find(v => v.name == name)
      if (!data) return Promise.reject({ err: 'food not find' })
      return Promise.resolve(data)
    } catch (err) {
      return Promise.reject(err)
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
    return instance.post(urls.food.listCategoryModels, data, { headers: this.headers })
  }

  async findCategoryModel(types) {
    try {
      const { categoryList } = await this.listCategoryModels()
      if (!categoryList) return Promise.reject({ err: 'catemodels failed' })
    } catch (err) {
      return Promise.reject(err)
    }

    function find(node, val, track) {
      if (node.leaf) {
        if (node.name == val) {
        }
      }

      for (let child of node.children) {
        if (find(child, val, track)) {
        }
      }
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
}