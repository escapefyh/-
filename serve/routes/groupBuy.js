const express = require('express');
const router = express.Router();
const { User, Goods, GroupBuyOrder, GroupBuyParticipant } = require('../db');

// 获取当前拼团人数
router.get('/getCurrentCount', async (req, res) => {
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

        // 3. 检查商品是否开启拼团功能
        if (!goods.group_buy_enabled) {
            return res.status(200).json({
                msg: "error",
                error: "该商品未开启拼团功能"
            });
        }

        // 4. 查询所有拼团中的订单（状态为pending且未过期）
        const currentTime = new Date().getTime();
        const pendingOrders = await GroupBuyOrder.find({
            goods_id: goods_id,
            status: 'pending',
            $or: [
                { expire_time: null },
                { expire_time: { $gt: currentTime } }
            ]
        }).lean();

        // 5. 统计所有拼团中的人数（使用聚合查询提高效率）
        if (pendingOrders.length === 0) {
            return res.json({
                msg: "success",
                data: {
                    goods_id: goods_id,
                    count: 0,
                    message: "当前有0人正在拼团"
                }
            });
        }

        const groupBuyIds = pendingOrders.map(order => order.group_buy_id);
        const totalCount = await GroupBuyParticipant.countDocuments({
            group_buy_id: { $in: groupBuyIds }
        });

        // 6. 返回成功响应
        res.json({
            msg: "success",
            data: {
                goods_id: goods_id,
                count: totalCount,
                message: `当前有${totalCount}人正在拼团`
            }
        });
    } catch (error) {
        console.log('获取拼团人数失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

// 拼团购买
router.post('/create', async (req, res) => {
    try {
        const { user_id, goods_id, quantity = 1, join_group_id } = req.body;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "商品ID不能为空"
            });
        }

        // 验证购买数量
        const quantityNum = parseInt(quantity);
        if (isNaN(quantityNum) || quantityNum < 1 || quantityNum > 999) {
            return res.status(200).json({
                msg: "error",
                error: "购买数量必须在1-999之间"
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

        // 3. 验证商品是否存在并检查拼团设置
        const goods = await Goods.findOne({ goods_id: goods_id }).lean();
        if (!goods) {
            return res.status(200).json({
                msg: "error",
                error: "商品不存在"
            });
        }

        if (!goods.group_buy_enabled) {
            return res.status(200).json({
                msg: "error",
                error: "该商品未开启拼团功能"
            });
        }

        if (!goods.group_buy_count || !goods.group_buy_discount) {
            return res.status(200).json({
                msg: "error",
                error: "商品拼团设置不完整"
            });
        }

        const targetCount = goods.group_buy_count;
        const currentTime = new Date().getTime();

        // 4. 生成订单ID
        const { v4: uuidv4 } = await import('uuid');
        const order_id = uuidv4();

        let groupBuyId;
        let currentCount;
        let isNewGroup = false;

        // 5. 处理拼团逻辑
        if (join_group_id) {
            // 加入已有拼团
            const existingGroup = await GroupBuyOrder.findOne({
                group_buy_id: join_group_id,
                goods_id: goods_id,
                status: 'pending'
            }).lean();

            if (!existingGroup) {
                return res.status(200).json({
                    msg: "error",
                    error: "拼团不存在或已结束"
                });
            }

            // 检查是否过期
            if (existingGroup.expire_time && existingGroup.expire_time <= currentTime) {
                return res.status(200).json({
                    msg: "error",
                    error: "拼团已过期"
                });
            }

            // 检查是否已满
            if (existingGroup.current_count >= targetCount) {
                return res.status(200).json({
                    msg: "error",
                    error: "拼团已满"
                });
            }

            // 检查用户是否已经参与该拼团
            const existingParticipant = await GroupBuyParticipant.findOne({
                group_buy_id: join_group_id,
                user_id: user_id
            }).lean();

            if (existingParticipant) {
                return res.status(200).json({
                    msg: "error",
                    error: "您已参与该拼团"
                });
            }

            groupBuyId = join_group_id;
            currentCount = existingGroup.current_count + 1;

            // 更新拼团订单的当前人数
            await GroupBuyOrder.updateOne(
                { group_buy_id: join_group_id },
                {
                    $set: {
                        current_count: currentCount,
                        update_time: currentTime
                    }
                }
            );

            // 如果达到目标人数，更新状态为成功
            if (currentCount >= targetCount) {
                await GroupBuyOrder.updateOne(
                    { group_buy_id: join_group_id },
                    {
                        $set: {
                            status: 'success',
                            update_time: currentTime
                        }
                    }
                );
            }
        } else {
            // 创建新拼团
            groupBuyId = uuidv4();
            currentCount = 1;
            isNewGroup = true;

            // 设置拼团过期时间（24小时后过期，可根据需求调整）
            const expireTime = currentTime + 24 * 60 * 60 * 1000;

            // 创建拼团订单
            await GroupBuyOrder.create({
                group_buy_id: groupBuyId,
                goods_id: goods_id,
                user_id: user_id,
                target_count: targetCount,
                current_count: 1,
                status: 'pending',
                expire_time: expireTime,
                create_time: currentTime
            });
        }

        // 6. 创建参与者记录
        await GroupBuyParticipant.create({
            group_buy_id: groupBuyId,
            user_id: user_id,
            order_id: order_id,
            join_time: currentTime
        });

        // 7. 更新商品销量（使用原子操作）
        await Goods.findOneAndUpdate(
            { goods_id: goods_id },
            {
                $inc: { sales_count: quantityNum }
            }
        );

        // 8. 计算还需人数
        const remainingCount = targetCount - currentCount;
        const message = remainingCount > 0 
            ? `拼团订单创建成功，还需${remainingCount}人即可成团`
            : '拼团订单创建成功，拼团已完成';

        // 9. 返回成功响应
        res.json({
            msg: "success",
            data: {
                group_buy_id: groupBuyId,
                order_id: order_id,
                current_count: currentCount,
                target_count: targetCount,
                message: message
            }
        });
    } catch (error) {
        console.log('创建拼团订单失败:', error);
        res.status(200).json({
            msg: "error",
            error: "创建失败"
        });
    }
});

module.exports = router;

