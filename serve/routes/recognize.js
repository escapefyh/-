const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

// 创建上传目录（临时存储）
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer（用于接收文件，临时存储）
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名：时间戳 + 随机数 + 原扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // 如果文件没有后缀名，尝试从 mimetype 补一个
        let ext = path.extname(file.originalname);
        if (!ext && file.mimetype) {
             ext = '.' + file.mimetype.split('/')[1];
        }
        cb(null, 'recognize-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: function (req, file, cb) {
        // ✨ 修改点：放宽格式限制，增加 webp, gif, bmp 等
        // Python 的 PIL 库支持这些格式，所以我们可以大胆放行
        const allowedTypes = /jpeg|jpg|png|gif|webp|bmp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        // 只要是图片类型，哪怕后缀名识别不出来，也尽量放行（依靠 mimetype）
        if (mimetype || extname) {
            return cb(null, true);
        } else {
            cb(new Error('不支持的图片格式 (仅支持 JPG/PNG/WEBP/GIF)'));
        }
    }
});

// 商品分类映射表
const categoryMap = {
    1: '水果蔬菜',
    2: '美妆个护',
    3: '家居百货',
    4: '数码家电',
    5: '服饰鞋包',
    6: '母婴用品',
    7: '运动户外',
    8: '图书文娱',
    9: '宠物用品',
    10: '食品保健',
    11: '汽车用品',
    12: '办公文具',
    13: '其他用品'
};

// 根据分类名称查找分类ID
const findCategoryIdByName = (categoryName) => {
    if (!categoryName) return null;
    
    // 移除可能存在的编号前缀 (例如 "01_水果蔬菜" -> "水果蔬菜")
    if (categoryName.includes('_')) {
        categoryName = categoryName.split('_')[1];
    }

    // 精确匹配
    for (const [id, name] of Object.entries(categoryMap)) {
        if (name === categoryName) {
            return parseInt(id);
        }
    }
    
    // 模糊匹配
    for (const [id, name] of Object.entries(categoryMap)) {
        if (name.includes(categoryName) || categoryName.includes(name)) {
            return parseInt(id);
        }
    }
    
    return null;
};

// 图片识别接口
router.post('/recognize', (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            // 处理 multer 错误
            const errorMsg = err.message || "上传失败";
            // 统一返回 200 状态码，在 JSON 里告知前端错误，防止前端直接报错 500
            return res.status(200).json({
                error: "图片格式不支持",
                message: errorMsg
            });
        }
        next();
    });
}, async (req, res) => {
    let tempFilePath = null;
    
    try {
        // 检查文件是否存在
        if (!req.file) {
            return res.status(200).json({
                error: "无文件",
                message: "请选择一张图片"
            });
        }

        tempFilePath = req.file.path;

        // ✨ 修改点：确保这里指向的是 Python 的 /predict 接口
        // 如果你的 Python 代码叫 api.py，接口通常是 /predict
        const recognitionApiUrl = process.env.RECOGNITION_API_URL || 'http://localhost:5000';
        const recognitionUrl = `${recognitionApiUrl}/predict`;

        // 创建 FormData 对象，将文件转发到识别服务
        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempFilePath)); // 注意：Python api.py 里接收的字段名是 'file'

        console.log(`正在请求 Python AI 服务: ${recognitionUrl}`);

        // 转发请求到识别服务
        const recognitionResponse = await axios.post(recognitionUrl, formData, {
            headers: {
                ...formData.getHeaders()
            },
            timeout: 30000 // 30秒超时
        });

        console.log('Python AI 返回结果:', recognitionResponse.data);

        // 清理临时文件
        try {
            fs.unlinkSync(tempFilePath);
            tempFilePath = null;
        } catch (unlinkError) {
            console.warn('删除临时文件失败:', unlinkError);
        }

        // 处理识别结果
        const recognitionResult = recognitionResponse.data;

        // Python 返回格式通常是：{ category: "01_水果蔬菜", confidence: 0.99, ... }
        // 解析数据
        let aiCategoryStr = recognitionResult.category || recognitionResult.category_name;
        const confidence = recognitionResult.confidence;

        // 查找对应的分类ID
        // 比如 aiCategoryStr 是 "01_水果蔬菜"，我们需要提取 "水果蔬菜" 并找到 ID
        let categoryId = findCategoryIdByName(aiCategoryStr);
        let categoryName = categoryMap[categoryId];

        // 如果无法匹配分类
        if (!categoryId) {
            // 尝试直接返回 Python 给的名字，让前端自己去匹配试试
            return res.json({
                category_id: null,
                category_name: aiCategoryStr,
                confidence: confidence,
                message: "未找到匹配的系统分类，请手动选择"
            });
        }

        // 返回成功结果
        res.json({
            category_id: categoryId,
            category_name: categoryName,
            confidence: confidence,
            raw_category: aiCategoryStr // 调试用
        });

    } catch (error) {
        // 清理临时文件
        if (tempFilePath) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (unlinkError) {}
        }

        console.error('AI 识别流程出错:', error.message);

        // 识别服务连接错误
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return res.status(200).json({
                error: "AI 服务未启动",
                message: "AI 服务(端口5000)似乎没开，请检查 api.py 是否运行"
            });
        }

        res.status(200).json({
            error: "识别失败",
            message: "AI 识别服务暂时不可用，请手动选择"
        });
    }
});

module.exports = router;