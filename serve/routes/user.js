const express = require('express');
const router = express.Router();
const { User } = require('../db');

// 校验头像URL是否合法
// 允许：完整的HTTP/HTTPS URL（排除示例URL）或相对路径（如 /assets/default_avatar.png）
const isValidAvatarUrl = (url) => {
    if (!url || typeof url !== 'string') return false;

    const trimmed = url.trim();
    if (!trimmed) return false;

    // 如果是相对路径（以 / 开头），允许
    if (trimmed.startsWith('/')) {
        return true;
    }

    // 如果是完整的HTTP/HTTPS URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        // 不能包含示例域名
        if (trimmed.includes('your-domain.com') || trimmed.includes('example.com')) {
            return false;
        }
        return true;
    }

    // 其他情况不允许
    return false;
};

// 更新用户昵称
router.post('/updateNickname', async (req, res) => {
    try {
        const { user_id, nickname } = req.body;

        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户ID不能为空"
            });
        }

        if (!nickname || nickname.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "昵称不能为空"
            });
        }

        const trimmedNickname = nickname.trim();
        if (trimmedNickname.length < 1 || trimmedNickname.length > 20) {
            return res.status(200).json({
                msg: "error",
                error: "昵称长度必须在1-20个字符之间"
            });
        }

        // 更新用户昵称
        const user = await User.findOneAndUpdate(
            { user_id: user_id },
            { nickname: trimmedNickname },
            { new: true }
        );

        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        res.json({
            msg: "success"
        });
    } catch (error) {
        console.log('更新昵称失败:', error);
        res.status(200).json({
            msg: "error",
            error: "更新失败"
        });
    }
});

// 更新用户头像
// POST /user/updateAvatar
router.post('/updateAvatar', async (req, res) => {
    try {
        const { user_id, avatar } = req.body;

        // 校验 user_id
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "user_id无效"
            });
        }

        // 校验 avatar
        if (!isValidAvatarUrl(avatar)) {
            return res.status(200).json({
                msg: "error",
                error: "头像URL不合法"
            });
        }

        // 查找并更新用户头像
        const user = await User.findOneAndUpdate(
            { user_id: user_id },
            { avatar: avatar.trim() },
            { new: true }
        );

        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "user_id无效"
            });
        }

        return res.json({
            msg: "success"
        });
    } catch (error) {
        console.log('更新头像失败:', error);
        return res.status(200).json({
            msg: "error",
            error: "更新失败"
        });
    }
});

// 处理头像URL，确保返回完整的HTTP/HTTPS URL
const processAvatarUrlForChat = (avatar) => {
    // 如果头像为空、null或空字符串，返回相对路径
    if (!avatar || avatar.trim() === '') {
        return '/assets/default_avatar.png';
    }
    
    // 如果已经是完整URL，检查是否是示例URL
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        // 检查是否是示例URL，如果是则返回相对路径
        if (avatar.includes('your-domain.com') || avatar.includes('example.com')) {
            return '/assets/default_avatar.png';
        }
        return avatar;
    }
    
    // 如果是相对路径，直接返回
    if (avatar.startsWith('/')) {
        return avatar;
    }
    
    // 其他情况，返回相对路径
    return '/assets/default_avatar.png';
};

// 获取用户信息（用于聊天）
// GET /user/info?user_id=xxx
router.get('/info', async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        const user = await User.findOne({ user_id: user_id }).lean();

        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        return res.json({
            msg: "success",
            data: {
                user_id: user.user_id,
                nickname: user.nickname || '',
                avatar: processAvatarUrlForChat(user.avatar)
            }
        });
    } catch (error) {
        console.log('获取用户信息失败:', error);
        return res.status(200).json({
            msg: "error",
            error: "用户不存在"
        });
    }
});

module.exports = router;

