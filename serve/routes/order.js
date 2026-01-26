const express = require('express');
const router = express.Router();
const { User, Goods, Address, SpecOption, Order } = require('../db');

// 生成订单编号（格式：ORD + 年月日 + 时间戳后9位 + 随机数3位）
const generateOrderNo = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = String(now.getTime()).slice(-9);
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `ORD${year}${month}${day}${timestamp}${random}`;
};

// 格式化时间戳为 ISO 8601 格式
const formatISO8601 = (timestamp) => {
    return new Date(timestamp).toISOString();
};

// 创建订单接口
// POST /order/create
router.post('/create', async (req, res) => {
    try {
        const { user_id, goods_id, address_id, quantity, spec_id, is_group_buy, total_price } = req.body;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "未登录"
            });
        }

        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        if (!address_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 验证购买数量
        const quantityNum = parseInt(quantity);
        if (isNaN(quantityNum) || quantityNum < 1) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 验证总价
        const totalPriceNum = parseFloat(total_price);
        if (isNaN(totalPriceNum) || totalPriceNum <= 0) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 验证是否为拼团购买
        const isGroupBuy = is_group_buy === true || is_group_buy === 'true' || is_group_buy === 1;

        // 2. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "未登录"
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

        // 4. 验证地址是否存在且属于当前用户
        const address = await Address.findOne({ 
            address_id: address_id,
            user_id: user_id
        }).lean();
        if (!address) {
            return res.status(200).json({
                msg: "error",
                error: "地址不存在"
            });
        }

        // 5. 验证拼团功能
        if (isGroupBuy && !goods.group_buy_enabled) {
            return res.status(200).json({
                msg: "error",
                error: "拼团未开启"
            });
        }

        // 6. 处理规格和库存检查
        let unitPrice = goods.price; // 默认使用商品基础价格
        let stockAvailable = true; // 默认有库存（如果商品没有库存字段，则假设有库存）

        if (goods.spec_enabled) {
            // 如果商品开启了规格，spec_id 必填
            if (!spec_id) {
                return res.status(200).json({
                    msg: "error",
                    error: "参数错误"
                });
            }

            // 查询规格选项
            const specOption = await SpecOption.findOne({ 
                spec_option_id: spec_id,
                goods_id: goods_id
            }).lean();

            if (!specOption) {
                return res.status(200).json({
                    msg: "error",
                    error: "规格不存在"
                });
            }

            // 使用规格价格
            unitPrice = specOption.price;

            // 检查规格库存
            if (specOption.stock < quantityNum) {
                return res.status(200).json({
                    msg: "error",
                    error: "商品库存不足"
                });
            }
        } else {
            // 如果商品未开启规格，spec_id 应为 null
            if (spec_id !== null && spec_id !== undefined && spec_id !== '') {
                return res.status(200).json({
                    msg: "error",
                    error: "参数错误"
                });
            }
        }

        // 7. 计算订单总价
        let calculatedTotalPrice = unitPrice * quantityNum;

        // 如果开启拼团，应用拼团折扣
        if (isGroupBuy && goods.group_buy_enabled && goods.group_buy_discount) {
            calculatedTotalPrice = calculatedTotalPrice * goods.group_buy_discount;
        }

        // 保留2位小数
        calculatedTotalPrice = parseFloat(calculatedTotalPrice.toFixed(2));

        // 8. 验证价格（防止前端篡改价格）
        const priceDiff = Math.abs(calculatedTotalPrice - totalPriceNum);
        if (priceDiff > 0.01) {
            return res.status(200).json({
                msg: "error",
                error: "价格不匹配"
            });
        }

        // 9. 扣减库存（如果商品开启了规格）
        if (goods.spec_enabled && spec_id) {
            // 使用原子操作扣减规格库存
            const specUpdateResult = await SpecOption.findOneAndUpdate(
                { 
                    spec_option_id: spec_id,
                    stock: { $gte: quantityNum } // 确保库存足够
                },
                { 
                    $inc: { stock: -quantityNum },
                    $set: { updated_at: new Date().getTime() }
                },
                { new: true }
            );

            if (!specUpdateResult) {
                return res.status(200).json({
                    msg: "error",
                    error: "商品库存不足"
                });
            }
        }

        // 10. 生成订单ID和订单编号
        const { v4: uuidv4 } = await import('uuid');
        const orderId = uuidv4();
        let orderNo = generateOrderNo();
        
        // 确保订单编号唯一（如果重复则重新生成）
        let orderNoExists = await Order.findOne({ order_no: orderNo });
        let retryCount = 0;
        while (orderNoExists && retryCount < 10) {
            orderNo = generateOrderNo();
            orderNoExists = await Order.findOne({ order_no: orderNo });
            retryCount++;
        }

        const currentTime = new Date().getTime();

        // 11. 创建订单记录
        await Order.create({
            order_id: orderId,
            order_no: orderNo,
            user_id: user_id,
            goods_id: goods_id,
            address_id: address_id,
            quantity: quantityNum,
            spec_id: goods.spec_enabled ? spec_id : null,
            is_group_buy: isGroupBuy,
            total_price: calculatedTotalPrice,
            status: 'pending',
            create_time: currentTime
        });

        // 12. 更新商品销量（使用原子操作确保数据一致性）
        await Goods.findOneAndUpdate(
            { goods_id: goods_id },
            { 
                $inc: { sales_count: quantityNum }
            }
        );

        // 13. 返回成功响应
        res.json({
            msg: "success",
            data: {
                order_id: orderId,
                order_no: orderNo,
                status: "pending",
                total_price: calculatedTotalPrice,
                create_time: formatISO8601(currentTime)
            }
        });
    } catch (error) {
        console.log('创建订单失败:', error);
        res.status(200).json({
            msg: "error",
            error: "服务器错误"
        });
    }
});

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
        const ossDomain = process.env.OSS_DOMAIN || '';
        if (ossDomain && typeof img === 'string') {
            const path = img.startsWith('/') ? img.substring(1) : img;
            return `${ossDomain}/${path}`;
        }
        return img;
    });
};

// 获取订单列表接口
// GET /order/list
router.get('/list', async (req, res) => {
    try {
        const { user_id, status, page = 1, pageSize = 10 } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "未登录"
            });
        }

        // 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
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

        // 2. 构建查询条件
        const query = { user_id: user_id };
        
        // 如果传入了状态筛选，添加状态条件
        if (status !== undefined && status !== null && status !== '') {
            const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
            if (validStatuses.includes(status)) {
                query.status = status;
            }
        }

        const skip = (pageNum - 1) * pageSizeNum;
        const limit = pageSizeNum;

        // 3. 查询订单列表（按创建时间倒序）
        const orders = await Order.find(query)
            .sort({ create_time: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 4. 获取所有商品ID和规格ID
        const goodsIds = [...new Set(orders.map(o => o.goods_id))];
        const specIds = orders
            .filter(o => o.spec_id)
            .map(o => o.spec_id);

        // 5. 批量查询商品信息
        const goodsList = await Goods.find({ goods_id: { $in: goodsIds } }).lean();
        const goodsMap = {};
        goodsList.forEach(goods => {
            goodsMap[goods.goods_id] = goods;
        });

        // 6. 批量查询规格信息
        const specOptions = await SpecOption.find({ 
            spec_option_id: { $in: specIds } 
        }).lean();
        const specMap = {};
        specOptions.forEach(spec => {
            specMap[spec.spec_option_id] = spec;
        });

        // 7. 组装返回数据
        const result = orders.map(order => {
            const goods = goodsMap[order.goods_id];
            const spec = order.spec_id ? specMap[order.spec_id] : null;
            
            // 处理商品图片（取第一张）
            let goodsImage = null;
            if (goods && goods.images && goods.images.length > 0) {
                const processedImages = processImageUrls(goods.images);
                goodsImage = Array.isArray(processedImages) && processedImages.length > 0 
                    ? processedImages[0] 
                    : (typeof processedImages[0] === 'string' ? processedImages[0] : null);
            }

            return {
                order_id: order.order_id,
                order_no: order.order_no,
                user_id: order.user_id,
                goods_id: order.goods_id,
                goods_description: goods ? goods.description : '',
                goods_image: goodsImage,
                spec_id: order.spec_id || null,
                spec_name: spec ? spec.name : null,
                quantity: order.quantity,
                total_price: order.total_price,
                status: order.status,
                is_group_buy: order.is_group_buy || false,
                address_id: order.address_id,
                create_time: formatISO8601(order.create_time),
                update_time: order.update_time ? formatISO8601(order.update_time) : formatISO8601(order.create_time)
            };
        });

        // 8. 获取总数
        const total = await Order.countDocuments(query);

        res.json({
            msg: "success",
            data: {
                list: result,
                total: total
            }
        });
    } catch (error) {
        console.log('获取订单列表失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取订单列表失败"
        });
    }
});

// 取消订单接口
// POST /order/cancel
router.post('/cancel', async (req, res) => {
    try {
        const { user_id, order_id } = req.body;

        // 1. 参数验证
        if (!user_id || !order_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 2. 查询订单并验证归属
        const order = await Order.findOne({ 
            order_id: order_id,
            user_id: user_id
        });

        if (!order) {
            return res.status(200).json({
                msg: "error",
                error: "订单不存在或不属于当前用户"
            });
        }

        // 3. 验证订单状态（只有 pending 和 paid 状态的订单可以取消）
        if (order.status !== 'pending' && order.status !== 'paid') {
            return res.status(200).json({
                msg: "error",
                error: "订单状态不允许取消"
            });
        }

        // 4. 恢复库存（如果订单有规格）
        if (order.spec_id) {
            await SpecOption.findOneAndUpdate(
                { spec_option_id: order.spec_id },
                { 
                    $inc: { stock: order.quantity },
                    $set: { updated_at: new Date().getTime() }
                }
            );
        }

        // 5. 更新订单状态
        const currentTime = new Date().getTime();
        await Order.updateOne(
            { order_id: order_id },
            {
                $set: {
                    status: 'cancelled',
                    update_time: currentTime
                }
            }
        );

        // 6. 更新商品销量（扣减）
        await Goods.findOneAndUpdate(
            { goods_id: order.goods_id },
            { 
                $inc: { sales_count: -order.quantity }
            }
        );

        res.json({
            msg: "success",
            data: {
                order_id: order_id,
                status: "cancelled"
            }
        });
    } catch (error) {
        console.log('取消订单失败:', error);
        res.status(200).json({
            msg: "error",
            error: "取消订单失败"
        });
    }
});

// 确认收货接口
// POST /order/confirm
router.post('/confirm', async (req, res) => {
    try {
        const { user_id, order_id } = req.body;

        // 1. 参数验证
        if (!user_id || !order_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 2. 查询订单并验证归属
        const order = await Order.findOne({ 
            order_id: order_id,
            user_id: user_id
        });

        if (!order) {
            return res.status(200).json({
                msg: "error",
                error: "订单不存在或不属于当前用户"
            });
        }

        // 3. 验证订单状态（只有 shipped 状态的订单可以确认收货）
        if (order.status !== 'shipped') {
            return res.status(200).json({
                msg: "error",
                error: "订单状态不允许确认收货"
            });
        }

        // 4. 更新订单状态
        const currentTime = new Date().getTime();
        await Order.updateOne(
            { order_id: order_id },
            {
                $set: {
                    status: 'completed',
                    update_time: currentTime
                }
            }
        );

        res.json({
            msg: "success",
            data: {
                order_id: order_id,
                status: "completed"
            }
        });
    } catch (error) {
        console.log('确认收货失败:', error);
        res.status(200).json({
            msg: "error",
            error: "确认收货失败"
        });
    }
});

// 支付订单接口
// POST /order/pay
router.post('/pay', async (req, res) => {
    try {
        const { user_id, order_id } = req.body;

        // 1. 参数验证
        if (!user_id || !order_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 2. 查询订单并验证归属
        const order = await Order.findOne({ 
            order_id: order_id,
            user_id: user_id
        });

        if (!order) {
            return res.status(200).json({
                msg: "error",
                error: "订单不存在或不属于当前用户"
            });
        }

        // 3. 验证订单状态（只有 pending 状态的订单可以支付）
        if (order.status !== 'pending') {
            return res.status(200).json({
                msg: "error",
                error: "订单状态不允许支付"
            });
        }

        // 4. 更新订单状态（实际项目中这里应该调用支付接口）
        const currentTime = new Date().getTime();
        await Order.updateOne(
            { order_id: order_id },
            {
                $set: {
                    status: 'paid',
                    update_time: currentTime
                }
            }
        );

        res.json({
            msg: "success",
            data: {
                order_id: order_id,
                status: "paid"
            }
        });
    } catch (error) {
        console.log('支付订单失败:', error);
        res.status(200).json({
            msg: "error",
            error: "支付订单失败"
        });
    }
});

module.exports = router;






