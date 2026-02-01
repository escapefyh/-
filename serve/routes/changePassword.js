const express = require('express');
const router = express.Router();
const { User } = require('../db');

// 修改密码接口
// POST /changePassword
router.post('/changePassword', async (req, res) => {
    try {
        const { user_id, old_password, new_password } = req.body;

        // 验证用户ID
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 验证原密码
        if (!old_password || typeof old_password !== 'string' || old_password.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "原密码不能为空"
            });
        }

        // 验证新密码
        if (!new_password || typeof new_password !== 'string' || new_password.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "新密码长度应在6-20个字符之间"
            });
        }

        const trimmedNewPassword = new_password.trim();
        if (trimmedNewPassword.length < 6 || trimmedNewPassword.length > 20) {
            return res.status(200).json({
                msg: "error",
                error: "新密码长度应在6-20个字符之间"
            });
        }

        // 查询用户
        const user = await User.findOne({ user_id: user_id });

        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 验证原密码是否正确
        if (user.password !== old_password) {
            return res.status(200).json({
                msg: "error",
                error: "原密码错误"
            });
        }

        // 验证新密码不能与原密码相同
        if (user.password === trimmedNewPassword) {
            return res.status(200).json({
                msg: "error",
                error: "新密码不能与原密码相同"
            });
        }

        // 更新密码
        await User.updateOne(
            { user_id: user_id },
            { $set: { password: trimmedNewPassword } }
        );

        res.json({
            msg: "success",
            data: {
                message: "密码修改成功"
            }
        });
    } catch (error) {
        console.log('修改密码失败:', error);
        res.status(200).json({
            msg: "error",
            error: "修改密码失败"
        });
    }
});

module.exports = router;





























