const express = require('express');
const router = express.Router();
const { User } = require('../db');

// 登录接口
// POST /login
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












