const express = require('express');
const router = express.Router();
const { User, Goods } = require('../db');

// 将时间戳转换为格式化的日期时间字符串
const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 更新商品价格
router.post('/update', async (req, res) => {
    try {
        const { goods_id, user_id, price } = req.body;

        // 1. 参数验证
        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

        // 2. 价格验证
        if (price === undefined || price === null || price === '') {
            return res.status(200).json({
                msg: "error",
                error: "价格不能为空"
            });
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum)) {
            return res.status(200).json({
                msg: "error",
                error: "价格格式错误"
            });
        }

        if (priceNum < 0) {
            return res.status(200).json({
                msg: "error",
                error: "价格不能为负数"
            });
        }

        if (priceNum > 999999.99) {
            return res.status(200).json({
                msg: "error",
                error: "价格超过上限"
            });
        }

        // 保留2位小数
        const finalPrice = parseFloat(priceNum.toFixed(2));

        // 3. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

        // 4. 查询商品是否存在
        const goods = await Goods.findOne({ goods_id: goods_id }).lean();
        if (!goods) {
            return res.status(200).json({
                msg: "error",
                error: "商品不存在"
            });
        }

        // 5. 验证权限：只能修改自己发布的商品
        if (goods.user_id !== user_id) {
            return res.status(200).json({
                msg: "error",
                error: "无权限修改"
            });
        }

        // 6. 检查价格是否发生变化
        if (goods.price === finalPrice) {
            // 价格未变化，仍然返回成功（可选：也可以返回"价格未发生变化"错误）
            return res.json({
                msg: "success",
                data: {
                    goods_id: goods_id,
                    price: finalPrice,
                    updated_at: formatDateTime(goods.update_time || goods.create_time),
                    message: "商品价格更新成功"
                }
            });
        }

        // 7. 更新商品价格和更新时间
        const currentTime = new Date().getTime();
        const updateResult = await Goods.updateOne(
            { goods_id: goods_id, user_id: user_id },
            {
                $set: {
                    price: finalPrice,
                    update_time: currentTime
                }
            }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(200).json({
                msg: "error",
                error: "更新失败"
            });
        }

        // 8. 返回成功响应
        res.json({
            msg: "success",
            data: {
                goods_id: goods_id,
                price: finalPrice,
                updated_at: formatDateTime(currentTime),
                message: "商品价格更新成功"
            }
        });
    } catch (error) {
        console.log('更新商品价格失败:', error);
        res.status(200).json({
            msg: "error",
            error: "更新失败"
        });
    }
});

module.exports = router;

















