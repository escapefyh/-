const express = require('express');
const router = express.Router();
const { User, Goods, Comment, Favorite, SpecOption } = require('../db');

// 处理图片URL，确保返回完整的OSS URL
// 修改 routes/goods.js 中的 processImageUrls 函数

const processImageUrls = (images) => {
    // 1. 如果是空，直接返回空数组
    if (!images) return [];

    let imageList = [];

    // 2. 如果是数组，直接使用
    if (Array.isArray(images)) {
        imageList = images;
    } 
    // 3. 关键修复：如果是字符串，尝试解析 JSON 或作为单图处理
    else if (typeof images === 'string') {
        try {
            // 尝试解析 JSON 字符串，例如 '["url1", "url2"]'
            const parsed = JSON.parse(images);
            if (Array.isArray(parsed)) {
                imageList = parsed;
            } else {
                imageList = [images];
            }
        } catch (e) {
            // 解析失败，说明是普通 URL 字符串
            imageList = [images];
        }
    } else {
        return [];
    }

    // 4. 对提取出的 URL 列表进行处理（拼接 OSS 域名等）
    return imageList.map(img => {
        if (!img) return '';
        // 如果已经是完整 URL，直接返回
        if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
            return img;
        }
        // 如果是相对路径，拼接 OSS 域名
        const ossDomain = process.env.OSS_DOMAIN || '';
        if (ossDomain && typeof img === 'string') {
            const path = img.startsWith('/') ? img.substring(1) : img;
            return `${ossDomain}/${path}`;
        }
        return img;
    });
};

// 分类ID到分类名称的映射
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

// 处理头像URL，确保返回有效的URL
// 根据文档要求：如果用户未设置头像，返回相对路径 /assets/default_avatar.png
// 禁止返回示例URL（如 your-domain.com、example.com），否则会导致403错误
const processAvatarUrl = (avatar) => {
    // 如果头像为空、null或空字符串，返回相对路径（方式2）
    if (!avatar || avatar.trim() === '') {
        return '/assets/default_avatar.png';
    }
    
    // 如果已经是完整URL，检查是否是示例URL
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        // 检查是否是示例URL，如果是则返回相对路径
        if (avatar.includes('your-domain.com') || avatar.includes('example.com')) {
            return '/assets/default_avatar.png';
        }
        return avatar;
    }
    
    // 如果是相对路径，直接返回
    if (avatar.startsWith('/')) {
        return avatar;
    }
    
    // 其他情况，返回相对路径
    return '/assets/default_avatar.png';
};

// 获取商品详情（包含卖家信息）
router.get('/detail', async (req, res) => {
    try {
        const { goods_id } = req.query;

        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "商品ID不能为空"
            });
        }

        // 查询商品信息（使用 lean() 提高性能）
        const goods = await Goods.findOne({ goods_id: goods_id }).lean();
        if (!goods) {
            return res.status(200).json({
                msg: "error",
                error: "商品不存在"
            });
        }

        // 查询卖家信息（使用 lean() 提高性能）
        const seller = await User.findOne({ user_id: goods.user_id }).lean();
        
        // 如果卖家不存在，返回错误
        if (!seller) {
            return res.status(200).json({
                msg: "error",
                error: "卖家信息不存在"
            });
        }

        // 处理图片URL，确保返回完整的OSS URL
        const processedImages = processImageUrls(goods.images);
        
        // 处理头像URL，确保始终返回完整的URL
        const processedAvatar = processAvatarUrl(seller.avatar);

        // 查询规格数据（如果商品开启了规格）
        let specsData = null;
        if (goods.spec_enabled) {
            const specOptions = await SpecOption.find({ goods_id: goods_id })
                .sort({ sort_order: 1 })
                .lean();
            
            if (specOptions && specOptions.length > 0) {
                specsData = specOptions.map(spec => ({
                    spec_id: spec.spec_option_id, // 使用 spec_option_id 作为 spec_id
                    name: spec.name,
                    price: spec.price,
                    stock: spec.stock
                }));
            } else {
                // 如果开启了规格但没有规格数据，返回空数组
                specsData = [];
            }
        }

        // 返回商品详情和卖家信息
        res.json({
            msg: "success",
            data: {
                goods: {
                    goods_id: goods.goods_id,
                    user_id: goods.user_id,
                    images: processedImages, // 使用处理后的图片URL
                    description: goods.description,
                    price: goods.price,
                    category_id: goods.category_id,
                    sales_count: goods.sales_count || 0,
                    spec_enabled: goods.spec_enabled || false,
                    specs: specsData, // 规格数据：开启规格时返回数组，未开启时返回 null
                    group_buy_enabled: goods.group_buy_enabled || false,
                    group_buy_count: goods.group_buy_count || null,
                    group_buy_discount: goods.group_buy_discount || null,
                    create_time: goods.create_time
                },
                seller: {
                    user_id: seller.user_id || '',
                    nickname: seller.nickname || '',
                    name: seller.name || '',
                    avatar: processedAvatar // 确保avatar始终有值且是完整URL
                }
            }
        });
    } catch (error) {
        console.log('获取商品详情失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

// 获取商品列表（包含卖家信息，支持分类筛选和搜索）
router.get('/list', async (req, res) => {
    try {
        const { page = 1, pageSize = 20, category_id, keyword, seller_id } = req.query;

        // 1. 参数验证
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;

        if (pageNum < 1) {
            return res.status(200).json({
                msg: "error",
                error: "页码必须大于0"
            });
        }

        if (pageSizeNum < 1 || pageSizeNum > 100) {
            return res.status(200).json({
                msg: "error",
                error: "每页数量必须在1-100之间"
            });
        }

        // 2. 构建查询条件
        const query = {};
        
        // 如果传入了分类ID，添加分类筛选条件
        if (category_id !== undefined && category_id !== null && category_id !== '') {
            const categoryIdNum = parseInt(category_id);
            if (isNaN(categoryIdNum)) {
                return res.status(200).json({
                    msg: "error",
                    error: "分类ID类型错误"
                });
            }
            if (categoryIdNum < 1 || categoryIdNum > 13 || !Number.isInteger(categoryIdNum)) {
                return res.status(200).json({
                    msg: "error",
                    error: "分类ID无效，必须在1-13之间"
                });
            }
            query.category_id = categoryIdNum;
        }

        // 如果传入了搜索关键词，添加搜索条件（对商品描述进行模糊匹配）
        if (keyword !== undefined && keyword !== null && keyword !== '') {
            const searchKeyword = keyword.trim();
            if (searchKeyword.length > 0) {
                // 使用正则表达式进行不区分大小写的模糊匹配
                query.description = { $regex: searchKeyword, $options: 'i' };
            }
        }

        // 如果传入了卖家ID，添加卖家筛选条件
        if (seller_id !== undefined && seller_id !== null && seller_id !== '') {
            query.user_id = seller_id;
        }

        const skip = (pageNum - 1) * pageSizeNum;
        const limit = pageSizeNum;

        // 3. 查询商品列表（按创建时间倒序）
        const goodsList = await Goods.find(query)
            .sort({ create_time: -1 }) // 按创建时间倒序（最新在前）
            .skip(skip)
            .limit(limit)
            .lean();

        // 4. 获取所有商品ID和卖家ID
        const goodsIds = goodsList.map(g => g.goods_id);
        const userIds = [...new Set(goodsList.map(g => g.user_id))];

        // 5. 批量查询卖家信息（使用 lean() 提高性能）
        const sellers = await User.find({ user_id: { $in: userIds } }).lean();
        const sellerMap = {};
        sellers.forEach(seller => {
            sellerMap[seller.user_id] = {
                user_id: seller.user_id,
                nickname: seller.nickname || '',
                name: seller.name || '',  // 添加 name 字段
                avatar: processAvatarUrl(seller.avatar || '') // 处理头像URL
            };
        });

        // 6. 批量查询规格选项（仅查询开启规格的商品）
        const specEnabledGoodsIds = goodsList
            .filter(g => g.spec_enabled)
            .map(g => g.goods_id);
        
        const specOptions = await SpecOption.find({ 
            goods_id: { $in: specEnabledGoodsIds } 
        })
        .sort({ sort_order: 1 })
        .lean();
        
        const specsMap = {};
        specOptions.forEach(spec => {
            if (!specsMap[spec.goods_id]) {
                specsMap[spec.goods_id] = [];
            }
            specsMap[spec.goods_id].push({
                name: spec.name,
                price: spec.price,
                stock: spec.stock
            });
        });

        // 7. 组装返回数据
        const result = goodsList.map(goods => {
            // 处理图片URL，确保返回完整的OSS URL
            const processedImages = processImageUrls(goods.images);
            
            return {
                goods_id: goods.goods_id,
                user_id: goods.user_id,
                description: goods.description,
                price: goods.price,
                category_id: goods.category_id,
                images: processedImages,
                group_buy_enabled: goods.group_buy_enabled || false,
                group_buy_count: goods.group_buy_count || null,
                group_buy_discount: goods.group_buy_discount || null,
                spec_enabled: goods.spec_enabled || false,
                specs: goods.spec_enabled ? (specsMap[goods.goods_id] || null) : null,
                sales_count: goods.sales_count || 0,
                create_time: formatDateTime(goods.create_time),
                seller: sellerMap[goods.user_id] || {
                    user_id: goods.user_id,
                    nickname: '',
                    name: '',
                    avatar: '/assets/default_avatar.png'
                }
            };
        });

        // 8. 获取总数（使用相同的查询条件）
        const total = await Goods.countDocuments(query);

        res.json({
            msg: "success",
            data: {
                list: result,
                total: total
            }
        });
    } catch (error) {
        console.log('获取商品列表失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取商品列表失败"
        });
    }
});

// 获取我的商品列表
router.get('/myGoods', async (req, res) => {
    try {
        const { user_id, page = 1, pageSize = 20 } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;

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

        // 3. 查询当前用户的商品列表（按创建时间倒序）
        const goodsList = await Goods.find({ user_id: user_id })
            .sort({ create_time: -1 }) // 按创建时间倒序（最新的在前）
            .skip(skip)
            .limit(limit)
            .lean();

        // 4. 组装返回数据
        const result = goodsList.map(goods => {
            // 处理图片URL，确保返回完整的OSS URL
            const processedImages = processImageUrls(goods.images);
            
            return {
                goods_id: goods.goods_id,
                user_id: goods.user_id,
                description: goods.description,
                price: goods.price,
                images: processedImages,
                category_id: goods.category_id,
                category_name: getCategoryName(goods.category_id),
                group_buy_enabled: goods.group_buy_enabled || false,
                group_buy_count: goods.group_buy_count || null,
                group_buy_discount: goods.group_buy_discount || null,
                created_at: formatDateTime(goods.create_time),
                updated_at: formatDateTime(goods.update_time),
                sales_count: goods.sales_count || 0
            };
        });

        // 5. 获取总数
        const total = await Goods.countDocuments({ user_id: user_id });

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
        console.log('获取商品列表失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取商品列表失败"
        });
    }
});

// 获取商品评论数目
router.get('/getCommentCount', async (req, res) => {
    try {
        const { goods_id } = req.query;

        // 1. 参数验证
        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "商品ID不能为空"
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

        // 3. 统计评论数（所有评论，不区分审核状态）
        const count = await Comment.countDocuments({
            goods_id: goods_id
        });

        // 4. 返回成功响应
        res.json({
            msg: "success",
            data: {
                count: count
            }
        });
    } catch (error) {
        console.log('获取评论数失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

// 获取我发布的数量
router.get('/my/count', async (req, res) => {
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

        // 3. 统计该用户发布的所有商品数量（包括已下架的商品）
        const count = await Goods.countDocuments({
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
        console.log('获取我发布的数量失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

// 获取商品收藏数目
router.get('/getFavoriteCount', async (req, res) => {
    try {
        const { goods_id } = req.query;

        // 1. 参数验证
        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "商品ID不能为空"
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

        // 3. 统计收藏数
        const count = await Favorite.countDocuments({
            goods_id: goods_id
        });

        // 4. 返回成功响应
        res.json({
            msg: "success",
            data: {
                goods_id: goods_id,
                count: count,
                message: "获取成功"
            }
        });
    } catch (error) {
        console.log('获取收藏数失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

// 格式化时间戳为 ISO 8601 格式
const formatISO8601 = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toISOString();
};

// 更新商品接口（商家管理功能）
// POST /goods/update
router.post('/update', async (req, res) => {
    try {
        const { goods_id, user_id, description, price } = req.body;

        // 1. 参数验证 - 必填参数
        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "未登录"
            });
        }

        // 2. 验证至少提供了一个修改字段
        if (description === undefined && price === undefined) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 3. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "未登录"
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

        // 5. 验证权限（只有商品发布者才能更新）
        if (goods.user_id !== user_id) {
            return res.status(200).json({
                msg: "error",
                error: "权限不足"
            });
        }

        // 6. 验证 description（如果提供）
        if (description !== undefined) {
            if (typeof description !== 'string') {
                return res.status(200).json({
                    msg: "error",
                    error: "参数错误"
                });
            }
            
            const trimmedDescription = description.trim();
            if (trimmedDescription.length === 0) {
                return res.status(200).json({
                    msg: "error",
                    error: "商品描述不能为空"
                });
            }
            
            if (trimmedDescription.length > 500) {
                return res.status(200).json({
                    msg: "error",
                    error: "商品描述最多500字符"
                });
            }
        }

        // 7. 验证 price（如果提供）
        if (price !== undefined) {
            const priceNum = parseFloat(price);
            if (isNaN(priceNum)) {
                return res.status(200).json({
                    msg: "error",
                    error: "参数错误"
                });
            }
            
            if (priceNum < 0) {
                return res.status(200).json({
                    msg: "error",
                    error: "商品价格不能为负数"
                });
            }
        }

        // 8. 构建更新对象
        const updateData = {};
        if (description !== undefined) {
            updateData.description = description.trim();
        }
        if (price !== undefined) {
            updateData.price = parseFloat(price);
        }
        
        // 更新 update_time
        updateData.update_time = new Date().getTime();

        // 9. 更新商品信息
        const updatedGoods = await Goods.findOneAndUpdate(
            { goods_id: goods_id },
            { $set: updateData },
            { new: true } // 返回更新后的文档
        ).lean();

        if (!updatedGoods) {
            return res.status(200).json({
                msg: "error",
                error: "更新失败"
            });
        }

        // 10. 返回成功响应
        res.json({
            msg: "success",
            data: {
                goods_id: updatedGoods.goods_id,
                description: updatedGoods.description,
                price: updatedGoods.price,
                update_time: formatISO8601(updatedGoods.update_time)
            }
        });
    } catch (error) {
        console.log('更新商品失败:', error);
        res.status(200).json({
            msg: "error",
            error: "服务器错误"
        });
    }
});

module.exports = router;
