const express = require('express');
const router = express.Router();
const { User, Order, Goods, SpecOption } = require('../../db');

// 格式化时间戳为日期时间字符串
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

// 处理图片URL，确保返回完整的OSS URL
// 参考 goods.js 中的 processImageUrls 逻辑
const processImageUrl = (imageUrl) => {
    // 处理空值
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
        return '';
    }
    
    const trimmedUrl = imageUrl.trim();
    
    // 如果已经是完整的HTTPS URL，直接返回（这是最常见的情况，OSS返回的就是完整URL）
    if (trimmedUrl.startsWith('https://')) {
        return trimmedUrl;
    }
    
    // 如果是HTTP URL，转换为HTTPS
    if (trimmedUrl.startsWith('http://')) {
        return trimmedUrl.replace('http://', 'https://');
    }
    
    // 如果是相对路径（以/开头），可能是本地资源，直接返回
    if (trimmedUrl.startsWith('/')) {
        return trimmedUrl;
    }
    
    // 如果是相对路径（不以/开头），尝试拼接OSS域名
    const ossDomain = process.env.OSS_DOMAIN || '';
    if (ossDomain && trimmedUrl) {
        let finalDomain = ossDomain.trim();
        // 确保OSS域名是HTTPS
        if (finalDomain.startsWith('http://')) {
            finalDomain = finalDomain.replace('http://', 'https://');
        } else if (!finalDomain.startsWith('https://') && !finalDomain.startsWith('http://')) {
            finalDomain = `https://${finalDomain}`;
        }
        
        // 处理路径，避免重复的斜杠
        const path = trimmedUrl.startsWith('/') ? trimmedUrl.substring(1) : trimmedUrl;
        // 确保域名末尾没有斜杠，路径开头没有斜杠
        const cleanDomain = finalDomain.endsWith('/') ? finalDomain.slice(0, -1) : finalDomain;
        return `${cleanDomain}/${path}`;
    }
    
    // 如果没有OSS域名配置，返回原URL
    return trimmedUrl;
};

// 处理图片URL数组
const processImageUrls = (images) => {
    if (!images) {
        return [];
    }
    
    // 如果是字符串，尝试解析为JSON
    if (typeof images === 'string') {
        try {
            images = JSON.parse(images);
        } catch (e) {
            // 如果解析失败，当作单个URL处理
            return [processImageUrl(images)].filter(url => url !== '');
        }
    }
    
    // 如果是数组
    if (Array.isArray(images)) {
        return images.map(img => processImageUrl(img)).filter(url => url !== '');
    }
    
    return [];
};

// 获取用户列表接口
// GET /admin/user/list
router.get('/list', async (req, res) => {
    try {
        const { page = 1, pageSize = 10, keyword = '' } = req.query;
        const pageNum = parseInt(page);
        const size = parseInt(pageSize);
        const skip = (pageNum - 1) * size;

        // 构建查询条件
        const query = {};
        // 处理搜索关键词：去除首尾空格，如果为空则不添加搜索条件
        const trimmedKeyword = keyword ? keyword.trim() : '';
        if (trimmedKeyword) {
            // 转义特殊字符，防止正则表达式注入
            const escapedKeyword = trimmedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { account: { $regex: escapedKeyword, $options: 'i' } },
                { nickname: { $regex: escapedKeyword, $options: 'i' } },
                { name: { $regex: escapedKeyword, $options: 'i' } }
            ];
        }

        // 查询用户列表
        const users = await User.find(query)
            .sort({ create_time: -1 })
            .skip(skip)
            .limit(size)
            .select('-password'); // 排除密码字段

        // 获取总数
        const total = await User.countDocuments(query);

        // 格式化返回数据
        const result = users.map(user => {
            const processedAvatar = processImageUrl(user.avatar || '');
            // 调试日志
            if (user.avatar) {
                console.log('用户头像处理:', {
                    original: user.avatar,
                    processed: processedAvatar
                });
            }
            return {
                user_id: user.user_id,
                account: user.account || '',
                nickname: user.nickname || '',
                name: user.name || '',
                phone: user.phone || '',
                avatar: processedAvatar,
                is_blacklisted: user.is_blacklisted || 0,
                create_time: formatDateTime(user.create_time)
            };
        });

        res.status(200).json({
            msg: 'success',
            data: {
                list: result,
                total: total,
                page: pageNum,
                pageSize: size
            }
        });
    } catch (error) {
        console.log('获取用户列表失败:', error);
        res.status(200).json({
            msg: 'error',
            error: '获取用户列表失败'
        });
    }
});

// 拉黑/取消拉黑用户接口
// POST /admin/user/blacklist
router.post('/blacklist', async (req, res) => {
    try {
        const { user_id, is_blacklisted } = req.body;

        if (!user_id) {
            return res.status(200).json({
                msg: 'error',
                error: '用户ID不能为空'
            });
        }

        const blacklistStatus = is_blacklisted === 1 || is_blacklisted === true ? 1 : 0;

        // 更新用户拉黑状态
        const result = await User.findOneAndUpdate(
            { user_id: user_id },
            { is_blacklisted: blacklistStatus },
            { new: true }
        ).select('-password');

        if (!result) {
            return res.status(200).json({
                msg: 'error',
                error: '用户不存在'
            });
        }

        res.status(200).json({
            msg: 'success',
            data: {
                user_id: result.user_id,
                is_blacklisted: result.is_blacklisted,
                message: blacklistStatus === 1 ? '拉黑成功' : '取消拉黑成功'
            }
        });
    } catch (error) {
        console.log('拉黑操作失败:', error);
        res.status(200).json({
            msg: 'error',
            error: '操作失败'
        });
    }
});

// 获取用户详情接口
// GET /admin/user/detail/:user_id
router.get('/detail/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(200).json({
                msg: 'error',
                error: '用户ID不能为空'
            });
        }

        // 查询用户信息
        const user = await User.findOne({ user_id: user_id }).select('-password');

        if (!user) {
            return res.status(200).json({
                msg: 'error',
                error: '用户不存在'
            });
        }

        // 格式化返回数据
        const processedAvatar = processImageUrl(user.avatar || '');
        // 调试日志
        if (user.avatar) {
            console.log('用户详情头像处理:', {
                original: user.avatar,
                processed: processedAvatar
            });
        }
        const result = {
            user_id: user.user_id,
            account: user.account || '',
            nickname: user.nickname || '',
            name: user.name || '',
            phone: user.phone || '',
            avatar: processedAvatar,
            is_blacklisted: user.is_blacklisted || 0,
            create_time: formatDateTime(user.create_time)
        };

        res.status(200).json({
            msg: 'success',
            data: result
        });
    } catch (error) {
        console.log('获取用户详情失败:', error);
        res.status(200).json({
            msg: 'error',
            error: '获取用户详情失败'
        });
    }
});

// 获取用户订单列表接口
// GET /admin/user/orders/:user_id
router.get('/orders/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { page = 1, pageSize = 10 } = req.query;
        const pageNum = parseInt(page);
        const size = parseInt(pageSize);
        const skip = (pageNum - 1) * size;

        if (!user_id) {
            return res.status(200).json({
                msg: 'error',
                error: '用户ID不能为空'
            });
        }

        // 查询用户是否存在
        const user = await User.findOne({ user_id: user_id });
        if (!user) {
            return res.status(200).json({
                msg: 'error',
                error: '用户不存在'
            });
        }

        // 查询订单列表
        const orders = await Order.find({ user_id: user_id })
            .sort({ create_time: -1 })
            .skip(skip)
            .limit(size);

        // 获取商品ID列表
        const goodsIds = [...new Set(orders.map(order => order.goods_id))];

        // 查询商品信息
        const goodsList = await Goods.find({ goods_id: { $in: goodsIds } });
        const goodsMap = {};
        goodsList.forEach(goods => {
            goodsMap[goods.goods_id] = goods;
        });

        // 获取规格ID列表
        const specIds = orders
            .filter(order => order.spec_id)
            .map(order => order.spec_id);

        // 查询规格信息
        const specs = await SpecOption.find({ spec_option_id: { $in: specIds } });
        const specMap = {};
        specs.forEach(spec => {
            specMap[spec.spec_option_id] = spec;
        });

        // 格式化订单数据
        const result = orders.map(order => {
            const goods = goodsMap[order.goods_id];
            const spec = order.spec_id ? specMap[order.spec_id] : null;

            // 处理商品图片
            let goodsImage = null;
            if (goods && goods.images) {
                const processedImages = processImageUrls(goods.images);
                goodsImage = processedImages.length > 0 ? processedImages[0] : null;
                // 调试日志
                if (goods.images && processedImages.length > 0) {
                    console.log('商品图片处理:', {
                        original: goods.images,
                        processed: processedImages,
                        selected: goodsImage
                    });
                }
            }

            // 订单状态中文映射
            const statusMap = {
                'pending': '待支付',
                'paid': '已支付',
                'shipped': '已发货',
                'review': '待评价',
                'completed': '已完成',
                'cancelled': '已取消'
            };

            return {
                order_id: order.order_id,
                order_no: order.order_no,
                goods_id: order.goods_id,
                goods_description: goods ? goods.description : '',
                goods_image: goodsImage,
                spec_id: order.spec_id || null,
                spec_name: spec ? spec.name : null,
                quantity: order.quantity,
                total_price: order.total_price,
                status: order.status,
                status_text: statusMap[order.status] || order.status,
                is_group_buy: order.is_group_buy || false,
                create_time: formatDateTime(order.create_time),
                pay_time: order.pay_time ? formatDateTime(order.pay_time) : null,
                ship_time: order.ship_time ? formatDateTime(order.ship_time) : null,
                receive_time: order.receive_time ? formatDateTime(order.receive_time) : null,
                complete_time: order.complete_time ? formatDateTime(order.complete_time) : null
            };
        });

        // 获取总数
        const total = await Order.countDocuments({ user_id: user_id });

        res.status(200).json({
            msg: 'success',
            data: {
                list: result,
                total: total,
                page: pageNum,
                pageSize: size
            }
        });
    } catch (error) {
        console.log('获取用户订单列表失败:', error);
        res.status(200).json({
            msg: 'error',
            error: '获取用户订单列表失败'
        });
    }
});

module.exports = router;

