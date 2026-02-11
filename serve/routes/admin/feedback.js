const express = require('express');
const router = express.Router();
const { Feedback, SystemAnnouncement, AdminUser } = require('../../db');

// 管理员获取反馈列表
// GET /admin/feedback/list?status=pending|resolved|all
router.get('/list', async (req, res) => {
    try {
        const { page = 1, pageSize = 20, status = 'all' } = req.query;
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;

        if (pageNum < 1) {
            return res.status(200).json({ msg: 'error', error: '页码必须大于0' });
        }
        if (pageSizeNum < 1 || pageSizeNum > 100) {
            return res.status(200).json({ msg: 'error', error: '每页数量必须在1-100之间' });
        }

        const query = {};
        if (status === 'pending') {
            query.status = 'pending';
        } else if (status === 'resolved') {
            query.status = 'resolved';
        }

        const skip = (pageNum - 1) * pageSizeNum;
        const list = await Feedback.find(query)
            .sort({ create_time: -1 })
            .skip(skip)
            .limit(pageSizeNum)
            .lean();

        const total = await Feedback.countDocuments(query);

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
        console.log('获取反馈列表失败:', error);
        return res.status(200).json({ msg: 'error', error: '获取失败' });
    }
});

// 管理员获取反馈详情
// GET /admin/feedback/detail?feedback_id=
router.get('/detail', async (req, res) => {
    try {
        const { feedback_id } = req.query;
        if (!feedback_id) {
            return res.status(200).json({ msg: 'error', error: '反馈ID不能为空' });
        }

        const doc = await Feedback.findById(feedback_id).lean();
        if (!doc) {
            return res.status(200).json({ msg: 'error', error: '反馈不存在' });
        }

        return res.json({ msg: 'success', data: doc });
    } catch (error) {
        console.log('获取反馈详情失败:', error);
        return res.status(200).json({ msg: 'error', error: '获取失败' });
    }
});

// 管理员回复反馈
// POST /admin/feedback/reply
router.post('/reply', async (req, res) => {
    try {
        const { feedback_id, reply_content, admin_id } = req.body;
        if (!feedback_id) {
            return res.status(200).json({ msg: 'error', error: '反馈ID不能为空' });
        }
        if (!reply_content || typeof reply_content !== 'string' || reply_content.trim().length === 0) {
            return res.status(200).json({ msg: 'error', error: '回复内容不能为空' });
        }

        const feedback = await Feedback.findById(feedback_id);
        if (!feedback) {
            return res.status(200).json({ msg: 'error', error: '反馈不存在' });
        }

        const trimmedReply = reply_content.trim();
        const now = Date.now();

        // 查管理员信息（可选）
        let adminName = '';
        if (admin_id) {
            const admin = await AdminUser.findOne({ admin_id: String(admin_id) }).lean();
            adminName = admin?.name || '';
        }

        // 更新反馈状态
        feedback.status = 'resolved';
        feedback.admin_reply = trimmedReply;
        feedback.reply_time = now;
        feedback.update_time = now;
        await feedback.save();

        // 为该反馈创建一条“只对该用户可见”的系统公告
        await SystemAnnouncement.create({
            announcement_id: 'fb_reply_' + feedback._id.toString(),
            title: '问题反馈回复',
            content: trimmedReply,
            admin_id: admin_id ? String(admin_id) : '',
            admin_name: adminName,
            target_user_id: feedback.user_id, // 只给该用户可见
            create_time: now,
            update_time: now
        });

        return res.json({
            msg: 'success',
            data: { message: '回复成功' }
        });
    } catch (error) {
        console.log('回复问题反馈失败:', error);
        return res.status(200).json({ msg: 'error', error: '回复失败' });
    }
});

module.exports = router;





