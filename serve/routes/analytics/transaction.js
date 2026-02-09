const express = require('express');
const router = express.Router();
const { Order, Goods } = require('../../db');

// 分类ID到分类名称的映射（与 goods.js 保持一致）
const getCategoryName = (categoryId) => {
  const categoryMap = {
    1: '美食生鲜',
    2: '美妆个护',
    3: '家居百货',
    4: '数码家电',
    5: '服饰鞋包',
    6: '母婴用品',
    7: '运动户外',
    8: '图书文娱',
    9: '宠物用品',
    10: '食品保健',
    11: '汽车用品',
    12: '办公文具',
    13: '其他用品'
  };
  return categoryMap[categoryId] || '未知分类';
};

// 获取指定时间范围内有效订单（已支付及之后的状态）
const getPaidOrdersInRange = async (startTime) => {
  const successStatuses = ['paid', 'shipped', 'review', 'completed'];

  // 使用支付时间为主，如果没有支付时间则使用创建时间
  const query = {
    status: { $in: successStatuses },
    $or: [
      { pay_time: { $gte: startTime } },
      {
        pay_time: null,
        create_time: { $gte: startTime }
      }
    ]
  };

  return await Order.find(query).lean();
};

// 交易额 / 订单量走势
// GET /analytics/transaction/trend?days=7
router.get('/trend', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days) || 7;

    const now = Date.now();
    const startTime = now - daysNum * 24 * 60 * 60 * 1000;

    // 获取时间范围内的有效订单
    const orders = await getPaidOrdersInRange(startTime);

    // 初始化日期 map
    const dateMapAmount = {};
    const dateMapCount = {};

    for (let i = daysNum - 1; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dateMapAmount[dateStr] = 0;
      dateMapCount[dateStr] = 0;
    }

    // 按日期统计
    orders.forEach((order) => {
      const ts = order.pay_time || order.create_time;
      const date = new Date(ts);
      const dateStr = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (dateMapAmount[dateStr] !== undefined) {
        const amount = Number(order.total_price) || 0;
        dateMapAmount[dateStr] += amount;
        dateMapCount[dateStr] += 1;
      }
    });

    const dates = Object.keys(dateMapAmount);
    const amount = dates.map((d) =>
      Number(dateMapAmount[d].toFixed(2))
    );
    const count = dates.map((d) => dateMapCount[d]);

    res.status(200).json({
      msg: 'success',
      data: {
        dates,
        amount,
        count
      }
    });
  } catch (error) {
    console.log('获取交易走势失败:', error);
    res.status(200).json({
      msg: 'error',
      error: '获取交易走势失败'
    });
  }
});

// 分类销售占比（按交易额）
// GET /analytics/transaction/category-share?days=7
router.get('/category-share', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days) || 7;

    const now = Date.now();
    const startTime = now - daysNum * 24 * 60 * 60 * 1000;

    // 获取时间范围内的有效订单
    const orders = await getPaidOrdersInRange(startTime);

    if (orders.length === 0) {
      return res.status(200).json({
        msg: 'success',
        data: []
      });
    }

    // 获取涉及到的商品信息
    const goodsIds = [...new Set(orders.map((o) => o.goods_id))];
    const goodsList = await Goods.find({
      goods_id: { $in: goodsIds }
    }).lean();
    const goodsMap = {};
    goodsList.forEach((g) => {
      goodsMap[g.goods_id] = g;
    });

    // 统计每个分类的交易额和订单量
    const categoryMap = {};
    orders.forEach((order) => {
      const goods = goodsMap[order.goods_id];
      if (!goods) return;

      const categoryId = goods.category_id || 0;
      const key = String(categoryId);

      if (!categoryMap[key]) {
        categoryMap[key] = {
          category_id: categoryId,
          category_name: getCategoryName(categoryId),
          total_amount: 0,
          order_count: 0
        };
      }

      const amount = Number(order.total_price) || 0;
      categoryMap[key].total_amount += amount;
      categoryMap[key].order_count += 1;
    });

    const list = Object.values(categoryMap).map((item) => ({
      ...item,
      total_amount: Number(item.total_amount.toFixed(2))
    }));

    // 计算占比（按交易额）
    const totalAmount = list.reduce(
      (sum, item) => sum + item.total_amount,
      0
    );
    const result = list.map((item) => ({
      ...item,
      percentage:
        totalAmount > 0
          ? Number(((item.total_amount / totalAmount) * 100).toFixed(2))
          : 0
    }));

    res.status(200).json({
      msg: 'success',
      data: result
    });
  } catch (error) {
    console.log('获取分类销售占比失败:', error);
    res.status(200).json({
      msg: 'error',
      error: '获取分类销售占比失败'
    });
  }
});

module.exports = router;


