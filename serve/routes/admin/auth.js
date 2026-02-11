const express = require('express');
const router = express.Router();
const { AdminUser } = require('../../db');

// 验证手机号格式
const validatePhone = (phone) => {
    const phonePattern = /^1[3-9]\d{9}$/;
    return phonePattern.test(phone);
};

// 管理员注册接口
// POST /admin/register
router.post('/register', async (req, res) => {
    try {
        const { account, name, phone, password } = req.body;

        // 1. 验证姓名
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "姓名不能为空"
            });
        }

        const trimmedName = name.trim();
        if (trimmedName.length > 50) {
            return res.status(200).json({
                msg: "error",
                error: "姓名长度不能超过50个字符"
            });
        }

        // 2. 验证手机号
        if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "手机号不能为空"
            });
        }

        const trimmedPhone = phone.trim();

        // 验证手机号格式（必须是11位数字，以1开头，第二位为3-9）
        if (!validatePhone(trimmedPhone)) {
            return res.status(200).json({
                msg: "error",
                error: "手机号必须是11位数字"
            });
        }

        // 检查手机号是否已被注册
        const phoneCheck = await AdminUser.findOne({ phone: trimmedPhone });
        if (phoneCheck) {
            return res.status(200).json({
                msg: "error",
                error: "该手机号已被注册"
            });
        }

        // 3. 验证账号
        if (!account || typeof account !== 'string' || account.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "账号不能为空"
            });
        }

        const trimmedAccount = account.trim();
        if (trimmedAccount.length < 6) {
            return res.status(200).json({
                msg: "error",
                error: "账号长度不能少于6位"
            });
        }
        if (trimmedAccount.length > 20) {
            return res.status(200).json({
                msg: "error",
                error: "账号长度不能超过20个字符"
            });
        }

        // 检查账号是否已注册
        const accountCheck = await AdminUser.findOne({ account: trimmedAccount });
        if (accountCheck) {
            return res.status(200).json({
                msg: "registered",
                error: "该账号已注册"
            });
        }

        // 4. 验证密码
        if (!password || typeof password !== 'string' || password.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "密码不能为空"
            });
        }

        const trimmedPassword = password.trim();
        if (trimmedPassword.length < 6 || trimmedPassword.length > 20) {
            return res.status(200).json({
                msg: "error",
                error: "密码长度应在6-20个字符之间"
            });
        }

        // 5. 动态导入 uuid
        const { v4: uuidv4 } = await import('uuid');
        const adminId = uuidv4();

        // 6. 创建管理员
        await AdminUser.create({
            admin_id: adminId,
            name: trimmedName,
            phone: trimmedPhone,
            account: trimmedAccount,
            password: trimmedPassword,
            role: 'admin',
            create_time: new Date().getTime()
        });

        // 7. 返回成功响应
        res.status(200).json({
            msg: "success",
            data: {
                admin_id: adminId,
                message: "注册成功"
            }
        });
    } catch (error) {
        console.log('管理员注册失败:', error);
        
        // 处理数据库唯一性约束错误
        if (error.code === 11000) {
            // MongoDB 唯一索引冲突
            if (error.keyPattern && error.keyPattern.phone) {
                return res.status(200).json({
                    msg: "error",
                    error: "该手机号已被注册"
                });
            }
            if (error.keyPattern && error.keyPattern.account) {
                return res.status(200).json({
                    msg: "registered",
                    error: "该账号已注册"
                });
            }
        }

        res.status(200).json({
            msg: "error",
            error: "服务器出错"
        });
    }
});

// 管理员登录接口
// POST /admin/login
router.post('/login', async (req, res) => {
    try {
        const { account, password } = req.body;

        // 验证参数
        if (!account || typeof account !== 'string' || account.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "账号不能为空"
            });
        }

        if (!password || typeof password !== 'string' || password.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "密码不能为空"
            });
        }

        // 查询管理员
        const result = await AdminUser.findOne({ 
            account: account.trim(), 
            password: password.trim() 
        });

        if (result) {
            // 返回管理员信息（不包含密码）
            const { password: _, ...adminInfo } = result.toObject();
            res.status(200).json({
                msg: "success",
                data: adminInfo
            });
        } else {
            res.status(200).json({
                msg: "accountError",
                error: "账号或密码错误"
            });
        }
    } catch (error) {
        console.log('管理员登录失败:', error);
        res.status(200).json({
            msg: "error",
            error: "服务器出错"
        });
    }
});

module.exports = router;








