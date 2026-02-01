const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User, Goods, Address, SpecOption, Order, Wallet, PaymentRecord, Comment, GroupBuy } = require('../db');

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

// 创建订单接口
// POST /order/create
router.post('/create', async (req, res) => {
    try {
        const { user_id, goods_id, address_id, quantity, spec_id, spec_name, is_group_buy, total_price, group_id } = req.body;

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

        // 11. 处理拼团逻辑
        let finalGroupId = null;
        let groupBuyStatus = null;
        let groupBuyCurrentCount = 0;
        let groupBuyRequiredCount = 0;
        let groupBuyRemainingCount = 0;

        if (isGroupBuy) {
            // 验证商品是否开启拼团功能
            if (!goods.group_buy_enabled) {
                return res.status(200).json({
                    msg: "error",
                    error: "商品未开启拼团功能"
                });
            }

            const requiredCount = goods.group_buy_count || 2; // 默认2人拼团
            groupBuyRequiredCount = requiredCount;

            if (group_id) {
                // 如果提供了 group_id，检查该拼团组是否存在且未过期
                const existingGroup = await GroupBuy.findOne({ 
                    group_id: group_id,
                    goods_id: goods_id,
                    status: 'pending'
                }).lean();

                if (!existingGroup) {
                    return res.status(200).json({
                        msg: "error",
                        error: "拼团组不存在或已过期"
                    });
                }

                // 检查是否已过期
                if (existingGroup.expire_time <= currentTime) {
                    return res.status(200).json({
                        msg: "error",
                        error: "拼团组已过期"
                    });
                }

                // 检查是否已满员
                if (existingGroup.current_count >= existingGroup.required_count) {
                    return res.status(200).json({
                        msg: "error",
                        error: "拼团组已满员"
                    });
                }

                finalGroupId = group_id;
            } else {
                // 如果没有提供 group_id，检查是否有正在进行的拼团（未过期且未满员）
                const activeGroup = await GroupBuy.findOne({
                    goods_id: goods_id,
                    status: 'pending',
                    expire_time: { $gt: currentTime },
                    current_count: { $lt: requiredCount } // 未满员
                }).sort({ create_time: -1 }) // 获取最新的拼团组
                .lean();

                if (activeGroup) {
                    // 加入已有拼团组
                    finalGroupId = activeGroup.group_id;
                    // 查询该拼团组下已支付的订单数量，判断是否满员
                    const paidOrderCount = await Order.countDocuments({
                        group_id: activeGroup.group_id,
                        status: 'paid'
                    });
                    if (paidOrderCount >= activeGroup.required_count) {
                        return res.status(200).json({
                            msg: "error",
                            error: "拼团组已满员"
                        });
                    }
                } else {
                    // 创建新的拼团组
                    const { v4: uuidv4 } = await import('uuid');
                    finalGroupId = uuidv4();
                    const expireTime = currentTime + 24 * 60 * 60 * 1000; // 24小时后过期

                    await GroupBuy.create({
                        group_id: finalGroupId,
                        goods_id: goods_id,
                        required_count: requiredCount,
                        current_count: 0, // 初始为0，只有支付后才计入
                        status: 'pending',
                        create_time: currentTime,
                        expire_time: expireTime
                    });
                }
            }

            // 查询拼团组当前信息（用于返回）
            const groupInfo = await GroupBuy.findOne({ group_id: finalGroupId }).lean();
            if (groupInfo) {
                // 查询该拼团组下已支付的订单数量
                const paidOrderCount = await Order.countDocuments({
                    group_id: finalGroupId,
                    status: 'paid'
                });
                groupBuyCurrentCount = paidOrderCount;
                groupBuyRequiredCount = groupInfo.required_count;
                groupBuyRemainingCount = Math.max(0, groupBuyRequiredCount - groupBuyCurrentCount);
            }

            groupBuyStatus = 'pending'; // 创建订单时，状态始终为 pending，只有支付后才可能成团
        }

        // 12. 创建订单记录
        await Order.create({
            order_id: orderId,
            order_no: orderNo,
            user_id: user_id,
            goods_id: goods_id,
            address_id: address_id,
            quantity: quantityNum,
            spec_id: goods.spec_enabled ? spec_id : null,
            is_group_buy: isGroupBuy,
            group_id: finalGroupId,
            total_price: calculatedTotalPrice,
            status: 'pending', // 创建订单时，状态始终为 pending，需要支付
            create_time: currentTime
        });

        // 13. 更新商品销量（使用原子操作确保数据一致性）
        await Goods.findOneAndUpdate(
            { goods_id: goods_id },
            { 
                $inc: { sales_count: quantityNum }
            }
        );

        // 14. 返回成功响应
        const responseData = {
            order_id: orderId,
            order_no: orderNo,
            status: 'pending', // 创建订单时，状态始终为 pending
            total_price: calculatedTotalPrice,
            create_time: formatISO8601(currentTime)
        };

        // 如果是拼团订单，添加拼团相关信息
        if (isGroupBuy) {
            responseData.group_buy_status = groupBuyStatus;
            responseData.group_id = finalGroupId;
            responseData.group_buy_current_count = groupBuyCurrentCount;
            responseData.group_buy_required_count = groupBuyRequiredCount;
            responseData.group_buy_remaining_count = groupBuyRemainingCount;
        }

        res.json({
            msg: "success",
            data: responseData
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

// 我买到的订单列表接口
// GET /order/bought/list
router.get('/bought/list', async (req, res) => {
    try {
        const { user_id, status, page = 1, pageSize = 10 } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
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

        // 2. 构建查询条件（只返回 buyer_id 等于 user_id 的订单）
        const query = { user_id: user_id };
        
        // 如果传入了状态筛选，添加状态条件
        if (status !== undefined && status !== null && status !== '' && status !== 'all') {
            const validStatuses = ['pending', 'paid', 'shipped', 'review', 'completed', 'cancelled'];
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

        // 4. 获取所有商品ID、规格ID和拼团组ID
        const goodsIds = [...new Set(orders.map(o => o.goods_id))];
        const specIds = orders
            .filter(o => o.spec_id)
            .map(o => o.spec_id);
        const groupIds = orders
            .filter(o => o.is_group_buy && o.group_id)
            .map(o => o.group_id);

        // 5. 批量查询商品信息
        const goodsList = await Goods.find({ goods_id: { $in: goodsIds } }).lean();
        const goodsMap = {};
        const sellerIds = [];
        goodsList.forEach(goods => {
            goodsMap[goods.goods_id] = goods;
            if (goods.user_id) {
                sellerIds.push(goods.user_id);
            }
        });

        // 6. 批量查询卖家信息
        const sellers = await User.find({ user_id: { $in: sellerIds } }).lean();
        const sellerMap = {};
        sellers.forEach(seller => {
            sellerMap[seller.user_id] = seller;
        });

        // 7. 批量查询规格信息
        const specOptions = await SpecOption.find({ 
            spec_option_id: { $in: specIds } 
        }).lean();
        const specMap = {};
        specOptions.forEach(spec => {
            specMap[spec.spec_option_id] = spec;
        });

        // 8. 批量查询拼团组信息
        const groupBuys = await GroupBuy.find({ 
            group_id: { $in: [...new Set(groupIds)] } 
        }).lean();
        const groupBuyMap = {};
        groupBuys.forEach(group => {
            groupBuyMap[group.group_id] = group;
        });

        // 9. 批量查询所有拼团组的已支付订单数量（优化性能，避免在循环中查询）
        const uniqueGroupIds = [...new Set(groupIds)];
        const paidOrderCountMap = {};
        if (uniqueGroupIds.length > 0) {
            // 使用聚合查询批量统计每个拼团组的已支付订单数
            const paidOrderCounts = await Order.aggregate([
                {
                    $match: {
                        group_id: { $in: uniqueGroupIds },
                        status: 'paid',
                        is_group_buy: true
                    }
                },
                {
                    $group: {
                        _id: '$group_id',
                        count: { $sum: 1 }
                    }
                }
            ]);

            paidOrderCounts.forEach(item => {
                paidOrderCountMap[item._id] = item.count;
            });
        }

        // 10. 组装返回数据
        const result = orders.map(order => {
            const goods = goodsMap[order.goods_id];
            const spec = order.spec_id ? specMap[order.spec_id] : null;
            const groupBuy = order.is_group_buy && order.group_id ? groupBuyMap[order.group_id] : null;
            
            // 处理商品图片（返回数组格式，必须确保是数组）
            let goodsImages = [];
            if (goods && goods.images) {
                if (Array.isArray(goods.images)) {
                    goodsImages = processImageUrls(goods.images);
                } else if (typeof goods.images === 'string') {
                    // 如果是字符串，尝试解析为JSON，否则作为单个图片URL
                    try {
                        const parsed = JSON.parse(goods.images);
                        goodsImages = Array.isArray(parsed) ? processImageUrls(parsed) : [goods.images];
                    } catch (e) {
                        goodsImages = processImageUrls([goods.images]);
                    }
                }
            }

            // 获取卖家ID
            const sellerId = goods ? goods.user_id : null;

            // 处理商品描述（确保始终返回字符串，不能为null或undefined）
            let goodsDescription = '';
            if (goods) {
                if (goods.description && typeof goods.description === 'string') {
                    goodsDescription = goods.description;
                } else if (goods.name && typeof goods.name === 'string') {
                    goodsDescription = goods.name;
                } else {
                    goodsDescription = '商品描述';
                }
            } else {
                goodsDescription = '商品描述';
            }

            const orderData = {
                order_id: order.order_id,
                order_no: order.order_no,
                buyer_id: order.user_id,
                seller_id: sellerId,
                goods_id: order.goods_id,
                goods_description: goodsDescription,
                goods_image: goodsImages,
                spec_name: spec && spec.name ? spec.name : null,
                quantity: order.quantity || 1,
                total_price: parseFloat(order.total_price || 0).toFixed(2),
                status: order.status,
                create_time: formatDateTime(order.create_time),
                pay_time: order.pay_time ? formatDateTime(order.pay_time) : null,
                ship_time: order.ship_time ? formatDateTime(order.ship_time) : null,
                receive_time: order.receive_time ? formatDateTime(order.receive_time) : null,
                complete_time: order.complete_time ? formatDateTime(order.complete_time) : null
            };

            // 如果是拼团订单，添加拼团相关信息
            if (order.is_group_buy && groupBuy) {
                // 从映射表中获取已支付的订单数量（重要：只统计已支付的订单）
                const paidOrderCount = paidOrderCountMap[order.group_id] || 0;

                orderData.is_group_buy = true;
                orderData.group_id = order.group_id;
                orderData.group_buy_status = groupBuy.status;
                orderData.group_buy_required_count = groupBuy.required_count;
                orderData.group_buy_current_count = paidOrderCount; // 使用已支付的订单数
                orderData.group_buy_remaining_count = Math.max(0, groupBuy.required_count - paidOrderCount);
            } else {
                orderData.is_group_buy = false;
            }

            return orderData;
        });

        // 9. 获取总数
        const total = await Order.countDocuments(query);

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
        console.log('获取我买到的订单列表失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

// 我卖出的订单列表接口
// GET /order/sold/list
router.get('/sold/list', async (req, res) => {
    try {
        const { user_id, status, page = 1, pageSize = 10 } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
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

        // 2. 获取该用户发布的所有商品ID
        const goodsList = await Goods.find({ user_id: user_id }).lean();
        const goodsIds = goodsList.map(g => g.goods_id);

        if (goodsIds.length === 0) {
            // 如果用户没有发布任何商品，直接返回空列表
            return res.json({
                msg: "success",
                data: {
                    list: [],
                    total: 0,
                    page: pageNum,
                    pageSize: pageSizeNum
                }
            });
        }

        // 3. 构建查询条件（只返回 seller_id 等于 user_id 的订单，即商品属于该用户的订单）
        const query = { goods_id: { $in: goodsIds } };
        
        // 如果传入了状态筛选，添加状态条件
        if (status !== undefined && status !== null && status !== '' && status !== 'all') {
            const validStatuses = ['paid', 'shipped', 'completed'];
            if (validStatuses.includes(status)) {
                query.status = status;
            }
        }

        const skip = (pageNum - 1) * pageSizeNum;
        const limit = pageSizeNum;

        // 4. 查询订单列表（按创建时间倒序）
        const orders = await Order.find(query)
            .sort({ create_time: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 5. 获取所有规格ID和拼团组ID
        const specIds = orders
            .filter(o => o.spec_id)
            .map(o => o.spec_id);
        const groupIds = orders
            .filter(o => o.is_group_buy && o.group_id)
            .map(o => o.group_id);

        // 6. 批量查询商品信息（构建商品映射，包含完整的商品信息）
        const goodsMap = {};
        goodsList.forEach(goods => {
            goodsMap[goods.goods_id] = goods;
        });

        // 7. 批量查询规格信息
        const specOptions = await SpecOption.find({ 
            spec_option_id: { $in: specIds } 
        }).lean();
        const specMap = {};
        specOptions.forEach(spec => {
            specMap[spec.spec_option_id] = spec;
        });

        // 8. 批量查询拼团组信息
        const groupBuys = await GroupBuy.find({ 
            group_id: { $in: [...new Set(groupIds)] } 
        }).lean();
        const groupBuyMap = {};
        groupBuys.forEach(group => {
            groupBuyMap[group.group_id] = group;
        });

        // 9. 批量查询所有拼团组的已支付订单数量（优化性能，避免在循环中查询）
        const uniqueGroupIds = [...new Set(groupIds)];
        const paidOrderCountMap = {};
        if (uniqueGroupIds.length > 0) {
            // 使用聚合查询批量统计每个拼团组的已支付订单数
            const paidOrderCounts = await Order.aggregate([
                {
                    $match: {
                        group_id: { $in: uniqueGroupIds },
                        status: 'paid',
                        is_group_buy: true
                    }
                },
                {
                    $group: {
                        _id: '$group_id',
                        count: { $sum: 1 }
                    }
                }
            ]);

            paidOrderCounts.forEach(item => {
                paidOrderCountMap[item._id] = item.count;
            });
        }

        // 10. 组装返回数据
        const result = orders.map(order => {
            const goods = goodsMap[order.goods_id];
            const spec = order.spec_id ? specMap[order.spec_id] : null;
            const groupBuy = order.is_group_buy && order.group_id ? groupBuyMap[order.group_id] : null;
            
            // 处理商品图片（返回数组格式，必须确保是数组）
            let goodsImages = [];
            if (goods && goods.images) {
                if (Array.isArray(goods.images)) {
                    goodsImages = processImageUrls(goods.images);
                } else if (typeof goods.images === 'string') {
                    // 如果是字符串，尝试解析为JSON，否则作为单个图片URL
                    try {
                        const parsed = JSON.parse(goods.images);
                        goodsImages = Array.isArray(parsed) ? processImageUrls(parsed) : [goods.images];
                    } catch (e) {
                        goodsImages = processImageUrls([goods.images]);
                    }
                }
            }

            // 处理商品描述（确保始终返回字符串，不能为null或undefined）
            let goodsDescription = '';
            if (goods) {
                if (goods.description && typeof goods.description === 'string') {
                    goodsDescription = goods.description;
                } else if (goods.name && typeof goods.name === 'string') {
                    goodsDescription = goods.name;
                } else {
                    goodsDescription = '商品描述';
                }
            } else {
                goodsDescription = '商品描述';
            }

            const orderData = {
                order_id: order.order_id,
                order_no: order.order_no,
                buyer_id: order.user_id,
                seller_id: user_id,
                goods_id: order.goods_id,
                goods_description: goodsDescription,
                goods_image: goodsImages,
                spec_name: spec && spec.name ? spec.name : null,
                quantity: order.quantity || 1,
                total_price: parseFloat(order.total_price || 0).toFixed(2),
                status: order.status,
                create_time: formatDateTime(order.create_time),
                pay_time: order.pay_time ? formatDateTime(order.pay_time) : null,
                ship_time: order.ship_time ? formatDateTime(order.ship_time) : null,
                receive_time: order.receive_time ? formatDateTime(order.receive_time) : null,
                complete_time: order.complete_time ? formatDateTime(order.complete_time) : null
            };

            // 如果是拼团订单，添加拼团相关信息
            if (order.is_group_buy && groupBuy) {
                // 从映射表中获取已支付的订单数量（重要：只统计已支付的订单）
                const paidOrderCount = paidOrderCountMap[order.group_id] || 0;

                orderData.is_group_buy = true;
                orderData.group_id = order.group_id;
                orderData.group_buy_status = groupBuy.status;
                orderData.group_buy_required_count = groupBuy.required_count;
                orderData.group_buy_current_count = paidOrderCount; // 使用已支付的订单数
                orderData.group_buy_remaining_count = Math.max(0, groupBuy.required_count - paidOrderCount);
            } else {
                orderData.is_group_buy = false;
            }

            return orderData;
        });

        // 11. 获取总数
        const total = await Order.countDocuments(query);

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
        console.log('获取我卖出的订单列表失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
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

// 商家发货接口
// POST /order/ship
router.post('/ship', async (req, res) => {
    try {
        const { user_id, order_id } = req.body;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
            });
        }

        if (!order_id) {
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
                error: "用户不存在"
            });
        }

        // 3. 查询订单
        const order = await Order.findOne({ order_id: order_id }).lean();
        if (!order) {
            return res.status(200).json({
                msg: "error",
                error: "订单不存在"
            });
        }

        // 4. 查询商品信息，获取卖家ID
        const goods = await Goods.findOne({ goods_id: order.goods_id }).lean();
        if (!goods) {
            return res.status(200).json({
                msg: "error",
                error: "商品不存在"
            });
        }

        // 5. 验证订单的 seller_id 是否等于 user_id（确保是商家本人）
        if (goods.user_id !== user_id) {
            return res.status(200).json({
                msg: "error",
                error: "无权操作此订单"
            });
        }

        // 6. 验证订单状态是否为 paid（待发货）
        if (order.status !== 'paid') {
            return res.status(200).json({
                msg: "error",
                error: "订单状态不正确，无法发货"
            });
        }

        // 7. 拼团订单特殊验证（重要）
        if (order.is_group_buy && order.group_id) {
            // 查询拼团组信息
            const groupBuy = await GroupBuy.findOne({ group_id: order.group_id }).lean();
            
            if (!groupBuy) {
                return res.status(200).json({
                    msg: "error",
                    error: "拼团组不存在，无法发货"
                });
            }

            // 验证拼团组状态：只有成团成功的订单才能发货
            if (groupBuy.status !== 'success') {
                return res.status(200).json({
                    msg: "error",
                    error: "拼团未成团，无法发货"
                });
            }
        }

        // 8. 更新订单状态为 shipped（待收货），记录发货时间
        const currentTime = new Date().getTime();
        await Order.updateOne(
            { order_id: order_id },
            {
                $set: {
                    status: 'shipped',
                    ship_time: currentTime,
                    update_time: currentTime
                }
            }
        );

        res.json({
            msg: "success",
            data: {
                order_id: order_id,
                status: "shipped",
                ship_time: formatDateTime(currentTime)
            }
        });
    } catch (error) {
        console.log('发货失败:', error);
        res.status(200).json({
            msg: "error",
            error: "发货失败"
        });
    }
});

// 确认收货接口（包含资金转账功能）
// POST /order/confirm
router.post('/confirm', async (req, res) => {
    try {
        const { user_id, order_id } = req.body;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
            });
        }

        if (!order_id) {
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
                error: "用户不存在"
            });
        }

        // 3. 查询订单（使用原子操作确保状态一致性）
        const order = await Order.findOne({ 
            order_id: order_id,
            user_id: user_id,  // 确保是买家本人
            status: 'shipped'  // 确保订单状态是待收货
        }).lean();

        if (!order) {
            // 进一步判断是订单不存在、权限不足还是状态错误
            const orderCheck = await Order.findOne({ order_id: order_id }).lean();
            if (!orderCheck) {
                return res.status(200).json({
                    msg: "error",
                    error: "订单不存在"
                });
            }
            if (orderCheck.user_id !== user_id) {
                return res.status(200).json({
                    msg: "error",
                    error: "无权限操作此订单"
                });
            }
            if (orderCheck.status !== 'shipped') {
                return res.status(200).json({
                    msg: "error",
                    error: "订单状态不正确，无法确认收货"
                });
            }
            return res.status(200).json({
                msg: "error",
                error: "订单状态不正确，无法确认收货"
            });
        }

        // 4. 获取商品信息，获取卖家ID
        const goods = await Goods.findOne({ goods_id: order.goods_id }).lean();
        if (!goods) {
            return res.status(200).json({
                msg: "error",
                error: "商品不存在"
            });
        }

        const seller_id = goods.user_id;
        if (!seller_id) {
            return res.status(200).json({
                msg: "error",
                error: "卖家信息异常"
            });
        }

        // 5. 获取订单金额
        const orderAmount = parseFloat(order.total_price || 0);
        if (orderAmount <= 0) {
            return res.status(200).json({
                msg: "error",
                error: "订单金额异常"
            });
        }

        // 6. 确保卖家钱包存在，如果不存在则创建
        let sellerWallet = await Wallet.findOne({ user_id: seller_id }).lean();
        if (!sellerWallet) {
            const { v4: uuidv4 } = await import('uuid');
            const walletId = uuidv4();
            const currentTime = new Date().getTime();
            await Wallet.create({
                wallet_id: walletId,
                user_id: seller_id,
                balance: 0.00,
                create_time: currentTime
            });
            sellerWallet = await Wallet.findOne({ user_id: seller_id }).lean();
        }

        // 7. 使用原子操作更新卖家钱包余额（增加订单金额）
        const walletUpdateResult = await Wallet.findOneAndUpdate(
            { user_id: seller_id },
            { 
                $inc: { balance: orderAmount },
                $set: { update_time: new Date().getTime() }
            },
            { new: true }
        ).lean();

        if (!walletUpdateResult) {
            return res.status(200).json({
                msg: "error",
                error: "更新卖家钱包失败"
            });
        }

        // 8. 使用原子操作更新订单状态为 review（待评价）
        // 只设置 receive_time，不设置 complete_time（评价后才设置）
        const currentTime = new Date().getTime();
        const orderUpdateResult = await Order.findOneAndUpdate(
            { 
                order_id: order_id,
                status: 'shipped'  // 确保状态仍然是 shipped，防止并发问题
            },
            {
                $set: {
                    status: 'review',  // 确认收货后状态为 review（待评价）
                    receive_time: currentTime,  // 确认收货时间
                    // 不更新 complete_time，评价后才更新
                    update_time: currentTime
                }
            },
            { new: true }
        ).lean();

        if (!orderUpdateResult) {
            // 如果订单更新失败，需要回滚钱包余额（由于没有事务，这里只能记录日志）
            // 在实际生产环境中，应该使用支持事务的数据库或分布式锁
            console.error('订单状态更新失败，但钱包余额已增加，订单ID:', order_id);
            // 尝试回滚钱包余额
            await Wallet.findOneAndUpdate(
                { user_id: seller_id },
                { $inc: { balance: -orderAmount } }
            );
            return res.status(200).json({
                msg: "error",
                error: "订单状态更新失败，请重试"
            });
        }

        // 9. 返回成功响应
        res.json({
            msg: "success",
            data: {
                order_id: order.order_id,
                order_no: order.order_no,
                status: "review",  // 返回状态为 review（待评价）
                seller_id: seller_id,
                total_price: parseFloat(orderAmount).toFixed(2),
                seller_balance: parseFloat(walletUpdateResult.balance || 0).toFixed(2),
                receive_time: formatDateTime(currentTime)  // 返回确认收货时间
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
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "未登录"
            });
        }

        if (!order_id) {
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
                error: "用户不存在"
            });
        }

        // 3. 查询订单（先查询订单是否存在）
        const order = await Order.findOne({ order_id: order_id }).lean();

        if (!order) {
            return res.status(200).json({
                msg: "error",
                error: "订单不存在"
            });
        }

        // 4. 验证订单归属（订单不属于当前用户）
        if (order.user_id !== user_id) {
            return res.status(200).json({
                msg: "error",
                error: "无权限支付此订单"
            });
        }

        // 5. 验证订单状态（只有 pending 状态的订单可以支付）
        if (order.status !== 'pending') {
            return res.status(200).json({
                msg: "error",
                error: "订单状态不正确，无法支付"
            });
        }

        // 6. 拼团订单特殊验证
        let groupBuy = null;
        let groupBuyStatus = null;
        const currentTime = new Date().getTime();
        
        if (order.is_group_buy && order.group_id) {
            // 查询拼团组信息
            groupBuy = await GroupBuy.findOne({ group_id: order.group_id }).lean();
            
            if (!groupBuy) {
                return res.status(200).json({
                    msg: "error",
                    error: "拼团组不存在，无法支付"
                });
            }

            // 验证拼团组状态
            if (groupBuy.status === 'failed') {
                return res.status(200).json({
                    msg: "error",
                    error: "拼团已失败，无法支付"
                });
            }

            // 验证拼团组是否过期
            if (groupBuy.expire_time <= currentTime) {
                return res.status(200).json({
                    msg: "error",
                    error: "拼团已过期，无法支付"
                });
            }

            // 验证拼团组是否已满员（查询已支付的订单数量）
            const paidOrderCount = await Order.countDocuments({
                group_id: order.group_id,
                status: 'paid'
            });
            
            // 如果已满员，仍然可以支付（因为可能有人取消了订单）
            // 但需要检查是否真的满员
            if (paidOrderCount >= groupBuy.required_count && groupBuy.status !== 'success') {
                // 如果已满员但状态不是 success，说明可能有人取消了订单，允许支付
                // 这里不做限制，允许支付
            }

            groupBuyStatus = groupBuy.status;
        }

        // 7. 获取或创建钱包
        let wallet = await Wallet.findOne({ user_id: user_id }).lean();
        
        if (!wallet) {
            // 如果钱包不存在，创建新钱包
            const { v4: uuidv4 } = await import('uuid');
            const currentTime = new Date().getTime();
            
            const newWallet = await Wallet.create({
                wallet_id: uuidv4(),
                user_id: user_id,
                balance: 0.00,
                create_time: currentTime,
                update_time: currentTime
            });
            
            wallet = newWallet.toObject();
        }
        
        const balanceBefore = parseFloat(wallet.balance.toFixed(2));
        const orderAmount = parseFloat(order.total_price.toFixed(2));

        // 8. 检查余额是否充足
        if (balanceBefore < orderAmount) {
            return res.status(200).json({
                msg: "error",
                error: "余额不足，请先充值"
            });
        }

        // 9. 计算支付后余额
        const balanceAfter = parseFloat((balanceBefore - orderAmount).toFixed(2));

        // 10. 使用原子操作更新钱包余额（防止并发问题）
        // 注意：MongoDB 单机模式不支持事务，使用原子操作确保数据一致性
        const walletUpdateResult = await Wallet.findOneAndUpdate(
            { 
                user_id: user_id,
                balance: { $gte: orderAmount } // 确保余额足够
            },
            {
                $set: {
                    balance: balanceAfter,
                    update_time: currentTime
                }
            },
            { 
                new: true
            }
        );

        if (!walletUpdateResult) {
            return res.status(200).json({
                msg: "error",
                error: "余额不足，请先充值"
            });
        }

        // 11. 更新订单状态
        await Order.updateOne(
            { order_id: order_id },
            {
                $set: {
                    status: 'paid',
                    pay_time: currentTime,
                    update_time: currentTime
                }
            }
        );

        // 12. 拼团订单支付后的处理
        if (order.is_group_buy && order.group_id && groupBuy) {
            // 查询该拼团组下已支付的订单数量（包括刚刚支付的订单）
            const paidOrderCount = await Order.countDocuments({
                group_id: order.group_id,
                status: 'paid'
            });

            // 更新拼团组的 current_count（基于已支付的订单数量）
            const groupUpdateResult = await GroupBuy.findOneAndUpdate(
                { group_id: order.group_id },
                { 
                    $set: { current_count: paidOrderCount }
                },
                { new: true }
            ).lean();

            if (groupUpdateResult) {
                const newCurrentCount = groupUpdateResult.current_count;
                const requiredCount = groupUpdateResult.required_count;

                // 检查是否成团
                if (newCurrentCount >= requiredCount) {
                    // 成团成功：更新拼团组状态为 success
                    await GroupBuy.findOneAndUpdate(
                        { group_id: order.group_id },
                        {
                            status: 'success',
                            success_time: currentTime
                        }
                    );

                    // 所有已支付的订单状态已经是 paid，无需再次更新
                    groupBuyStatus = 'success';
                } else {
                    groupBuyStatus = 'pending';
                }
            }
        }

        // 13. 创建支付记录
        const { v4: uuidv4 } = await import('uuid');
        await PaymentRecord.create({
            record_id: uuidv4(),
            order_id: order_id,
            user_id: user_id,
            pay_amount: orderAmount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            pay_method: 'wallet',
            pay_time: currentTime,
            status: 'success'
        });

        // 14. 返回成功响应
        const responseData = {
            order_id: order_id,
            order_no: order.order_no || '', // 订单编号（用于支付成功页面显示）
            order_status: "paid",
            pay_amount: orderAmount,
            balance_after: balanceAfter,
            pay_time: formatISO8601(currentTime)
        };

        // 如果是拼团订单，添加拼团状态信息
        if (order.is_group_buy && groupBuyStatus !== null) {
            responseData.group_buy_status = groupBuyStatus;
        }

        res.json({
            msg: "success",
            data: responseData
        });
    } catch (error) {
        console.log('支付订单失败:', error);
        console.log('错误详情:', error.message);
        console.log('错误堆栈:', error.stack);
        res.status(200).json({
            msg: "error",
            error: "服务器异常"
        });
    }
});

// 获取我卖出的数量
router.get('/sold/count', async (req, res) => {
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

        // 3. 获取该用户发布的所有商品ID
        const goodsList = await Goods.find({ user_id: user_id }).select('goods_id').lean();
        const goodsIds = goodsList.map(g => g.goods_id);

        // 4. 统计该用户作为卖家已完成的订单数量
        // 根据文档说明，只统计状态为 completed 或 paid 的订单
        const count = await Order.countDocuments({
            goods_id: { $in: goodsIds },
            status: { $in: ['completed', 'paid'] }
        });

        // 5. 返回成功响应
        res.json({
            msg: "success",
            data: {
                count: count
            }
        });
    } catch (error) {
        console.log('获取我卖出的数量失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

// 获取我买到的数量
router.get('/bought/count', async (req, res) => {
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

        // 3. 统计该用户作为买家已完成的订单数量
        // 根据文档说明，只统计状态为 completed 或 paid 的订单
        const count = await Order.countDocuments({
            user_id: user_id,
            status: { $in: ['completed', 'paid'] }
        });

        // 4. 返回成功响应
        res.json({
            msg: "success",
            data: {
                count: count
            }
        });
    } catch (error) {
        console.log('获取我买到的数量失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

// 检查是否可以评价接口
// GET /order/check-comment
router.get('/check-comment', async (req, res) => {
    try {
        const { user_id, goods_id } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
            });
        }

        if (!goods_id) {
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
                error: "用户不存在"
            });
        }

        // 3. 查询该用户对该商品的待评价订单（status = 'review'）
        const reviewOrder = await Order.findOne({
            user_id: user_id,
            goods_id: goods_id,
            status: 'review'  // 查询待评价状态的订单
        })
        .sort({ receive_time: -1 }) // 按确认收货时间倒序，获取最新的待评价订单
        .lean();

        if (!reviewOrder) {
            // 没有待评价的订单，不能评价
            return res.json({
                msg: "success",
                data: {
                    can_comment: false,
                    order_id: null,
                    receive_time: null,
                    has_comment: false
                }
            });
        }

        // 4. 检查该订单是否已有评价
        const existingComment = await Comment.findOne({ 
            order_id: reviewOrder.order_id 
        }).lean();

        const hasComment = !!existingComment;

        // 5. 如果有评价，不能再次评价
        if (hasComment) {
            return res.json({
                msg: "success",
                data: {
                    can_comment: false,
                    order_id: reviewOrder.order_id,
                    receive_time: reviewOrder.receive_time ? formatDateTime(reviewOrder.receive_time) : null,
                    has_comment: true
                }
            });
        }

        // 6. 没有评价，可以评价
        res.json({
            msg: "success",
            data: {
                can_comment: true,
                order_id: reviewOrder.order_id,
                receive_time: reviewOrder.receive_time ? formatDateTime(reviewOrder.receive_time) : null,
                has_comment: false
            }
        });
    } catch (error) {
        console.log('检查是否可以评价失败:', error);
        res.status(200).json({
            msg: "error",
            error: "检查失败"
        });
    }
});

// 待处理事项统计接口
// GET /order/pending-count
router.get('/pending-count', async (req, res) => {
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

        // 3. 获取该用户发布的所有商品ID（用于查询卖家订单）
        const goodsList = await Goods.find({ user_id: user_id }).select('goods_id').lean();
        const goodsIds = goodsList.map(g => g.goods_id);

        // 4. 统计待发货数量（卖家：状态为 paid 的订单）
        const pendingShipCount = goodsIds.length > 0 
            ? await Order.countDocuments({
                goods_id: { $in: goodsIds },
                status: 'paid'
            })
            : 0;

        // 5. 统计待收货数量（买家：状态为 shipped 的订单）
        const pendingReceiveCount = await Order.countDocuments({
            user_id: user_id,
            status: 'shipped'
        });

        // 6. 统计待评价数量（买家：状态为 review 的订单）
        const pendingReviewCount = await Order.countDocuments({
            user_id: user_id,
            status: 'review'
        });

        // 7. 返回成功响应
        res.json({
            msg: "success",
            data: {
                pending_ship_count: pendingShipCount,
                pending_receive_count: pendingReceiveCount,
                pending_review_count: pendingReviewCount
            }
        });
    } catch (error) {
        console.log('获取待处理事项统计失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

module.exports = router;






