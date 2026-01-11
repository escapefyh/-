const express = require('express');
const router = express.Router();
const { User, Goods, Favorite } = require('../db');

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
        // 如果是相对路径，拼接OSS域名（这种情况不应该发生，因为上传时已经返回完整URL）
        // 但为了兼容性，保留此逻辑
        const ossDomain = process.env.OSS_DOMAIN || '';
        if (ossDomain && typeof img === 'string') {
            // 确保路径格式正确
            const path = img.startsWith('/') ? img.substring(1) : img;
            return `${ossDomain}/${path}`;
        }
        return img;
    });
};

// 获取收藏状态与收藏数
router.get('/getStatus', async (req, res) => {
    try {
        const { goods_id, user_id } = req.query;

        // 1. 参数验证
        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "goods_id不能为空"
            });
        }

        // 2. 验证商品是否存在
        const goods = await Goods.findOne({ goods_id: goods_id }).lean();
        if (!goods) {
            return res.status(200).json({
                msg: "error",
                error: "goods not found"
            });
        }

        // 3. 统计收藏总数
        const count = await Favorite.countDocuments({
            goods_id: goods_id
        });

        // 4. 如果提供了user_id，查询该用户是否已收藏
        let is_favorited = false;
        if (user_id) {
            const existingFavorite = await Favorite.findOne({
                user_id: user_id,
                goods_id: goods_id
            }).lean();
            is_favorited = !!existingFavorite;
        }

        // 5. 返回成功响应
        res.json({
            msg: "success",
            data: {
                count: count,
                is_favorited: is_favorited
            }
        });
    } catch (error) {
        console.log('获取收藏状态失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

// 切换收藏状态
router.post('/toggle', async (req, res) => {
    try {
        const { user_id, goods_id } = req.body;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "invalid user_id or goods_id"
            });
        }

        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "invalid user_id or goods_id"
            });
        }

        // 2. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "invalid user_id or goods_id"
            });
        }

        // 3. 验证商品是否存在
        const goods = await Goods.findOne({ goods_id: goods_id }).lean();
        if (!goods) {
            return res.status(200).json({
                msg: "error",
                error: "invalid user_id or goods_id"
            });
        }

        // 4. 检查是否已收藏
        const existingFavorite = await Favorite.findOne({
            user_id: user_id,
            goods_id: goods_id
        }).lean();

        const currentTime = new Date().getTime();
        let isFavorited;

        if (existingFavorite) {
            // 已收藏，执行取消收藏操作（物理删除）
            await Favorite.deleteOne({
                user_id: user_id,
                goods_id: goods_id
            });
            isFavorited = false;
        } else {
            // 未收藏，执行收藏操作
            // 动态导入 uuid
            const { v4: uuidv4 } = await import('uuid');
            await Favorite.create({
                favorite_id: uuidv4(),
                user_id: user_id,
                goods_id: goods_id,
                create_time: currentTime
            });
            isFavorited = true;
        }

        // 5. 获取更新后的收藏总数
        const count = await Favorite.countDocuments({
            goods_id: goods_id
        });

        // 6. 返回成功响应
        res.json({
            msg: "success",
            data: {
                is_favorited: isFavorited,
                count: count
            }
        });
    } catch (error) {
        console.log('切换收藏状态失败:', error);
        // 如果是唯一索引冲突（理论上不应该发生，因为我们已经检查过了）
        if (error.code === 11000) {
            return res.status(200).json({
                msg: "error",
                error: "invalid user_id or goods_id"
            });
        }
        res.status(200).json({
            msg: "error",
            error: "invalid user_id or goods_id"
        });
    }
});

// 获取"我的收藏"列表
router.get('/list', async (req, res) => {
    try {
        const { user_id, page = 1, pageSize = 10 } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

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

        // 2. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

        const skip = (pageNum - 1) * pageSizeNum;
        const limit = pageSizeNum;

        // 3. 查询当前用户的收藏记录（获取goods_id列表）
        const favoriteList = await Favorite.find({ user_id: user_id })
            .sort({ create_time: -1 }) // 按收藏时间倒序（最新在前）
            .skip(skip)
            .limit(limit)
            .lean();

        // 4. 获取所有商品ID
        const goodsIds = favoriteList.map(f => f.goods_id);

        // 5. 批量查询商品信息
        const goodsList = await Goods.find({ goods_id: { $in: goodsIds } }).lean();

        // 6. 获取所有卖家ID
        const userIds = [...new Set(goodsList.map(g => g.user_id))];

        // 7. 批量查询卖家信息
        const sellers = await User.find({ user_id: { $in: userIds } }).lean();
        const sellerMap = {};
        sellers.forEach(seller => {
            sellerMap[seller.user_id] = {
                user_id: seller.user_id,
                nickname: seller.nickname || '',
                name: seller.name || ''
            };
        });

        // 8. 组装返回数据（保持与商品列表接口一致的结构）
        const result = goodsList.map(goods => {
            // 处理图片URL，确保返回完整的OSS URL
            const processedImages = processImageUrls(goods.images);
            
            return {
                goods_id: goods.goods_id,
                description: goods.description,
                price: goods.price,
                images: processedImages,
                group_buy_enabled: goods.group_buy_enabled || false,
                sales_count: goods.sales_count || 0,
                seller: sellerMap[goods.user_id] || {
                    user_id: goods.user_id,
                    nickname: '',
                    name: ''
                }
            };
        });

        // 9. 获取总数
        const total = await Favorite.countDocuments({ user_id: user_id });

        // 10. 返回成功响应
        res.json({
            msg: "success",
            data: {
                list: result,
                total: total
            }
        });
    } catch (error) {
        console.log('获取收藏列表失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

module.exports = router;

