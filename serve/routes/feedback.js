const express = require('express');
const router = express.Router();
const { User, Feedback } = require('../db');

// 用户提交问题反馈
// POST /feedback/create
router.post('/create', async (req, res) => {
    try {
        const { user_id, content, images } = req.body;

        if (!user_id) {
            return res.status(200).json({ msg: 'error', error: '请先登录' });
        }

        // 验证用户是否存在
        const user = await User.findOne({ user_id: String(user_id) }).lean();
        if (!user) {
            return res.status(200).json({ msg: 'error', error: '请先登录' });
        }

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(200).json({ msg: 'error', error: '请输入问题描述' });
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length > 1000) {
            return res.status(200).json({ msg: 'error', error: '问题描述不能超过1000个字符' });
        }

        // 图片数组可选
        let imageList = [];
        if (images && Array.isArray(images)) {
            imageList = images
                .filter(url => typeof url === 'string' && url.trim().length > 0)
                .map(url => url.trim());
        }

        const now = Date.now();

        await Feedback.create({
            user_id: String(user_id),
            content: trimmedContent,
            images: imageList,
            status: 'pending',
            admin_reply: '',
            reply_time: null,
            create_time: now,
            update_time: now
        });

        return res.json({
            msg: 'success',
            data: {
                message: '反馈已提交'
            }
        });
    } catch (error) {
        console.log('提交问题反馈失败:', error);
        return res.status(200).json({ msg: 'error', error: '提交失败，请稍后重试' });
    }
});

module.exports = router;





