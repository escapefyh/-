const express = require('express');
const router = express.Router();
const { SystemAnnouncement, AdminUser } = require('../../db');

// 简单生成唯一ID（避免引入 ESM 版 uuid 与 CommonJS 冲突）
const generateAnnouncementId = () => {
    return 'ann_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
};

// 管理员发布系统公告
// POST /admin/announcement/create
router.post('/create', async (req, res) => {
    try {
        const { title, content, admin_id } = req.body;

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(200).json({ msg: 'error', error: '标题不能为空' });
        }
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(200).json({ msg: 'error', error: '内容不能为空' });
        }

        const trimmedTitle = title.trim();
        const trimmedContent = content.trim();

        if (trimmedTitle.length > 100) {
            return res.status(200).json({ msg: 'error', error: '标题长度不能超过100个字符' });
        }

        // admin_id 可选：如果传了就记录管理员信息
        let adminName = '';
        if (admin_id) {
            const admin = await AdminUser.findOne({ admin_id: String(admin_id) }).lean();
            adminName = admin?.name || '';
        }

        const now = Date.now();
        const announcementId = generateAnnouncementId();

        await SystemAnnouncement.create({
            announcement_id: announcementId,
            title: trimmedTitle,
            content: trimmedContent,
            admin_id: admin_id ? String(admin_id) : '',
            admin_name: adminName,
            create_time: now,
            update_time: now
        });

        return res.json({
            msg: 'success',
            data: {
                announcement_id: announcementId,
                message: '公告发布成功'
            }
        });
    } catch (error) {
        console.log('发布系统公告失败:', error);
        return res.status(200).json({ msg: 'error', error: '发布失败' });
    }
});

// 管理员获取公告列表
// GET /admin/announcement/list?page=&pageSize=
router.get('/list', async (req, res) => {
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
        const list = await SystemAnnouncement.find({})
            .sort({ create_time: -1 })
            .skip(skip)
            .limit(pageSizeNum)
            .lean();

        const total = await SystemAnnouncement.countDocuments({});

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
        console.log('获取系统公告列表失败:', error);
        return res.status(200).json({ msg: 'error', error: '获取失败' });
    }
});

// 管理员获取公告详情
// GET /admin/announcement/detail?announcement_id=
router.get('/detail', async (req, res) => {
    try {
        const { announcement_id } = req.query;
        if (!announcement_id) {
            return res.status(200).json({ msg: 'error', error: '公告ID不能为空' });
        }

        const detail = await SystemAnnouncement.findOne({ announcement_id: String(announcement_id) }).lean();
        if (!detail) {
            return res.status(200).json({ msg: 'error', error: '公告不存在' });
        }

        return res.json({ msg: 'success', data: detail });
    } catch (error) {
        console.log('获取系统公告详情失败:', error);
        return res.status(200).json({ msg: 'error', error: '获取失败' });
    }
});

// 管理员删除公告
// POST /admin/announcement/delete
router.post('/delete', async (req, res) => {
    try {
        const { announcement_id } = req.body;
        if (!announcement_id) {
            return res.status(200).json({ msg: 'error', error: '公告ID不能为空' });
        }

        const result = await SystemAnnouncement.deleteOne({ announcement_id: String(announcement_id) });
        if (result.deletedCount === 0) {
            return res.status(200).json({ msg: 'error', error: '删除失败：公告不存在' });
        }

        return res.json({ msg: 'success', data: { message: '删除成功' } });
    } catch (error) {
        console.log('删除系统公告失败:', error);
        return res.status(200).json({ msg: 'error', error: '删除失败' });
    }
});

module.exports = router;



