const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OSS = require('ali-oss');

// 创建上传目录（临时存储，上传到OSS后会删除）
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

//在js里面，函数也是一个对象，可以写成multer.diskStorage这样的形式（区别于c语言）
// 配置 multer（仅用于接收文件，临时存储）
/*destination: function   这相当于c语言里面的回调函数（函数里面调用函数）
destination它本身是一个函数，这个函数里面调用了cb这个函数
在js语法中，一个函数的参数可以是另一个函数。
这有三个函数，分别是diskStorage，function ，cb
*/
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名：时间戳 + 随机数 + 原扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});
/*
const upload = multer对于这个的理解，如果放到c语言里面，
可以理解成upload是一个指针，指向multer返回的那一堆东西（这些东西放到了一个结构体里面）
upload是指向这个结构体的指针。
这个multer是别人已经写好的函数，最后会返回一个指针，我这里用upload接住了
至于后面还用到了upload.single  这个其实是结构体里面本身就有的东西。
*/
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        // 允许的图片格式
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('只支持 jpg, jpeg, png, gif, webp 格式的图片'));
        }
    }
});

// 检查OSS配置
const ossConfig = {
    region: process.env.OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET
};

// 检查配置是否完整且不是占位符
const isOssConfigValid = () => {
    return ossConfig.region && 
           ossConfig.accessKeyId && 
           ossConfig.accessKeySecret && 
           ossConfig.bucket &&
           !ossConfig.accessKeyId.includes('your-') &&
           !ossConfig.accessKeySecret.includes('your-') &&
           !ossConfig.bucket.includes('your-');
};

// 初始化OSS客户端（仅在配置有效时）
let client = null;
if (isOssConfigValid()) {
    try {
        client = new OSS({
            region: ossConfig.region,
            accessKeyId: ossConfig.accessKeyId,
            accessKeySecret: ossConfig.accessKeySecret,
            bucket: ossConfig.bucket
        });
        console.log('✅ OSS客户端初始化成功');
    } catch (error) {
        console.error('❌ OSS客户端初始化失败:', error.message);
        client = null;
    }
} else {
    console.warn('⚠️  警告：OSS配置不完整或使用占位符，请检查 .env 文件');
    console.warn('   需要配置：OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET');
    console.warn('   当前配置：');
    console.warn('   - OSS_REGION:', ossConfig.region || '未配置');
    console.warn('   - OSS_ACCESS_KEY_ID:', ossConfig.accessKeyId ? (ossConfig.accessKeyId.includes('your-') ? '占位符' : '已配置') : '未配置');
    console.warn('   - OSS_ACCESS_KEY_SECRET:', ossConfig.accessKeySecret ? (ossConfig.accessKeySecret.includes('your-') ? '占位符' : '已配置') : '未配置');
    console.warn('   - OSS_BUCKET:', ossConfig.bucket || '未配置');
    console.warn('   OSS上传功能将不可用，请配置正确的OSS信息后重启服务');
}

// 1. 获取OSS上传凭证（方式一 - 推荐）
router.get('/getUploadToken', async (req, res) => {
    try {
        // TODO: 替换为真实的OSS配置
        // 示例：使用阿里云OSS SDK获取上传凭证
        // const OSS = require('ali-oss');
        // const client = new OSS({...});
        // const uploadUrl = client.signatureUrl(...);
        
        // 当前返回模拟数据
        const { v4: uuidv4 } = await import('uuid');
        const timestamp = Date.now();
        const filename = `images/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}/${uuidv4()}.jpg`;
        
        res.json({
            uploadUrl: `https://your-bucket.oss-cn-hangzhou.aliyuncs.com/`,
            formData: {
                key: filename,
                policy: "base64-encoded-policy",
                OSSAccessKeyId: "your-access-key-id",
                signature: "signature-string",
                "x-oss-object-acl": "public-read"
            }
        });
    } catch (error) {
        console.log('获取OSS上传凭证失败:', error);
        res.status(500).json({
            msg: "error",
            error: "上传凭证获取失败"
        });
    }
});

// 2. 直接上传到OSS（方式二）
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        // 检查OSS客户端是否可用
        if (!client) {
            // 清理本地临时文件
            if (req.file && req.file.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (e) {
                    console.error('清理临时文件失败:', e);
                }
            }
            return res.status(500).json({
                msg: "error",
                error: "OSS服务未配置，请检查 .env 文件中的OSS配置"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                msg: "error",
                error: "文件不能为空"
            });
        }

        // 获取卖家ID（从请求参数或请求体中获取）
        const seller_id = req.body.seller_id || req.body.user_id;
        if (!seller_id) {
            // 清理本地临时文件
            if (req.file && req.file.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (e) {
                    console.error('清理临时文件失败:', e);
                }
            }
            return res.status(400).json({
                msg: "error",
                error: "卖家ID不能为空，请传递 seller_id 或 user_id 参数"
            });
        }

        // 可选：获取商品ID，用于创建子文件夹
        const goods_id = req.body.goods_id || null;

        // 生成OSS文件路径：images/卖家ID/商品ID/文件名 或 images/卖家ID/文件名
        const ext = path.extname(req.file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = `${uniqueSuffix}${ext}`;
        
        // 构建路径：images/卖家ID/商品ID/文件名 或 images/卖家ID/文件名
        let ossFileName;
        if (goods_id) {
            // 如果有商品ID，创建子文件夹：images/卖家ID/商品ID/文件名
            ossFileName = `images/${seller_id}/${goods_id}/${fileName}`;
        } else {
            // 如果没有商品ID，直接放在卖家文件夹下：images/卖家ID/文件名
            ossFileName = `images/${seller_id}/${fileName}`;
        }
        
        // 上传到OSS
        const result = await client.put(ossFileName, req.file.path, {
            headers: {
                'x-oss-object-acl': 'public-read' // 设置为公共读
            }
        });
        
        // 删除本地临时文件
        try {
            fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
            console.warn('删除临时文件失败:', unlinkError);
        }
        
        // 返回OSS图片URL
        res.json({
            url: result.url,
            msg: "success"
        });
    } catch (error) {
        console.log('OSS上传失败:', error);
        
        // 清理本地临时文件
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('清理临时文件失败:', e);
            }
        }
        
        // 错误处理
        if (error.message && error.message.includes('只支持')) {
            return res.status(400).json({
                msg: "error",
                error: "文件格式不支持"
            });
        }
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                msg: "error",
                error: "文件大小超过限制"
            });
        }
        
        res.status(500).json({
            msg: "error",
            error: "OSS服务异常: " + (error.message || '未知错误')
        });
    }
});

module.exports = router;

