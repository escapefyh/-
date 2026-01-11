const express = require('express');
const router = express.Router();
const { User, Goods } = require('../db');

// 删除商品
router.post('/delete', async (req, res) => {
    try {
        const { goods_id, user_id } = req.body;

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

        // 2. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

        // 3. 查询商品是否存在
        const goods = await Goods.findOne({ goods_id: goods_id }).lean();
        if (!goods) {
            return res.status(200).json({
                msg: "error",
                error: "商品不存在"
            });
        }

        // 4. 验证权限：只能删除自己发布的商品
        if (goods.user_id !== user_id) {
            return res.status(200).json({
                msg: "error",
                error: "无权限删除"
            });
        }

        // 5. 删除商品（硬删除，因为已移除status字段）
        const deleteResult = await Goods.deleteOne({ goods_id: goods_id });

        if (deleteResult.deletedCount === 0) {
            return res.status(200).json({
                msg: "error",
                error: "删除失败"
            });
        }

        // 6. 返回成功响应
        res.json({
            msg: "success",
            data: {
                goods_id: goods_id,
                message: "商品删除成功"
            }
        });
    } catch (error) {
        console.log('删除商品失败:', error);
        res.status(200).json({
            msg: "error",
            error: "删除失败"
        });
    }
});

module.exports = router;

















