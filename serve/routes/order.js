const express = require('express');
const router = express.Router();
const { User, Goods } = require('../db');

// 单独购买接口
router.post('/create', async (req, res) => {
    try {
        const { user_id, goods_id, quantity = 1 } = req.body;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "商品ID不能为空"
            });
        }

        // 验证购买数量
        const quantityNum = parseInt(quantity);
        if (isNaN(quantityNum) || quantityNum < 1 || quantityNum > 999) {
            return res.status(200).json({
                msg: "error",
                error: "购买数量必须在1-999之间"
            });
        }

        // 2. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

        // 3. 查询商品信息
        const goods = await Goods.findOne({ goods_id: goods_id }).lean();
        if (!goods) {
            return res.status(200).json({
                msg: "error",
                error: "商品不存在"
            });
        }

        // 4. 生成订单ID
        const { v4: uuidv4 } = await import('uuid');
        const order_id = uuidv4();

        // 5. 更新商品销量（使用原子操作确保数据一致性）
        // 使用 $inc 操作符进行原子递增，避免并发问题
        await Goods.findOneAndUpdate(
            { goods_id: goods_id },
            { 
                $inc: { sales_count: quantityNum }
            }
        );

        // 6. 返回成功响应
        res.json({
            msg: "success",
            data: {
                order_id: order_id,
                message: "订单创建成功"
            }
        });
    } catch (error) {
        console.log('创建订单失败:', error);
        res.status(200).json({
            msg: "error",
            error: "创建失败"
        });
    }
});

module.exports = router;






