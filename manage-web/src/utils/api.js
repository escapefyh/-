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

