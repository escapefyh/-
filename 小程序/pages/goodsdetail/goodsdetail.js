// pages/goodsdetail/goodsdetail.js
import { ajax, getUserinfo } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    goods_id: '',
    goods: {},
    seller: {},
    loading: true,
    createTime: '',
    groupBuyDiscountText: '',
    groupBuyPrice: 0,        // 拼团价格
    currentGroupCount: 0,    // 当前正在拼团的人数
    commentCount: 0,         // 评论数目
    favoriteCount: 0,        // 收藏数目
    isFavorited: false       // 当前用户是否已收藏
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const goods_id = options.goods_id;
    if (!goods_id) {
      wx.showToast({
        title: '商品ID不能为空',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    this.setData({ goods_id });
    this.loadGoodsDetail();
  },

  /**
   * 生命周期函数--监听页面显示
   * 当从其他页面返回时，如果卖家是当前用户，刷新头像
   */
  onShow() {
    // 如果已经加载过商品详情，且卖家是当前用户，从本地存储刷新头像
    if (this.data.seller && this.data.seller.user_id) {
      const currentUserId = wx.getStorageSync('user_id');
      if (this.data.seller.user_id == currentUserId) {
        const userinfo = getUserinfo(currentUserId); // 根据user_id获取对应的userinfo
        if (userinfo && userinfo.avatar && userinfo.avatar.trim() !== '') {
          // 检查是否是无效URL
          const invalidUrls = ['your-domain.com', 'example.com', 'localhost'];
          const isInvalidUrl = invalidUrls.some(invalid => userinfo.avatar.includes(invalid));
          
          // 只有当头像不同且不是无效URL时才更新
          if (!isInvalidUrl && this.data.seller.avatar !== userinfo.avatar) {
            // 更新卖家头像
            this.setData({
              'seller.avatar': userinfo.avatar
            });
            console.log('从本地存储刷新卖家头像:', userinfo.avatar);
          }
        }
      }
    }
  },

  /**
   * 加载商品详情
   */
  async loadGoodsDetail() {
    try {
      const result = await ajax(`/goods/detail?goods_id=${this.data.goods_id}`, 'GET', {});
      
      console.log('商品详情API返回结果:', result);
      
      if (result?.msg === 'success') {
        const goods = result.data?.goods || {};
        let seller = result.data?.seller || {};
        
        console.log('商品信息:', goods);
        console.log('卖家信息（原始）:', seller);
        
        // 确保 images 是数组
        if (!goods.images || !Array.isArray(goods.images)) {
          goods.images = [];
        }
        
        // 确保 seller 是对象
        if (!seller || typeof seller !== 'object') {
          seller = {};
        }

        // 处理卖家头像
        // 1. 检查seller.avatar是否存在且有效（排除空字符串、null、undefined字符串、示例URL）
        const invalidUrls = ['your-domain.com', 'example.com', 'localhost'];
        const isInvalidUrl = seller.avatar && invalidUrls.some(invalid => seller.avatar.includes(invalid));
        
        // 2. 如果seller是当前用户，优先使用本地存储的头像（可能刚更新过）
        if (seller.user_id) {
          const currentUserId = wx.getStorageSync('user_id');
          if (seller.user_id == currentUserId) {
            const userinfo = getUserinfo(currentUserId); // 根据user_id获取对应的userinfo
            if (userinfo && userinfo.avatar && userinfo.avatar.trim() !== '' && !invalidUrls.some(invalid => userinfo.avatar.includes(invalid))) {
              seller.avatar = userinfo.avatar;
              console.log('优先使用本地存储的卖家头像（当前用户）:', seller.avatar);
            }
          }
        }
        
        // 3. 如果头像仍然无效，使用后端返回的头像或默认头像
        if (!seller.avatar || seller.avatar.trim() === '' || seller.avatar === 'null' || seller.avatar === 'undefined' || isInvalidUrl) {
          // 如果检测到无效URL，清空它
          if (isInvalidUrl) {
            console.warn('检测到无效的头像URL（示例URL），将使用默认头像:', seller.avatar);
            seller.avatar = '';
          }
          
          // 4. 如果seller有user_id，再次尝试从本地存储获取（如果是当前用户，但之前没获取到）
          if (seller.user_id && (!seller.avatar || seller.avatar.trim() === '')) {
            const currentUserId = wx.getStorageSync('user_id');
            if (seller.user_id == currentUserId) {
              const userinfo = getUserinfo(currentUserId); // 根据user_id获取对应的userinfo
              if (userinfo && userinfo.avatar && userinfo.avatar.trim() !== '' && !invalidUrls.some(invalid => userinfo.avatar.includes(invalid))) {
                seller.avatar = userinfo.avatar;
                console.log('从本地存储获取卖家头像:', seller.avatar);
              }
            }
          }
          
          // 5. 如果还是没有头像，使用默认头像（相对路径）
          if (!seller.avatar || seller.avatar.trim() === '') {
            seller.avatar = '/assets/default_avatar.png';
            console.log('使用默认头像（相对路径）');
          }
        } else {
          // 6. 如果头像URL是相对路径，记录警告（但通常后端应该返回完整URL）
          if (seller.avatar && !seller.avatar.startsWith('http') && !seller.avatar.startsWith('/assets')) {
            console.warn('卖家头像可能是相对路径，建议后端返回完整URL:', seller.avatar);
          }
          console.log('使用后端返回的卖家头像:', seller.avatar);
        }

        console.log('卖家信息（处理后）:', seller);
        
        // 格式化时间
        const createTime = goods.create_time ? this.formatTime(goods.create_time) : '';
        
        // 计算拼团折扣文本
        let groupBuyDiscountText = '';
        let groupBuyPrice = 0;
        if (goods.group_buy_enabled && goods.group_buy_discount) {
          groupBuyDiscountText = (goods.group_buy_discount * 10).toFixed(0);
          // 计算拼团价格
          groupBuyPrice = (goods.price * goods.group_buy_discount).toFixed(2);
        }
        
        // 确保 sales_count 存在
        goods.sales_count = goods.sales_count || 0;
        
        this.setData({
          goods,
          seller,
          createTime,
          groupBuyDiscountText,
          groupBuyPrice,
          loading: false
        });

        // 如果开启了拼团，加载当前拼团人数
        if (goods.group_buy_enabled) {
          this.loadGroupBuyCount();
        }

        // 加载评论数、收藏数和收藏状态
        this.loadCommentCount();
        this.loadFavoriteCount();
      } else {
        console.error('API返回错误:', result);
        wx.showToast({
          title: result?.error || result?.msg || '获取商品详情失败',
          icon: 'none',
          duration: 3000
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('获取商品详情失败:', error);
      console.error('错误详情:', JSON.stringify(error));
      wx.showToast({
        title: '网络请求失败: ' + (error.message || '未知错误'),
        icon: 'none',
        duration: 3000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 头像加载失败处理
   */
  onAvatarError(e) {
    console.error('头像加载失败:', e);
    // 如果头像加载失败，使用默认头像
    if (this.data.seller.avatar !== '/assets/default_avatar.png') {
      this.setData({
        'seller.avatar': '/assets/default_avatar.png'
      });
      console.log('头像加载失败，已切换到默认头像');
    }
  },

  /**
   * 格式化时间戳
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  /**
   * 加载当前拼团人数
   */
  async loadGroupBuyCount() {
    try {
      const result = await ajax(`/groupBuy/getCurrentCount?goods_id=${this.data.goods_id}`, 'GET', {});
      
      if (result?.msg === 'success') {
        const count = result.data?.count || 0;
        this.setData({
          currentGroupCount: count
        });
      }
    } catch (error) {
      console.error('获取拼团人数失败:', error);
      // 失败不影响页面显示，静默处理
    }
  },

  /**
   * 单独购买
   */
  onBuyClick() {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }

    // TODO: 跳转到订单确认页面或直接创建订单
    wx.showToast({
      title: '购买功能开发中',
      icon: 'none'
    });
  },

  /**
   * 拼团购买（免拼购买）
   */
  onGroupBuyClick() {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }

    // TODO: 跳转到拼团购买页面或创建拼团订单
    wx.showToast({
      title: '拼团购买功能开发中',
      icon: 'none'
    });
  },


  /**
   * 加载评论数目
   */
  async loadCommentCount() {
    try {
      const result = await ajax(`/goods/getCommentCount?goods_id=${this.data.goods_id}`, 'GET', {});
      
      if (result?.msg === 'success') {
        const count = result.data?.count || 0;
        this.setData({
          commentCount: count
        });
      }
    } catch (error) {
      console.error('获取评论数失败:', error);
      // 失败不影响页面显示，静默处理
    }
  },

  /**
   * 加载收藏数目和当前用户的收藏状态
   */
  async loadFavoriteCount() {
    try {
      const user_id = wx.getStorageSync('user_id') || '';
      const queryUser = user_id ? `&user_id=${user_id}` : '';

      // 后端接口同时返回收藏总数和当前用户是否已收藏
      const result = await ajax(
        `/favorite/getStatus?goods_id=${this.data.goods_id}${queryUser}`,
        'GET',
        {}
      );

      if (result?.msg === 'success') {
        const count = result.data?.count || 0;
        const isFavorited = !!result.data?.is_favorited;
        this.setData({
          favoriteCount: count,
          isFavorited
        });
      }
    } catch (error) {
      console.error('获取收藏信息失败:', error);
      // 失败不影响页面基本显示，静默处理
    }
  },

  /**
   * 点击评论
   */
  onCommentClick() {
    // TODO: 跳转到评论页面或展开评论列表
    wx.showToast({
      title: '评论功能开发中',
      icon: 'none'
    });
  },

  /**
   * 点击收藏
   */
  onFavoriteClick() {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }

    const { goods_id, isFavorited } = this.data;

    // 调用后端接口切换收藏状态
    ajax('/favorite/toggle', 'POST', { user_id, goods_id })
      .then(res => {
        if (res?.msg === 'success') {
          const data = res.data || {};
          const nextFavorited = typeof data.is_favorited === 'boolean'
            ? data.is_favorited
            : !isFavorited;
          const nextCount = typeof data.count === 'number'
            ? data.count
            : (this.data.favoriteCount + (nextFavorited ? 1 : -1));

          this.setData({
            isFavorited: nextFavorited,
            favoriteCount: nextCount < 0 ? 0 : nextCount
          });

          wx.showToast({
            title: nextFavorited ? '已收藏' : '已取消收藏',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res?.error || '收藏操作失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('切换收藏状态失败:', err);
        wx.showToast({
          title: '网络异常，请稍后重试',
          icon: 'none'
        });
      });
  },

  /**
   * 点击聊一聊
   */
  onChatClick() {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }

    // 检查商家不能和自己聊天
    const sellerId = this.data.seller?.user_id;
    if (!sellerId) {
      wx.showToast({
        title: '无法获取商家信息',
        icon: 'none'
      });
      return;
    }

    if (sellerId == user_id) {
      wx.showToast({
        title: '不能和自己聊天',
        icon: 'none'
      });
      return;
    }

    // 跳转到聊天页面
    const goodsId = this.data.goods_id;
    wx.navigateTo({
      url: `/pages/chat/chat?target_user_id=${sellerId}&goods_id=${goodsId || ''}`
    });
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

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadGoodsDetail().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})

