const express = require('express');
const router = express.Router();
const { AdminUser, OperationLog } = require('../../db');

// 简单的日志ID生成器
const generateLogId = () => {
    const random = Math.random().toString(36).slice(2, 8);
    return `log_${Date.now()}_${random}`;
};

// 管理员修改密码
// POST /admin/settings/changePassword
router.post('/changePassword', async (req, res) => {
    try {
        const { admin_id, old_password, new_password } = req.body;

        if (!admin_id) {
            return res.status(200).json({ msg: 'error', error: '管理员ID不能为空' });
        }
        if (!old_password || typeof old_password !== 'string' || !old_password.trim()) {
            return res.status(200).json({ msg: 'error', error: '原密码不能为空' });
        }
        if (!new_password || typeof new_password !== 'string' || !new_password.trim()) {
            return res.status(200).json({ msg: 'error', error: '新密码不能为空' });
        }

        const trimmedNew = new_password.trim();
        if (trimmedNew.length < 6 || trimmedNew.length > 20) {
            return res.status(200).json({
                msg: 'error',
                error: '新密码长度应在6-20个字符之间'
            });
        }

        // 查询管理员
        const admin = await AdminUser.findOne({ admin_id: String(admin_id) });
        if (!admin) {
            return res.status(200).json({ msg: 'error', error: '管理员不存在' });
        }

        // 校验原密码
        if (admin.password !== old_password.trim()) {
            return res.status(200).json({ msg: 'error', error: '原密码错误' });
        }

        // 更新密码
        admin.password = trimmedNew;
        admin.update_time = Date.now();
        await admin.save();

        // 记录操作日志
        const now = Date.now();
        await OperationLog.create({
            log_id: generateLogId(),
            admin_id: String(admin.admin_id),
            admin_name: admin.name || '',
            action: 'change_password',
            description: `管理员 ${admin.name || admin.account} 修改了登录密码`,
            create_time: now
        });

        return res.json({
            msg: 'success',
            data: {
                admin_id: admin.admin_id,
                message: '密码修改成功'
            }
        });
    } catch (error) {
        console.log('管理员修改密码失败:', error);
        return res.status(200).json({ msg: 'error', error: '修改失败' });
    }
});

// 管理系统操作日志列表
// GET /admin/settings/logs
router.get('/logs', async (req, res) => {
    try {
        const { page = 1, pageSize = 20 } = req.query;

        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;

        if (pageNum < 1) {
            return res.status(200).json({ msg: 'error', error: '页码必须大于0' });
        }
        if (pageSizeNum < 1 || pageSizeNum > 100) {
            return res.status(200).json({ msg: 'error', error: '每页数量必须在1-100之间' });
        }

        const skip = (pageNum - 1) * pageSizeNum;

        const logs = await OperationLog.find({})
            .sort({ create_time: -1 })
            .skip(skip)
            .limit(pageSizeNum)
            .lean();

        const total = await OperationLog.countDocuments({});

        const list = logs.map(log => ({
            log_id: log.log_id,
            admin_id: log.admin_id,
            admin_name: log.admin_name,
            action: log.action,
            description: log.description,
            create_time: log.create_time
        }));

        return res.json({
            msg: 'success',
            data: {
                list,
                total,
                page: pageNum,
                pageSize: pageSizeNum
            }
        });
    } catch (error) {
        console.log('获取操作日志失败:', error);
        return res.status(200).json({ msg: 'error', error: '获取失败' });
    }
});

module.exports = router;


