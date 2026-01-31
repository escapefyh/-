const express = require('express');
const router = express.Router();

// 关于我们接口
// GET /app/about
router.get('/about', async (req, res) => {
    try {
        // 返回关于我们的信息
        // 在实际项目中，这些信息可以存储在数据库中或配置文件中
        res.json({
            msg: "success",
            data: {
                app_name: "拼单商城",
                app_version: "1.0.0",
                content: "拼单商城是一个便捷的二手商品交易平台，致力于为用户提供安全、便捷的购物体验。我们专注于打造一个诚信、高效的交易环境，让闲置物品得到充分利用，让用户享受更优惠的购物体验。",
                contact_info: {
                    email: "support@example.com",
                    phone: "400-123-4567",
                    address: "中国广东省深圳市南山区科技园"
                },
                copyright_year: new Date().getFullYear()
            }
        });
    } catch (error) {
        console.log('获取关于我们信息失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取信息失败"
        });
    }
});

// 隐私政策接口
// GET /app/privacy
router.get('/privacy', async (req, res) => {
    try {
        // 返回隐私政策内容
        // 在实际项目中，这些内容可以存储在数据库中或配置文件中
        res.json({
            msg: "success",
            data: {
                title: "隐私政策",
                publish_date: "2026-01-25",
                effective_date: "2026-01-25",
                content: "我们非常重视您的隐私保护。在使用我们的服务时，我们会按照相关法律法规的要求，保护您的个人信息安全。\n\n一、信息收集\n我们可能收集以下信息：\n1. 账号信息：包括用户名、密码等\n2. 交易信息：包括订单信息、支付信息等\n3. 设备信息：包括设备型号、操作系统等\n4. 位置信息：在您授权的情况下，我们可能收集您的位置信息\n\n二、信息使用\n我们使用收集的信息用于：\n1. 提供、维护和改进我们的服务\n2. 处理您的交易请求\n3. 发送重要通知和更新\n4. 提供个性化服务和推荐\n5. 进行数据分析和统计\n\n三、信息共享\n我们不会向第三方出售、交易或转让您的个人信息，除非：\n1. 获得您的明确同意\n2. 法律法规要求\n3. 为提供服务所必需\n\n四、信息安全\n我们采用行业标准的安全措施保护您的个人信息，包括：\n1. 数据加密传输\n2. 访问权限控制\n3. 定期安全审计\n\n五、您的权利\n您有权：\n1. 访问、更正或删除您的个人信息\n2. 撤回同意\n3. 投诉和举报\n\n六、联系我们\n如果您对本隐私政策有任何疑问，请联系我们：\n邮箱：privacy@example.com\n电话：400-123-4567",
                contact_info: {
                    email: "3112644828@qq.com",
                    phone: "13140400073",
                    address: "河南工业大学"
                }
            }
        });
    } catch (error) {
        console.log('获取隐私政策失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取隐私政策失败"
        });
    }
});

module.exports = router;


















