const express = require('express');
const router = express.Router();
const { User, Goods, Comment, Order } = require('../db');

// 格式化时间戳为 YYYY-MM-DD HH:mm:ss 格式
const formatDateTime = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 处理图片URL，确保返回完整的OSS URL
const processImageUrls = (images) => {
    if (!images || !Array.isArray(images)) {
        return [];
    }
    
    return images.map(img => {
        // 如果已经是完整URL，直接返回
        if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
            return img;
        }
        // 如果是相对路径，拼接OSS域名
        const ossDomain = process.env.OSS_DOMAIN || '';
        if (ossDomain && typeof img === 'string') {
            const path = img.startsWith('/') ? img.substring(1) : img;
            return `${ossDomain}/${path}`;
        }
        return img;
    });
};

// 评论列表接口
// GET /comment/list
router.get('/list', async (req, res) => {
    try {
        const { goods_id, page = 1, pageSize = 10 } = req.query;

        // 1. 参数验证
        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 分页参数验证
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 10;

        if (pageNum < 1) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        if (pageSizeNum < 1 || pageSizeNum > 100) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        const skip = (pageNum - 1) * pageSizeNum;
        const limit = pageSizeNum;

        // 2. 查询评论列表（按创建时间倒序）
        const comments = await Comment.find({ goods_id: goods_id })
            .sort({ create_time: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 3. 获取所有用户ID
        const userIds = [...new Set(comments.map(c => c.user_id))];

        // 4. 批量查询用户信息
        const users = await User.find({ user_id: { $in: userIds } }).lean();
        const userMap = {};
        users.forEach(user => {
            userMap[user.user_id] = user;
        });

        // 5. 组装返回数据
        const result = comments.map(comment => {
            const user = userMap[comment.user_id];
            
            // 处理评价图片
            let images = [];
            if (comment.images) {
                try {
                    const parsedImages = JSON.parse(comment.images);
                    if (Array.isArray(parsedImages)) {
                        images = processImageUrls(parsedImages);
                    }
                } catch (e) {
                    // 如果解析失败，尝试作为单个URL处理
                    if (typeof comment.images === 'string') {
                        images = processImageUrls([comment.images]);
                    }
                }
            }

            return {
                comment_id: parseInt(comment.comment_id) || comment.comment_id,
                goods_id: parseInt(comment.goods_id) || comment.goods_id,
                order_id: parseInt(comment.order_id) || comment.order_id,
                user_id: parseInt(comment.user_id) || comment.user_id,
                user_nickname: user ? (user.nickname || user.name || '匿名用户') : '匿名用户',
                user_avatar: user ? (user.avatar || '') : '',
                rating: comment.rating || 5,
                content: comment.content || '',
                images: images,
                create_time: formatDateTime(comment.create_time),
                is_auto: comment.is_auto || false
            };
        });

        // 6. 获取评论总数
        const total = await Comment.countDocuments({ goods_id: goods_id });

        res.json({
            msg: "success",
            data: {
                list: result,
                total: total,
                page: pageNum,
                pageSize: pageSizeNum
            }
        });
    } catch (error) {
        console.log('获取评论列表失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取评论列表失败"
        });
    }
});

// 创建评论接口
// POST /comment/create
router.post('/create', async (req, res) => {
    try {
        const { user_id, goods_id, order_id, rating, content, images, is_auto = false } = req.body;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
            });
        }

        if (!goods_id || !order_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 2. 验证评价内容
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "评价内容不能为空"
            });
        }

        if (content.length > 500) {
            return res.status(200).json({
                msg: "error",
                error: "评价内容不能超过500字符"
            });
        }

        // 3. 验证评价星级
        const ratingNum = parseInt(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(200).json({
                msg: "error",
                error: "评价星级必须在1-5之间"
            });
        }

        // 4. 验证图片数量
        let imageArray = [];
        if (images) {
            if (Array.isArray(images)) {
                imageArray = images.slice(0, 3); // 最多3张
            } else if (typeof images === 'string') {
                try {
                    const parsed = JSON.parse(images);
                    if (Array.isArray(parsed)) {
                        imageArray = parsed.slice(0, 3);
                    } else {
                        imageArray = [images].slice(0, 3);
                    }
                } catch (e) {
                    imageArray = [images].slice(0, 3);
                }
            }
        }

        if (imageArray.length > 3) {
            return res.status(200).json({
                msg: "error",
                error: "评价图片不能超过3张"
            });
        }

        // 5. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 6. 验证订单是否存在
        const order = await Order.findOne({ order_id: order_id }).lean();
        if (!order) {
            return res.status(200).json({
                msg: "error",
                error: "订单不存在"
            });
        }

        // 7. 验证订单状态（必须是 review 待评价状态）
        if (order.status !== 'review') {
            return res.status(200).json({
                msg: "error",
                error: "订单状态不正确，无法评价"
            });
        }

        // 8. 验证用户权限（评价的用户必须是订单的买家）
        if (order.user_id !== user_id) {
            return res.status(200).json({
                msg: "error",
                error: "无权限评价此订单"
            });
        }

        // 9. 验证订单是否已有评价
        const existingComment = await Comment.findOne({ order_id: order_id }).lean();
        if (existingComment) {
            return res.status(200).json({
                msg: "error",
                error: "该订单已评价，无法重复评价"
            });
        }

        // 10. 验证商品ID是否匹配
        if (order.goods_id !== goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "商品ID不匹配"
            });
        }

        // 11. 生成评论ID
        const { v4: uuidv4 } = await import('uuid');
        const commentId = uuidv4();
        const currentTime = new Date().getTime();

        // 12. 创建评论并更新订单状态为 completed（已完成）
        // 使用原子操作确保评论创建和订单状态更新的一致性
        await Comment.create({
            comment_id: commentId,
            goods_id: goods_id,
            order_id: order_id,
            user_id: user_id,
            rating: ratingNum,
            content: content.trim(),
            images: JSON.stringify(imageArray),
            is_auto: is_auto || false,
            create_time: currentTime,
            update_time: currentTime
        });

        // 13. 更新订单状态为 completed（已完成），并设置 complete_time
        const orderUpdateResult = await Order.findOneAndUpdate(
            {
                order_id: order_id,
                status: 'review'  // 确保状态仍然是 review，防止并发问题
            },
            {
                $set: {
                    status: 'completed',  // 评价后状态更新为 completed
                    complete_time: currentTime,  // 设置订单完成时间
                    update_time: currentTime
                }
            },
            { new: true }
        ).lean();

        if (!orderUpdateResult) {
            // 如果订单更新失败，删除已创建的评论（由于没有事务，这里只能尝试删除）
            await Comment.deleteOne({ comment_id: commentId });
            return res.status(200).json({
                msg: "error",
                error: "订单状态更新失败，请重试"
            });
        }

        // 14. 返回成功响应
        res.json({
            msg: "success",
            data: {
                comment_id: commentId,
                order_id: order_id,
                status: "completed",
                create_time: formatDateTime(currentTime)
            }
        });
    } catch (error) {
        console.log('创建评论失败:', error);
        
        // 处理唯一索引冲突（重复评价）
        if (error.code === 11000 || error.message && error.message.includes('duplicate key')) {
            return res.status(200).json({
                msg: "error",
                error: "该订单已评价，无法重复评价"
            });
        }

        res.status(200).json({
            msg: "error",
            error: "创建评论失败"
        });
    }
});

module.exports = router;


