// pages/firelist/firelist.js
import { ajax } from '../../utils/index'

Page({

  /**
   * 将HTTP图片URL转换为HTTPS
   * 微信小程序强制要求使用HTTPS，HTTP图片会被拦截
   */
  convertToHttps(url) {
    // 处理空值
    if (!url) {
      return url;
    }
    
    // 确保是字符串类型
    if (typeof url !== 'string') {
      url = String(url);
    }
    
    // 去除首尾空格
    url = url.trim();
    
    // 如果是空字符串，直接返回
    if (url === '') {
      return url;
    }
    
    // 如果是HTTP协议，转换为HTTPS
    if (url.startsWith('http://')) {
      const convertedUrl = url.replace('http://', 'https://');
      console.log('图片URL转换:', url, '->', convertedUrl);
      return convertedUrl;
    }
    
    // 如果已经是HTTPS，直接返回
    if (url.startsWith('https://')) {
      return url;
    }
    
    // 如果是相对路径（以/开头），保持原样
    if (url.startsWith('/')) {
      return url;
    }
    
    // 其他情况（可能是无效URL），记录日志但返回原值
    console.warn('未识别的图片URL格式:', url);
    return url;
  },

  /**
   * 处理商品图片数组，将所有HTTP URL转换为HTTPS
   */
  processImages(images) {
    if (!images || !Array.isArray(images)) {
      return [];
    }
    return images
      .filter(img => img != null && img !== '') // 过滤空值
      .map(img => this.convertToHttps(img))
      .filter(img => img != null && img !== ''); // 再次过滤转换后的空值
  },

  /**
   * 页面的初始数据
   */
  data: {
    goodsList: [],           // 商品列表
    loading: false,          // 是否正在加载
    hasMore: true,           // 是否还有更多数据
    page: 1,                 // 当前页码
    pageSize: 20,            // 每页数量
    total: 0,                // 总数据量
    
    // 倒计时相关
    countdown: {
      hours: 0,
      minutes: 0,
      seconds: 0
    },
    countdownTimer: null,    // 倒计时定时器
    nextUpdateTime: null      // 下次更新时间（24小时后）
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 初始化倒计时（24小时后更新）
    this.initCountdown();
    // 加载热度商品列表
    this.loadHotGoodsList();
  },

  /**
   * 初始化倒计时
   */
  initCountdown() {
    // 获取下次更新时间（24小时后）
    const now = new Date();
    const nextUpdate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    this.setData({
      nextUpdateTime: nextUpdate.getTime()
    });
    
    // 立即更新一次倒计时
    this.updateCountdown();
    
    // 每秒更新一次倒计时
    const timer = setInterval(() => {
      this.updateCountdown();
    }, 1000);
    
    this.setData({
      countdownTimer: timer
    });
  },

  /**
   * 更新倒计时
   */
  updateCountdown() {
    const now = new Date().getTime();
    const nextUpdate = this.data.nextUpdateTime;
    
    if (!nextUpdate || now >= nextUpdate) {
      // 倒计时结束，重新初始化（24小时后）
      this.initCountdown();
      // 刷新商品列表
      this.loadHotGoodsList(true);
      return;
    }
    
    const diff = nextUpdate - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    this.setData({
      countdown: {
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0')
      }
    });
  },

  /**
   * 计算商品热度值
   * 热度值 = 基础分 + 浏览量×1 + 收藏量×10 + 销量/拼单×50 + 时效加成
   */
  calculateHeatScore(item) {
    // 基础分：100-500随机（如果后端没有提供，前端生成一个固定值）
    const baseScore = item.base_score || Math.floor(Math.random() * 400) + 100;
    
    // 浏览量
    const views = item.views || 0;
    
    // 收藏量
    const favorites = item.favorites || item.favorite_count || 0;
    
    // 销量/拼单数
    const sales = item.sales_count || item.sales || 0;
    const groupBuyCount = item.group_buy_count || 0;
    const totalSales = sales + groupBuyCount;
    
    // 时效加成：24小时内发布的新品额外+200分
    let freshnessBonus = 0;
    if (item.create_time) {
      const createTime = new Date(item.create_time);
      const now = new Date();
      const diffTime = now - createTime;
      const diffHours = diffTime / (1000 * 60 * 60);
      if (diffHours <= 24) {
        freshnessBonus = 200;
      }
    }
    
    // 计算总热度值
    const heatScore = baseScore + (views * 1) + (favorites * 10) + (totalSales * 50) + freshnessBonus;
    
    return Math.floor(heatScore);
  },

  /**
   * 计算热度进度条百分比
   * 为了营造"马上爆表"的感觉，如果热度很高，进度条要几乎撑满（90%）
   */
  calculateHeatProgress(heatScore) {
    // 假设最高热度为10000，超过这个值就显示90%以上
    const maxHeat = 10000;
    let progress = (heatScore / maxHeat) * 100;
    
    // 如果热度超过8000，显示90%以上，营造紧迫感
    if (heatScore >= 8000) {
      progress = 90 + ((heatScore - 8000) / 2000) * 10; // 8000-10000映射到90-100%
    }
    
    // 限制在0-100%之间
    progress = Math.min(100, Math.max(0, progress));
    
    return progress;
  },

  /**
   * 加载热度商品列表
   */
  async loadHotGoodsList(isRefresh = false) {
    if (this.data.loading) return;
    
    if (isRefresh) {
      this.setData({
        page: 1,
        hasMore: true,
        goodsList: []
      });
    }
    
    if (!this.data.hasMore && !isRefresh) return;
    
    this.setData({ loading: true });
    
    try {
      const currentPage = isRefresh ? 1 : this.data.page;
      const result = await ajax(
        `/goods/hot?page=${currentPage}&pageSize=${this.data.pageSize}`,
        'GET',
        {}
      );
      
      if (result?.msg === 'success') {
        const list = result.data?.list || [];
        const total = result.data?.total || 0;
        
        // 处理每个商品，计算热度值和进度
        const processedList = list.map((item, index) => {
          // 确保 images 是数组，并将所有HTTP URL转换为HTTPS
          if (!item.images || !Array.isArray(item.images)) {
            item.images = [];
          } else {
            // 将所有图片URL从HTTP转换为HTTPS
            item.images = this.processImages(item.images);
            // 调试：打印第一个商品的图片信息
            if (index === 0) {
              console.log('第一个商品（排名1）的图片处理结果:', {
                original: list[0].images,
                processed: item.images,
                firstImage: item.images[0]
              });
            }
          }
          // 确保 seller 是对象
          if (!item.seller || typeof item.seller !== 'object') {
            item.seller = {};
          }
          
          // 计算热度值
          item.heatScore = this.calculateHeatScore(item);
          
          // 计算热度进度
          item.heatProgress = this.calculateHeatProgress(item.heatScore);
          
          // 排名（从1开始）
          item.rank = index + 1 + (currentPage - 1) * this.data.pageSize;
          
          // 判断是否为孤品（库存为1）
          item.isOnlyOne = (item.stock || item.inventory || 0) === 1;
          
          // 处理拼团折扣文本
          if (item.group_buy_enabled && item.group_buy_discount) {
            item.groupBuyDiscountText = (item.group_buy_discount * 10).toFixed(0);
          }
          
          return item;
        });
        
        const currentList = isRefresh ? [] : this.data.goodsList;
        const newList = [...currentList, ...processedList];
        
        this.setData({
          goodsList: newList,
          total,
          page: currentPage + 1,
          hasMore: newList.length < total,
          loading: false
        });
      } else {
        console.error('API返回错误:', result);
        wx.showToast({
          title: result?.error || result?.msg || '获取热度榜失败',
          icon: 'none',
          duration: 3000
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('获取热度榜失败:', error);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none',
        duration: 3000
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 点击商品卡片
   */
  onGoodsClick(e) {
    const goodsId = e.currentTarget.dataset.goodsId;
    if (goodsId) {
      wx.navigateTo({
        url: `/pkg_goods/goodsdetail/goodsdetail?goods_id=${goodsId}`
      });
    }
  },

  /**
   * 点击按钮（马上抢/去看看）
   */
  onButtonClick(e) {
    const goodsId = e.currentTarget.dataset.goodsId;
    if (goodsId) {
      wx.navigateTo({
        url: `/pkg_goods/goodsdetail/goodsdetail?goods_id=${goodsId}`
      });
    }
  },

  /**
   * 图片加载错误处理
   */
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const goodsId = e.currentTarget.dataset.goodsId;
    const goods = this.data.goodsList[index];
    
    console.error('图片加载失败:', {
      index,
      goodsId,
      imageUrl: goods?.images?.[0],
      goods: goods
    });
    
    // 如果图片加载失败，可以尝试使用默认图片
    // 这里不修改数据，让WXML的wx:else处理默认图片显示
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清除倒计时定时器
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadHotGoodsList(true).then(() => {
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadHotGoodsList();
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '🔥 热度榜 - 实时更新，手慢无！',
      path: '/pages/firelist/firelist'
    };
  }
})
