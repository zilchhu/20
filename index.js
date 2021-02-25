import apollo from 'apollo-server'
import gql_import from 'graphql-import-files'
import resolvers from './resolver/resolver.js'

const { ApolloServer } = apollo
const { loadFiles } = gql_import

const server = new ApolloServer({
  typeDefs: loadFiles('**/schema/**/*.{graphql,gql}'), // Use the glob pattern to find multiple files
  resolvers
})

server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`Running on ${url}`)
})


// "actName": "集点返券",
//                 "beginTime": parseInt(new Date(format(beginTime, 'YYYY/MM/DD 00:00:00')) / 1000),
//                 "endTime": parseInt(new Date(format(endTime, 'YYYY/MM/DD 23:59:59')) / 1000),
//                 "actSkus": actSkus,
//                 "countDetail": {
//                     "customType": customType, //新老客设置外卖用户类型：0不限制,1新用户,2老用户
//                     "productPriceMax": taskMaxSkuPrice * 100, //价格区间最高价格。
//                     "productPriceMin": taskMinSkuPrice * 100,  //价格区间最低价格
//                     "sendCondition": taskCount,
//                     // 发券类型：0=满减券（按门店），1=商品券满减券,2=商品折扣券（包含0折兑换券）
//                     "sendCouponType": this.sendCouponType(),
//                     "taskProductType": taskSkuType,// 按商品数的商品类型（taskType=1时有效）0=价格区间，1:sku
//                     "taskType": taskType,    //集点类型：0=按订单数，1=按商品数，(2=分享，3=收藏，4=...技术预埋)
//                     "taskValidDays": taskValidDays //任务有效期（单位天）
//                 },
//                 "couponSkus": couponSkus,
//                 "coupons": [
//                     {
//                         "day": couponValidDays, //有效期 天
//                         "discount": skuCouponDiscountType !== 1 ? skuCouponDiscount * 1000 : undefined,  //折扣 8000=8折
//                         "isGetToShop": 1,//到店自取
//                         "limitPrice": 0, //门槛
//                         "price": (fdCouponPrice || skuCouponPrice) * 100,//减多少金额【满减型,单位分】
//                         "useCouponTimeType": 1
//                     }
//                 ],