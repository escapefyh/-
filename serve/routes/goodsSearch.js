const express = require('express');
const router = express.Router();
const { User, Goods } = require('../db');

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

// 商品搜索接口
router.get('/search', async (req, res) => {
    try {
        const { keyword, page = 1, pageSize = 20 } = req.query;

        // 1. 参数验证
        if (!keyword || !keyword.trim()) {
            return res.status(400).json({
                msg: "error",
                error: "搜索关键词不能为空"
            });
        }

        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;

        if (pageNum < 1) {
            return res.status(400).json({
                msg: "error",
                error: "页码必须大于0"
            });
        }

        if (pageSizeNum < 1 || pageSizeNum > 100) {
            return res.status(400).json({
                msg: "error",
                error: "每页数量必须在1-100之间"
            });
        }

        const skip = (pageNum - 1) * pageSizeNum;
        const limit = pageSizeNum;

        // 2. 搜索商品（对商品描述进行模糊匹配）
        const searchKeyword = keyword.trim();
        const goodsList = await Goods.find({
            description: { $regex: searchKeyword, $options: 'i' } // 不区分大小写的模糊匹配
        })
            .sort({ create_time: -1 }) // 按创建时间倒序（最新在前）
            .skip(skip)
            .limit(limit)
            .lean();

        // 3. 获取所有卖家ID
        const userIds = [...new Set(goodsList.map(g => g.user_id))];

        // 4. 批量查询卖家信息（使用 lean() 提高性能）
        const sellers = await User.find({ user_id: { $in: userIds } }).lean();
        const sellerMap = {};
        sellers.forEach(seller => {
            sellerMap[seller.user_id] = {
                user_id: seller.user_id,
                name: seller.name || '',
                nickname: seller.nickname || '',
                phone: seller.phone || '',
                avatar: seller.avatar || ''
            };
        });

        // 5. 组装返回数据
        const result = goodsList.map(goods => {
            // 处理图片URL，确保返回完整的OSS URL
            const processedImages = processImageUrls(goods.images);
            
            return {
                goods_id: goods.goods_id,
                user_id: goods.user_id,
                images: processedImages,
                description: goods.description,
                price: goods.price,
                category_id: goods.category_id,
                sales_count: goods.sales_count || 0,
                group_buy_enabled: goods.group_buy_enabled || false,
                group_buy_count: goods.group_buy_count || null,
                group_buy_discount: goods.group_buy_discount || null,
                create_time: goods.create_time,
                seller: sellerMap[goods.user_id] || {} // 如果用户不存在，返回空对象
            };
        });

        // 6. 获取总数
        const total = await Goods.countDocuments({
            description: { $regex: searchKeyword, $options: 'i' }
        });

        res.json({
            msg: "success",
            data: {
                list: result,
                total: total
            }
        });
    } catch (error) {
        console.log('搜索商品失败:', error);
        res.status(500).json({
            msg: "error",
            error: error.message || "服务器错误"
        });
    }
});

module.exports = router;


