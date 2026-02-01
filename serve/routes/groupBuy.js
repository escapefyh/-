const express = require('express');
const router = express.Router();
const { Goods, GroupBuy } = require('../db');

// 获取拼团信息接口
// GET /groupBuy/info
router.get('/info', async (req, res) => {
    try {
        const { goods_id } = req.query;

        // 1. 参数验证
        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 2. 验证商品是否存在
        const goods = await Goods.findOne({ goods_id: goods_id }).lean();
        if (!goods) {
            return res.status(200).json({
                msg: "error",
                error: "商品不存在"
            });
        }

        // 3. 查询该商品是否有正在进行的拼团（状态为 pending 且未过期）
        const currentTime = new Date().getTime();
        const activeGroupBuy = await GroupBuy.findOne({
            goods_id: goods_id,
            status: 'pending',
            expire_time: { $gt: currentTime } // 未过期
        }).sort({ create_time: -1 }) // 获取最新的拼团组
        .lean();

        // 4. 如果没有正在进行的拼团，返回 null
        if (!activeGroupBuy) {
            return res.json({
                msg: "success",
                data: null
            });
        }

        // 5. 返回拼团信息
        res.json({
            msg: "success",
            data: {
                group_id: activeGroupBuy.group_id,
                goods_id: activeGroupBuy.goods_id,
                current_count: activeGroupBuy.current_count,
                required_count: activeGroupBuy.required_count,
                expire_time: new Date(activeGroupBuy.expire_time).toISOString(),
                status: activeGroupBuy.status
            }
        });
    } catch (error) {
        console.log('获取拼团信息失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

module.exports = router;
