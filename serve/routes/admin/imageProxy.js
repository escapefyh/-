const express = require('express');
const router = express.Router();
const axios = require('axios');

// 图片代理接口
// GET /admin/image/proxy?url=图片URL
router.get('/proxy', async (req, res) => {
    try {
        const imageUrl = req.query.url;
        
        if (!imageUrl) {
            return res.status(400).json({
                msg: 'error',
                error: '图片URL不能为空'
            });
        }

        // 验证URL格式
        let url;
        try {
            url = new URL(imageUrl);
        } catch (e) {
            return res.status(400).json({
                msg: 'error',
                error: '无效的图片URL'
            });
        }

        // 只允许HTTPS协议
        if (url.protocol !== 'https:') {
            return res.status(400).json({
                msg: 'error',
                error: '只支持HTTPS协议的图片URL'
            });
        }

        // 验证是否为OSS域名（可选，增加安全性）
        const allowedDomains = [
            'aliyuncs.com',
            'oss-cn-beijing.aliyuncs.com',
            'oss-cn-hangzhou.aliyuncs.com',
            'oss-cn-shanghai.aliyuncs.com',
            'oss-cn-shenzhen.aliyuncs.com',
            'oss-cn-guangzhou.aliyuncs.com'
        ];
        
        const isAllowedDomain = allowedDomains.some(domain => url.hostname.includes(domain));
        if (!isAllowedDomain) {
            return res.status(400).json({
                msg: 'error',
                error: '不支持的图片域名'
            });
        }

        // 请求图片
        const response = await axios.get(imageUrl, {
            responseType: 'stream',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // 设置响应头
        res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 缓存1年
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // 将图片流传输到客户端
        response.data.pipe(res);
    } catch (error) {
        console.error('图片代理失败:', error.message);
        res.status(500).json({
            msg: 'error',
            error: '图片加载失败'
        });
    }
});

module.exports = router;










