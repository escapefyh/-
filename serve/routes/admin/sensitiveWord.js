const express = require('express');
const router = express.Router();
const { SensitiveWord } = require('../../db');

// 创建敏感词
// POST /admin/sensitive-word/create
router.post('/create', async (req, res) => {
    try {
        const { word, remark } = req.body;

        if (!word || typeof word !== 'string' || word.trim().length === 0) {
            return res.status(200).json({
                msg: 'error',
                error: '敏感词不能为空'
            });
        }

        const trimmed = word.trim();

        if (trimmed.length > 50) {
            return res.status(200).json({
                msg: 'error',
                error: '敏感词长度不能超过50个字符'
            });
        }

        // 检查是否已存在（忽略大小写）
        const exists = await SensitiveWord.findOne({ word: trimmed }).lean();
        if (exists) {
            return res.status(200).json({
                msg: 'error',
                error: '该敏感词已存在'
            });
        }

        const now = Date.now();
        await SensitiveWord.create({
            word: trimmed,
            remark: remark ? String(remark).trim() : '',
            create_time: now,
            update_time: now
        });

        return res.json({
            msg: 'success',
            data: {
                message: '创建成功'
            }
        });
    } catch (error) {
        console.log('创建敏感词失败:', error);
        return res.status(200).json({
            msg: 'error',
            error: '创建失败'
        });
    }
});

// 敏感词列表
// GET /admin/sensitive-word/list
router.get('/list', async (req, res) => {
    try {
        const { page = 1, pageSize = 20, keyword = '' } = req.query;
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;

        if (pageNum < 1) {
            return res.status(200).json({ msg: 'error', error: '页码必须大于0' });
        }
        if (pageSizeNum < 1 || pageSizeNum > 100) {
            return res.status(200).json({ msg: 'error', error: '每页数量必须在1-100之间' });
        }

        const query = {};
        if (keyword && keyword.trim()) {
            query.word = { $regex: keyword.trim(), $options: 'i' };
        }

        const skip = (pageNum - 1) * pageSizeNum;
        const list = await SensitiveWord.find(query)
            .sort({ create_time: -1 })
            .skip(skip)
            .limit(pageSizeNum)
            .lean();

        const total = await SensitiveWord.countDocuments(query);

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
        console.log('获取敏感词列表失败:', error);
        return res.status(200).json({
            msg: 'error',
            error: '获取失败'
        });
    }
});

// 删除敏感词
// POST /admin/sensitive-word/delete
router.post('/delete', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(200).json({
                msg: 'error',
                error: 'ID不能为空'
            });
        }

        const result = await SensitiveWord.deleteOne({ _id: id });
        if (result.deletedCount === 0) {
            return res.status(200).json({
                msg: 'error',
                error: '删除失败：记录不存在'
            });
        }

        return res.json({
            msg: 'success',
            data: { message: '删除成功' }
        });
    } catch (error) {
        console.log('删除敏感词失败:', error);
        return res.status(200).json({
            msg: 'error',
            error: '删除失败'
        });
    }
});

module.exports = router;





