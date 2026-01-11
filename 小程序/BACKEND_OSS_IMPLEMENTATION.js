// ==================== OSS 图片上传接口 - 真实OSS实现 ====================
// 需要安装: npm install ali-oss
// 需要配置环境变量: OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET

const OSS = require('ali-oss');
const fs = require('fs');
const path = require('path');

// 初始化OSS客户端（从环境变量读取配置）
const client = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET
});

// 替换原来的 /oss/upload 接口
app.post('/oss/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        msg: "error",
        error: "文件不能为空"
      });
    }

    // 生成OSS文件路径（建议格式：images/年/月/日/文件名）
    const ext = path.extname(req.file.originalname);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ossFileName = `images/${year}/${month}/${day}/${uniqueSuffix}${ext}`;
    
    // 上传到OSS
    const result = await client.put(ossFileName, req.file.path, {
      headers: {
        'x-oss-object-acl': 'public-read' // 设置为公共读，前端可以直接访问
      }
    });
    
    // 删除本地临时文件（multer保存的文件）
    try {
      fs.unlinkSync(req.file.path);
    } catch (unlinkError) {
      console.warn('删除临时文件失败:', unlinkError);
      // 不影响主流程，继续执行
    }
    
    // 返回OSS图片URL
    res.json({
      url: result.url,
      data: {
        url: result.url,
        imageUrl: result.url
      }
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
    
    // 处理不同类型的错误
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
    if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
      return res.status(500).json({
        msg: "error",
        error: "OSS配置错误，请检查AccessKey和SecretKey"
      });
    }
    
    res.status(500).json({
      msg: "error",
      error: "OSS服务异常: " + (error.message || '未知错误')
    });
  }
});
















