const express = require('express');
const router = express.Router();
const { User, BrowseHistory } = require('../db');

// 获取历史浏览数量
router.get('/count', async (req, res) => {
    try {
        const { user_id } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
            });
        }

        // 2. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 3. 统计历史浏览数量
        // 根据文档说明，可以只统计最近30天的浏览记录，或者统计所有浏览记录
        // 这里统计所有浏览记录
        const count = await BrowseHistory.countDocuments({
            user_id: user_id
        });

        // 4. 返回成功响应
        res.json({
            msg: "success",
            data: {
                count: count
            }
        });
    } catch (error) {
        console.log('获取历史浏览数量失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

module.exports = router;



