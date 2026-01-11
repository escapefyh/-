const express = require('express');
const router = express.Router();
const { User } = require('../db');

// 注册接口
router.post('/register', async (req, res) => {
    try {
        const { account, name, phone, password } = req.body;

        // 检查用户名是否存在（使用 account 字段查询）
        const checkRes = await User.findOne({ account: account });
        if (checkRes) {
            return res.send({ msg: "registered" });
        }

        // 动态导入 uuid
        const { v4: uuidv4 } = await import('uuid');

        // 创建用户（将前端字段映射到数据库字段）
        await User.create({
            user_id: uuidv4(),
            name,
            phone, 
            account, 
            password,
            create_time: new Date().getTime()
        });

        res.send({ msg: "success" });
    } catch (error) {
        console.log(error);
        res.send({ msg: "error" });
    }
});

// 登录接口
router.post('/login', async (req, res) => {
    try {
        const { account, password } = req.body;
        // 使用 account 字段查询，因为数据库字段是 account
        const result = await User.findOne({ account: account, password });
        if (result) {
            res.send({ msg: "success", result });
        } else {
            res.send({ msg: "accountError" });
        }
    } catch (error) {
        console.log(error);
        res.send({ msg: "error" });
    }
});

module.exports = router;


























