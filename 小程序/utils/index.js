/*对于状态码statuscode，如果你在后端代码里什么都不写（不特意去设置状态码），只写 res.json({...})，Node.js 框架（Express）会默认帮你自动生成 200（代表成功）。 这也是为什么绝大多数情况下你不需要操心它的原因。当然自己也可以定义。
*/
const ajax = (url, method, data) => {
  const base_url = 'http://localhost:3000'; // 你的服务器地址

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base_url}${url}`,
      method: method ? method : 'POST',
      data: data,
      header: {
        'content-type': 'application/json' // 默认值，规范一下比较好
      },
      // 🟢 重点来了：这里是"收货部"
      success: (res) => {
        // 第一关：检查 HTTP 状态码 (Status Code)
        // 200, 201 代表服务器正常处理了请求
        if (res.statusCode >= 200 && res.statusCode < 300) {
          
          // 第二关：检查后端业务逻辑 (根据你自己的后端约定)
          // 比如你后端规定：如果有 msg: 'error'，也算失败
          if (res.data && res.data.msg === 'error') {
            // 虽然网通了，但业务没办成（比如密码错误） -> 把它踢到 catch 里去
            reject(res.data); 
          } else {
            // 🎉 通关！这才是真正的成功
            // 注意：这里直接 resolve(res.data)，把外面的壳去掉，
            // 这样页面里直接拿到的就是 { username: '...' }，不用再写 res.data.username 了
            resolve(res.data); 
          }

        } else {
          // 🚫 HTTP 状态码不对 (比如 404 没找到, 500 服务器炸了, 401 没权限)
          // 虽然网通了，但服务器在报错 -> 把它踢到 catch 里去
          reject({
            msg: '服务器异常',
            statusCode: res.statusCode,
            serverError: res.data // 把服务器返回的报错信息带着
          });
        }
      },
      // 🔴 这里是网络层面的失败 (断网、超时)
      fail: (err) => {
        reject({
          msg: '网络连接失败，请检查网络',
          detail: err
        });
      }
    })
  })
};

/**
 * 上传图片到OSS（通过后端中转）
 * @param {string} filePath 本地文件路径
 * @param {string} sellerId 卖家用户ID（必填，用于组织存储路径）
 * @param {string} goodsId 商品ID（可选，如果提供会在卖家文件夹下创建商品子文件夹）
 * @returns {Promise<string>} 返回图片URL
 */
const uploadToOSS = (filePath, sellerId, goodsId = null) => {
  const base_url = 'http://localhost:3000';
  return new Promise((resolve, reject) => {
    // 验证卖家ID
    if (!sellerId) {
      reject(new Error('卖家ID不能为空'));
      return;
    }

    // 构建formData
    const formData = {
      seller_id: sellerId // 传递卖家ID（后端会按此ID组织存储路径）
    };

    // 如果提供了商品ID，添加到formData
    if (goodsId) {
      formData.goods_id = goodsId;
    }

    wx.uploadFile({
      url: `${base_url}/oss/upload`,
      filePath: filePath,
      name: 'file', // 后端使用 upload.single('file')
      formData: formData, // 传递卖家ID和可选的商品ID
      success: (uploadRes) => {
        console.log('📦 收到后端回信啦：', uploadRes);
        try {
          const result = JSON.parse(uploadRes.data);
          
          // 检查是否有错误
          if (result.msg === 'error') {
            reject(new Error(result.error || '上传失败'));
            return;
          }
          
          // 后端返回格式：{ url, data: { url, imageUrl } }
          const imageUrl = result.url || result.data?.url || result.data?.imageUrl;
          if (imageUrl) {
            resolve(imageUrl);
          } else {
            reject(new Error('上传失败：未返回图片URL'));
          }
        } catch (e) {
          reject(new Error('上传失败：' + e.message));
        }
      },
      fail: (err) => {
        reject(new Error('网络请求失败：' + (err.errMsg || '未知错误')));
      }
    });
  });
};

/**
 * 获取指定用户的微信授权信息（按user_id存储）
 * @param {string|number} user_id 用户ID
 * @returns {Object|null} 用户信息对象，包含avatar和nickname，如果不存在则返回null
 */

//userinfo在这里是一个参数，其他地方的函数在使用它的时候才会写入具体的东西
const getUserinfo = (user_id) => {
  if (!user_id) {
    return null;
  }
  const key = `userinfo_${user_id}`;
  return wx.getStorageSync(key) || null;
};

/**
 * 保存指定用户的微信授权信息（按user_id存储）
 * @param {string|number} user_id 用户ID
 * @param {Object} userinfo 用户信息对象，包含avatar和nickname
 */
const setUserinfo = (user_id, userinfo) => {
  if (!user_id) {
    console.warn('setUserinfo: user_id不能为空');
    return;
  }
  const key = `userinfo_${user_id}`;
  wx.setStorageSync(key, userinfo);
};

/**
 * 删除指定用户的微信授权信息（按user_id存储）
 * @param {string|number} user_id 用户ID
 */
const removeUserinfo = (user_id) => {
  if (!user_id) {
    return;
  }
  const key = `userinfo_${user_id}`;
  wx.removeStorageSync(key);
};

/**
 * 调用图片识别API识别商品分类
 * @param {string} filePath 本地图片文件路径
 * @returns {Promise<Object>} 返回识别结果 {category_id, category_name, confidence}
 */
const recognizeImage = (filePath) => {
  const base_url = 'http://localhost:3000';
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${base_url}/recognize`,
      filePath: filePath,
      name: 'image', // 表单字段名，必须为 'image'
      success: (res) => {
        try {
          const result = JSON.parse(res.data);
          
          // 检查是否有错误
          if (result.error) {
            reject(new Error(result.message || result.error));
            return;
          }
          
          // 返回识别结果
          resolve({
            category_id: result.category_id,
            category_name: result.category_name,
            confidence: result.confidence
          });
        } catch (e) {
          reject(new Error('解析识别结果失败：' + e.message));
        }
      },
      fail: (err) => {
        reject(new Error('网络请求失败：' + (err.errMsg || '未知错误')));
      }
    });
  });
};

// 使用 ES6 导出方式，支持 import 语法
export { ajax, uploadToOSS, getUserinfo, setUserinfo, removeUserinfo, recognizeImage };