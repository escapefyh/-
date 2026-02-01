const { GroupBuy, Order, Wallet } = require('../db');

/**
 * 处理过期的拼团组
 * 执行频率：建议每分钟执行一次
 */
async function processExpiredGroupBuys() {
    try {
        const currentTime = new Date().getTime();

        // 1. 查询所有状态为 pending 且已过期的拼团组
        const expiredGroups = await GroupBuy.find({
            status: 'pending',
            expire_time: { $lte: currentTime }
        }).lean();

        if (expiredGroups.length === 0) {
            console.log(`[${new Date().toISOString()}] 没有过期的拼团组需要处理`);
            return;
        }

        console.log(`[${new Date().toISOString()}] 发现 ${expiredGroups.length} 个过期的拼团组，开始处理...`);

        // 2. 处理每个过期的拼团组
        for (const group of expiredGroups) {
            try {
                // 2.1 更新拼团组状态为 failed
                await GroupBuy.findOneAndUpdate(
                    { group_id: group.group_id },
                    { status: 'failed' }
                );

                // 2.2 查询该拼团组下的所有订单
                const orders = await Order.find({
                    group_id: group.group_id
                }).lean();

                // 2.3 处理每个订单
                for (const order of orders) {
                    if (order.status === 'pending') {
                        // 未付款的订单，直接更新为 cancelled
                        await Order.findOneAndUpdate(
                            { order_id: order.order_id },
                            { status: 'cancelled' }
                        );
                    } else if (order.status === 'paid') {
                        // 已付款的订单，需要退款
                        // 更新订单状态为 cancelled
                        await Order.findOneAndUpdate(
                            { order_id: order.order_id },
                            { status: 'cancelled' }
                        );

                        // 执行退款操作：将订单金额退回用户钱包
                        try {
                            // 查找或创建用户钱包
                            let wallet = await Wallet.findOne({ user_id: order.user_id }).lean();
                            
                            if (!wallet) {
                                // 如果钱包不存在，创建钱包
                                const { v4: uuidv4 } = await import('uuid');
                                const walletId = uuidv4();
                                await Wallet.create({
                                    wallet_id: walletId,
                                    user_id: order.user_id,
                                    balance: order.total_price
                                });
                                console.log(`[退款] 用户 ${order.user_id} 钱包不存在，已创建并退款 ${order.total_price} 元`);
                            } else {
                                // 如果钱包存在，增加余额
                                await Wallet.findOneAndUpdate(
                                    { user_id: order.user_id },
                                    { $inc: { balance: order.total_price } }
                                );
                                console.log(`[退款] 用户 ${order.user_id} 已退款 ${order.total_price} 元`);
                            }
                        } catch (refundError) {
                            console.error(`[退款失败] 订单 ${order.order_id} 退款失败:`, refundError);
                            // 退款失败不影响其他订单的处理，继续处理下一个订单
                        }
                    }
                }

                console.log(`[处理完成] 拼团组 ${group.group_id} 已处理，共 ${orders.length} 个订单`);
            } catch (groupError) {
                console.error(`[处理失败] 拼团组 ${group.group_id} 处理失败:`, groupError);
                // 继续处理下一个拼团组
            }
        }

        console.log(`[${new Date().toISOString()}] 过期拼团组处理完成`);
    } catch (error) {
        console.error(`[定时任务错误] 处理过期拼团组失败:`, error);
    }
}

// 导出函数
module.exports = processExpiredGroupBuys;







