const express = require('express');
const router = express.Router();
const { SystemAnnouncement } = require('../db');

// 用户获取系统公告列表
// GET /announcement/list?page=&pageSize=
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
            .select('announcement_id title content admin_name create_time')
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

// 用户获取系统公告详情
// GET /announcement/detail?announcement_id=
router.get('/detail', async (req, res) => {
    try {
        const { announcement_id } = req.query;
        if (!announcement_id) {
            return res.status(200).json({ msg: 'error', error: '公告ID不能为空' });
        }

        const detail = await SystemAnnouncement.findOne({ announcement_id: String(announcement_id) })
            .select('announcement_id title content admin_name create_time')
            .lean();

        if (!detail) {
            return res.status(200).json({ msg: 'error', error: '公告不存在' });
        }

        return res.json({ msg: 'success', data: detail });
    } catch (error) {
        console.log('获取系统公告详情失败:', error);
        return res.status(200).json({ msg: 'error', error: '获取失败' });
    }
});

module.exports = router;



