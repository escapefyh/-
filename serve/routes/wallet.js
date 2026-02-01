const express = require('express');
const router = express.Router();
const { User, Wallet, RechargeRecord } = require('../db');

// 格式化时间戳为 ISO 8601 格式
const formatISO8601 = (timestamp) => {
    return new Date(timestamp).toISOString();
};

// 生成充值订单ID（格式：RCH + 年月日 + 时间戳后9位 + 随机数3位）
const generateRechargeOrderId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = String(now.getTime()).slice(-9);
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `RCH${year}${month}${day}${timestamp}${random}`;
};

// 获取或创建钱包（如果用户首次查询，自动创建钱包）
const getOrCreateWallet = async (userId) => {
    let wallet = await Wallet.findOne({ user_id: userId }).lean();
    
    if (!wallet) {
        // 如果钱包不存在，创建新钱包
        const { v4: uuidv4 } = await import('uuid');
        const currentTime = new Date().getTime();
        
        const newWallet = await Wallet.create({
            wallet_id: uuidv4(),
            user_id: userId,
            balance: 0.00,
            create_time: currentTime,
            update_time: currentTime
        });
        
        return newWallet.toObject();
    }
    
    return wallet;
};

// 获取钱包余额接口
// GET /wallet/balance
router.get('/balance', async (req, res) => {
    try {
        const { user_id } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "未登录"
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

        // 3. 获取或创建钱包
        const wallet = await getOrCreateWallet(user_id);

        // 4. 返回余额（保留2位小数）
        res.json({
            msg: "success",
            data: {
                balance: parseFloat(wallet.balance.toFixed(2))
            }
        });
    } catch (error) {
        console.log('获取钱包余额失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取余额失败"
        });
    }
});

// 充值接口（模拟充值）
// POST /wallet/recharge
router.post('/recharge', async (req, res) => {
    try {
        const { user_id, amount } = req.body;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "未登录"
            });
        }

        // 验证充值金额
        if (amount === undefined || amount === null) {
            return res.status(200).json({
                msg: "error",
                error: "充值金额格式错误"
            });
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(200).json({
                msg: "error",
                error: "充值金额无效"
            });
        }

        // 限制单次充值金额在 1-10000 元之间
        if (amountNum < 1 || amountNum > 10000) {
            return res.status(200).json({
                msg: "error",
                error: "充值金额必须在1-10000元之间"
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

        // 3. 获取或创建钱包
        const wallet = await getOrCreateWallet(user_id);
        const balanceBefore = parseFloat(wallet.balance.toFixed(2));

        // 4. 计算新余额
        const balanceAfter = parseFloat((balanceBefore + amountNum).toFixed(2));

        // 5. 生成充值订单ID
        const { v4: uuidv4 } = await import('uuid');
        const recordId = uuidv4();
        let orderId = generateRechargeOrderId();
        
        // 确保订单ID唯一（如果重复则重新生成）
        let orderIdExists = await RechargeRecord.findOne({ order_id: orderId });
        let retryCount = 0;
        while (orderIdExists && retryCount < 10) {
            orderId = generateRechargeOrderId();
            orderIdExists = await RechargeRecord.findOne({ order_id: orderId });
            retryCount++;
        }

        const currentTime = new Date().getTime();

        // 6. 更新钱包余额（使用原子操作）
        await Wallet.findOneAndUpdate(
            { user_id: user_id },
            {
                $set: {
                    balance: balanceAfter,
                    update_time: currentTime
                }
            }
        );

        // 7. 创建充值记录
        await RechargeRecord.create({
            record_id: recordId,
            order_id: orderId,
            user_id: user_id,
            amount: parseFloat(amountNum.toFixed(2)),
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            create_time: currentTime,
            status: 'success'
        });

        // 8. 返回成功响应
        res.json({
            msg: "success",
            data: {
                order_id: orderId,
                amount: parseFloat(amountNum.toFixed(2)),
                balance: balanceAfter,
                create_time: formatISO8601(currentTime)
            }
        });
    } catch (error) {
        console.log('充值失败:', error);
        res.status(200).json({
            msg: "error",
            error: "充值失败"
        });
    }
});

module.exports = router;












