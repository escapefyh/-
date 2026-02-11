import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token 等认证信息
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API 请求错误:', error);
    return Promise.reject(error);
  }
);

// 管理员认证相关 API
export const adminAuthAPI = {
  // 登录
  login(account, password) {
    return api.post('/admin/login', { account, password });
  },
  
  // 注册
  register(account, name, phone, password) {
    return api.post('/admin/register', { account, name, phone, password });
  }
};

// 管理员用户管理相关 API
export const adminUserAPI = {
  // 获取用户列表
  getUserList(params) {
    return api.get('/admin/user/list', { params });
  },
  
  // 拉黑/取消拉黑用户
  blacklistUser(data) {
    return api.post('/admin/user/blacklist', data);
  },
  
  // 获取用户详情
  getUserDetail(user_id) {
    return api.get(`/admin/user/detail/${user_id}`);
  },
  
  // 获取用户订单列表
  getUserOrders(user_id, params) {
    return api.get(`/admin/user/orders/${user_id}`, { params });
  }
};

// 图片代理工具函数
export const getImageProxyUrl = (imageUrl) => {
  if (!imageUrl) return '';
  // 如果是相对路径，直接返回
  if (imageUrl.startsWith('/')) return imageUrl;
  // 如果是完整URL，使用代理
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return `${api.defaults.baseURL}/admin/image/proxy?url=${encodeURIComponent(imageUrl)}`;
  }
  return imageUrl;
};

// 管理员商品管理相关 API
export const adminGoodsAPI = {
  // 获取商品列表
  getGoodsList(params) {
    return api.get('/admin/goods/list', { params });
  },
  
  // 获取商品详情
  getGoodsDetail(goods_id) {
    return api.get('/admin/goods/detail', { params: { goods_id } });
  },
  
  // 设置商品热度加分
  setHeatBonus(goods_id, admin_heat_bonus) {
    return api.post('/admin/goods/setHeatBonus', { goods_id, admin_heat_bonus });
  },
  
  // 获取热度榜单
  getHotList(params) {
    return api.get('/goods/hot', { params });
  }
};

// 管理员系统公告相关 API
export const adminAnnouncementAPI = {
  // 发布公告
  createAnnouncement(data) {
    return api.post('/admin/announcement/create', data);
  },

  // 获取公告列表
  getAnnouncementList(params) {
    return api.get('/admin/announcement/list', { params });
  },

  // 获取公告详情
  getAnnouncementDetail(announcement_id) {
    return api.get('/admin/announcement/detail', { params: { announcement_id } });
  },

  // 删除公告
  deleteAnnouncement(announcement_id) {
    return api.post('/admin/announcement/delete', { announcement_id });
  }
};

// 管理员敏感词相关 API
export const adminSensitiveWordAPI = {
  // 创建敏感词
  createWord(data) {
    return api.post('/admin/sensitive-word/create', data);
  },

  // 获取敏感词列表
  getWordList(params) {
    return api.get('/admin/sensitive-word/list', { params });
  },

  // 删除敏感词
  deleteWord(id) {
    return api.post('/admin/sensitive-word/delete', { id });
  }
};

// 管理员问题反馈相关 API
export const adminFeedbackAPI = {
  // 获取反馈列表
  getFeedbackList(params) {
    return api.get('/admin/feedback/list', { params });
  },

  // 获取反馈详情
  getFeedbackDetail(feedback_id) {
    return api.get('/admin/feedback/detail', { params: { feedback_id } });
  },

  // 回复反馈
  replyFeedback(data) {
    return api.post('/admin/feedback/reply', data);
  }
};

// 数据分析相关 API
export const analyticsAPI = {
  // 获取热搜关键词（词云图）
  getHotKeywords(days = 7) {
    return api.get('/analytics/traffic/hot-keywords', { params: { days } });
  },
  
  // 获取访问量趋势（PV/UV）
  getVisitTrend(days = 7) {
    return api.get('/analytics/traffic/visit-trend', { params: { days } });
  },
  
  // 获取活跃时段分布（热力图）
  getActiveHours(days = 7) {
    return api.get('/analytics/traffic/active-hours', { params: { days } });
  },

  // 获取交易额/订单量走势
  getTransactionTrend(days = 7) {
    return api.get('/analytics/transaction/trend', { params: { days } });
  },

  // 获取分类销售占比
  getCategoryShare(days = 7) {
    return api.get('/analytics/transaction/category-share', { params: { days } });
  }
};

export default api;

