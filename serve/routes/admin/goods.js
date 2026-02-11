const express = require('express');
const router = express.Router();
const { Goods, SystemAnnouncement, User, AdminUser, OperationLog } = require('../../db');

// 简单的日志ID生成器
const generateLogId = () => {
    const random = Math.random().toString(36).slice(2, 8);
    return `log_${Date.now()}_${random}`;
};

// 处理图片URL，确保返回完整的OSS URL
const processImageUrls = (images) => {
    if (!images) return [];
    let imageList = [];
    if (Array.isArray(images)) {
        imageList = images;
    } else if (typeof images === 'string') {
        try {
            const parsed = JSON.parse(images);
            if (Array.isArray(parsed)) {
                imageList = parsed;
            } else {
                imageList = [images];
            }
        } catch (e) {
            imageList = [images];
        }
    }
    return imageList.map(url => {
        if (!url || typeof url !== 'string') return '';
        const trimmedUrl = url.trim();
        if (trimmedUrl.startsWith('https://')) {
            return trimmedUrl;
        }
        if (trimmedUrl.startsWith('http://')) {
            return trimmedUrl.replace('http://', 'https://');
        }
        if (trimmedUrl.startsWith('/')) {
            return trimmedUrl;
        }
        const ossDomain = process.env.OSS_DOMAIN || '';
        if (ossDomain && trimmedUrl) {
            let finalDomain = ossDomain.trim();
            if (finalDomain.startsWith('http://')) {
                finalDomain = finalDomain.replace('http://', 'https://');
            } else if (!finalDomain.startsWith('https://') && !finalDomain.startsWith('http://')) {
                finalDomain = 'https://' + finalDomain;
            }
            if (!finalDomain.endsWith('/')) {
                finalDomain += '/';
            }
            return finalDomain + trimmedUrl;
        }
        return trimmedUrl;
    }).filter(url => url);
};

// 管理员设置商品热度加分接口
// POST /admin/goods/setHeatBonus
router.post('/setHeatBonus', async (req, res) => {
    try {
        const { goods_id, admin_heat_bonus, admin_id } = req.body;

        // 1. 参数验证
        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "商品ID不能为空"
            });
        }

        if (admin_heat_bonus === undefined || admin_heat_bonus === null) {
            return res.status(200).json({
                msg: "error",
                error: "热度加分不能为空"
            });
        }

        // 2. 验证热度加分必须是数字
        const bonusNum = Number(admin_heat_bonus);
        if (isNaN(bonusNum)) {
            return res.status(200).json({
                msg: "error",
                error: "热度加分必须是数字"
            });
        }

        // 3. 验证热度加分范围（允许负数，但设置一个合理范围，比如-10000到10000）
        if (bonusNum < -10000 || bonusNum > 10000) {
            return res.status(200).json({
                msg: "error",
                error: "热度加分必须在-10000到10000之间"
            });
        }

        // 4. 查询商品是否存在
        const goods = await Goods.findOne({ goods_id: goods_id });
        if (!goods) {
            return res.status(200).json({
                msg: "error",
                error: "商品不存在"
            });
        }

        // 5. 更新商品的热度加分
        goods.admin_heat_bonus = Math.floor(bonusNum);
        await goods.save();

        // 6. 记录操作日志
        try {
            let adminName = '';
            if (admin_id) {
                const admin = await AdminUser.findOne({ admin_id: String(admin_id) }).lean();
                if (admin) {
                    adminName = admin.name || '';
                }
            }
            await OperationLog.create({
                log_id: generateLogId(),
                admin_id: admin_id ? String(admin_id) : '',
                admin_name: adminName,
                action: 'set_heat_bonus',
                description: `管理员 ${adminName || admin_id || '未知'} 为商品（${goods.description || goods.goods_id}）设置热度加分为 ${goods.admin_heat_bonus}`,
                create_time: Date.now()
            });
        } catch (logErr) {
            console.log('记录设置热度加分日志失败:', logErr);
        }

        // 7. 返回成功响应
        res.json({
            msg: "success",
            data: {
                goods_id: goods_id,
                admin_heat_bonus: goods.admin_heat_bonus,
                message: "热度加分设置成功"
            }
        });
    } catch (error) {
        console.log('设置商品热度加分失败:', error);
        res.status(200).json({
            msg: "error",
            error: "设置失败"
        });
    }
});

// 管理员获取商品列表接口（用于商品管理 & 热度控制）
// GET /admin/goods/list
router.get('/list', async (req, res) => {
    try {
        const { page = 1, pageSize = 20, keyword = '', status } = req.query;

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
        if (keyword && keyword.trim()) {
            query.description = { $regex: keyword.trim(), $options: 'i' };
        }

        // 根据 status 进行状态过滤：
        // - 未传 / 为空：默认只查在售（兼容“热度控制”页面）
        // - status = 'on_sale'：只查在售
        // - status = 'off_shelf'：只查已下架
        // - status = 'all'：不过滤状态，查全部
        if (status && status !== 'all') {
            query.status = status;
        } else if (!status) {
            query.status = 'on_sale';
        }

        // 3. 查询商品列表
        const skip = (pageNum - 1) * pageSizeNum;

        const goodsList = await Goods.find(query)
            .sort({ create_time: -1 })
            .skip(skip)
            .limit(pageSizeNum)
            .lean();

        // 4. 获取总数
        const total = await Goods.countDocuments(query);

        // 5. 组装返回数据
        const result = goodsList.map(goods => {
            const processedImages = processImageUrls(goods.images);
            return {
                goods_id: goods.goods_id,
                description: goods.description,
                price: goods.price,
                category_id: goods.category_id,
                sales_count: goods.sales_count || 0,
                group_buy_count: goods.group_buy_count || null,
                create_time: goods.create_time,
                admin_heat_bonus: goods.admin_heat_bonus || 0,
                status: goods.status || 'on_sale',
                images: processedImages
            };
        });

        // 6. 返回成功响应
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
            error: "获取失败"
        });
    }
});

// 管理员获取商品详情接口（包含热度信息）
// GET /admin/goods/detail
router.get('/detail', async (req, res) => {
    try {
        const { goods_id } = req.query;

        if (!goods_id) {
            return res.status(200).json({
                msg: "error",
                error: "商品ID不能为空"
            });
        }

        // 查询商品信息
        const goods = await Goods.findOne({ goods_id: goods_id }).lean();
        if (!goods) {
            return res.status(200).json({
                msg: "error",
                error: "商品不存在"
            });
        }

        const processedImages = processImageUrls(goods.images);

        // 返回商品详情
        res.json({
            msg: "success",
            data: {
                goods_id: goods.goods_id,
                description: goods.description,
                price: goods.price,
                category_id: goods.category_id,
                sales_count: goods.sales_count || 0,
                group_buy_count: goods.group_buy_count || null,
                create_time: goods.create_time,
                admin_heat_bonus: goods.admin_heat_bonus || 0,
                status: goods.status || 'on_sale',
                images: processedImages
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

// 管理员下架商品
// POST /admin/goods/offShelf
router.post('/offShelf', async (req, res) => {
    try {
        const { goods_id, admin_id, reason } = req.body;
        if (!goods_id) {
            return res.status(200).json({ msg: 'error', error: '商品ID不能为空' });
        }

        const goods = await Goods.findOne({ goods_id }).lean();
        if (!goods) {
            return res.status(200).json({ msg: 'error', error: '商品不存在' });
        }

        // 需求更新：管理员下架后，直接删除数据库中的商品记录，
        // 避免首页等列表继续展示该商品。
        await Goods.deleteOne({ goods_id });

        // 查询发布者用户
        const user = await User.findOne({ user_id: String(goods.user_id) }).lean();

        // 查管理员信息（可选）
        let adminName = '';
        let adminInfo = null;
        if (admin_id) {
            adminInfo = await AdminUser.findOne({ admin_id: String(admin_id) }).lean();
            adminName = adminInfo?.name || '';
        }

        // 给该用户发送一条系统公告（仅该用户可见）
        if (user) {
            const now = Date.now();
            const title = '商品违规下架通知';
            const desc = goods.description || '';
            const reasonText = reason && reason.trim()
                ? `原因：${reason.trim()}`
                : '原因：涉嫌违规，请联系管理员了解详情。';
            const content =
`您发布的商品已被平台管理员下架：
商品描述：${desc}
${reasonText}`;

            await SystemAnnouncement.create({
                announcement_id: 'off_shelf_' + goods.goods_id,
                title,
                content,
                admin_id: admin_id ? String(admin_id) : '',
                admin_name: adminName,
                target_user_id: String(goods.user_id),
                create_time: now,
                update_time: now
            });
        }

        // 记录“下架商品”操作日志
        try {
            const nowForLog = Date.now();
            await OperationLog.create({
                log_id: generateLogId(),
                admin_id: admin_id ? String(admin_id) : '',
                admin_name: adminName,
                action: 'off_shelf',
                description: `管理员 ${adminName || admin_id || '未知'} 下架并删除了商品（${goods.description || goods.goods_id}），原因：${reason && reason.trim() ? reason.trim() : '未填写'}`,
                create_time: nowForLog
            });
        } catch (logErr) {
            console.log('记录下架商品日志失败:', logErr);
        }

        return res.json({ msg: 'success', data: { goods_id, message: '下架成功' } });
    } catch (error) {
        console.log('下架商品失败:', error);
        return res.status(200).json({ msg: 'error', error: '下架失败' });
    }
});

module.exports = router;






