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
    groupBuyInfo: null,      // 拼团信息：包含正在拼团的订单信息
    groupBuyRequiredCount: 0, // 拼团所需人数
    groupBuyCurrentCount: 0,  // 当前拼团人数
    groupBuyRemainingCount: 0, // 还差几人
    commentCount: 0,         // 评论数目
    favoriteCount: 0,        // 收藏数目
    isFavorited: false,      // 当前用户是否已收藏
    // 购买弹窗相关
    showBuyModal: false,      // 是否显示购买弹窗
    buyType: 'normal',       // 购买类型：'normal' 直接买，'group' 拼团买
    userInfo: {},            // 用户信息
    addressList: [],         // 地址列表
    selectedAddress: null,   // 选中的地址
    selectedSpec: null,      // 选中的规格
    quantity: 1,             // 购买数量
    totalPrice: 0,           // 总价
    
    // 支付弹窗相关
    showPayModal: false,     // 是否显示支付弹窗
    currentOrderId: null,    // 当前待支付的订单ID
    payAmount: 0,            // 支付金额（数字）
    payAmountFormatted: '0.00',  // 支付金额（格式化字符串）
    walletBalance: 0,        // 钱包余额（数字）
    walletBalanceFormatted: '0.00',  // 钱包余额（格式化字符串）
    
    // 商家管理相关
    isOwner: false,          // 当前用户是否是商品发布者
    showManageModal: false,   // 是否显示管理弹窗
    newDescription: '',       // 新的商品描述
    newPrice: '',             // 新的商品价格
    
    // 评论相关
    commentList: [],          // 评论列表
    commentPage: 1,           // 评论页码
    commentPageSize: 10,      // 评论每页数量
    commentHasMore: true,    // 是否还有更多评论
    commentLoading: false,    // 评论加载中
    canComment: false,       // 是否可以评价（已完成交易且未评价）
    showCommentReminder: false, // 是否显示评价提醒
    completedOrderId: null,   // 已完成的订单ID（用于评价）
    autoComment: false ,       // 是否自动打开评价弹窗
    
    // 评论弹窗相关
    showCommentModal: false, // 是否显示评论弹窗
    commentRating: 5,        // 评价星级（1-5）
    commentContent: '',       // 评价内容
    commentImages: [],        // 评价图片
    submittingComment: false,  // 提交评论中
    
    // 关注相关
    isFollowed: false         // 是否已关注卖家
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
    
    // 检查是否自动打开评价弹窗
    const autoComment = options.auto_comment === '1' || options.auto_comment === 'true';
    const orderId = options.order_id || null;
    
    this.setData({ 
      goods_id,
      autoComment,
      completedOrderId: orderId
    });
    
    this.loadGoodsDetail();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清除拼团倒计时定时器
    if (this.groupBuyTimer) {
      clearInterval(this.groupBuyTimer);
      this.groupBuyTimer = null;
    }
  },

  /**
   * 生命周期函数--监听页面显示
   * 当从其他页面返回时，如果卖家是当前用户，刷新头像
   */
  onShow() {
    // 如果开启了拼团，刷新拼团信息
    if (this.data.goods.group_buy_enabled) {
      this.loadGroupBuyInfo();
    }
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
        
        // 处理规格数据
        // 确保 spec_enabled 是布尔值
        goods.spec_enabled = goods.spec_enabled === true || goods.spec_enabled === 1 || goods.spec_enabled === '1';
        
        // 确保 specs 是数组，并且每个规格都有必要的字段
        if (goods.spec_enabled) {
          if (!goods.specs || !Array.isArray(goods.specs)) {
            goods.specs = [];
            goods.spec_enabled = false; // 如果没有规格数据，关闭规格功能
          } else {
            // 为每个规格添加索引，并确保字段完整
            goods.specs = goods.specs.map((spec, index) => ({
              spec_id: spec.spec_id || spec.id || `spec_${index}`, // 如果没有spec_id，使用索引生成
              name: spec.name || `规格${index + 1}`,
              price: parseFloat(spec.price) || 0,
              stock: parseInt(spec.stock) || 0,
              _index: index // 添加索引用于选择
            }));
          }
        } else {
          goods.specs = [];
        }
        
        console.log('处理后的规格数据:', goods.spec_enabled, goods.specs);
        
        // 判断当前用户是否是商品发布者
        const currentUserId = wx.getStorageSync('user_id');
        const isOwner = seller.user_id && seller.user_id == currentUserId;
        
        this.setData({
          goods,
          seller,
          createTime,
          groupBuyDiscountText,
          groupBuyPrice,
          isOwner,
          loading: false
        });

        // 如果开启了拼团，加载拼团信息
        if (goods.group_buy_enabled) {
          this.loadGroupBuyInfo();
        }

        // 加载评论数、收藏数和收藏状态
        this.loadCommentCount();
        this.loadFavoriteCount();
        
        // 加载关注状态（如果不是自己）
        if (!isOwner) {
          this.loadFollowStatus();
        }
        
        // 加载评论列表
        this.loadCommentList();
        
        // 保存浏览记录到本地缓存
        this.saveBrowseHistory();
        
        // 检查是否可以评价（已完成交易但未评价）
        this.checkCanComment().then(() => {
          // 如果设置了自动打开评价弹窗，且可以评价，则自动打开
          if (this.data.autoComment && this.data.canComment) {
            setTimeout(() => {
              this.onShowCommentModal();
            }, 500); // 延迟500ms，确保页面已渲染完成
          }
        });
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
   * 加载拼团信息
   */
  async loadGroupBuyInfo() {
    try {
      const result = await ajax(`/groupBuy/info?goods_id=${this.data.goods_id}`, 'GET', {});
      
      if (result?.msg === 'success') {
        const groupBuyInfo = result.data || null;
        const requiredCount = this.data.goods.group_buy_count || 2;
        const currentCount = groupBuyInfo ? (groupBuyInfo.current_count || 0) : 0;
        const remainingCount = Math.max(0, requiredCount - currentCount);
        
        // 处理倒计时
        let expireTimeText = '';
        if (groupBuyInfo && groupBuyInfo.expire_time) {
          expireTimeText = this.formatExpireTime(groupBuyInfo.expire_time);
          // 启动倒计时定时器
          this.startGroupBuyTimer(groupBuyInfo.expire_time);
        }
        
        this.setData({
          groupBuyInfo: {
            ...groupBuyInfo,
            expire_time_text: expireTimeText
          },
          groupBuyRequiredCount: requiredCount,
          groupBuyCurrentCount: currentCount,
          groupBuyRemainingCount: remainingCount,
          currentGroupCount: currentCount
        });
      } else {
        // 如果没有拼团信息，设置为空
        const requiredCount = this.data.goods.group_buy_count || 2;
        this.setData({
          groupBuyInfo: null,
          groupBuyRequiredCount: requiredCount,
          groupBuyCurrentCount: 0,
          groupBuyRemainingCount: requiredCount,
          currentGroupCount: 0
        });
      }
    } catch (error) {
      console.error('获取拼团信息失败:', error);
      // 失败不影响页面显示，静默处理
      const requiredCount = this.data.goods.group_buy_count || 2;
      this.setData({
        groupBuyInfo: null,
        groupBuyRequiredCount: requiredCount,
        groupBuyCurrentCount: 0,
        groupBuyRemainingCount: requiredCount,
        currentGroupCount: 0
      });
    }
  },

  /**
   * 格式化过期时间（倒计时）
   */
  formatExpireTime(expireTime) {
    if (!expireTime) return '';
    
    const now = new Date();
    const expire = new Date(expireTime);
    const diff = expire - now;
    
    if (diff <= 0) {
      return '已过期';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  },

  /**
   * 启动拼团倒计时定时器
   */
  startGroupBuyTimer(expireTime) {
    // 清除之前的定时器
    if (this.groupBuyTimer) {
      clearInterval(this.groupBuyTimer);
    }
    
    // 每秒更新一次倒计时
    this.groupBuyTimer = setInterval(() => {
      if (!this.data.groupBuyInfo || !this.data.groupBuyInfo.expire_time) {
        clearInterval(this.groupBuyTimer);
        return;
      }
      
      const expireTimeText = this.formatExpireTime(this.data.groupBuyInfo.expire_time);
      
      // 检查是否已过期
      const now = new Date();
      const expire = new Date(this.data.groupBuyInfo.expire_time);
      if (expire <= now) {
        clearInterval(this.groupBuyTimer);
        // 刷新拼团信息
        this.loadGroupBuyInfo();
        return;
      }
      
      this.setData({
        'groupBuyInfo.expire_time_text': expireTimeText
      });
    }, 1000);
  },

  /**
   * 单独购买
   */
  async onBuyClick() {
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

    // 打开购买弹窗
    await this.openBuyModal('normal');
  },

  /**
   * 拼团购买（免拼购买）
   */
  async onGroupBuyClick() {
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

    // 检查商品是否开启拼团
    if (!this.data.goods.group_buy_enabled) {
      wx.showToast({
        title: '该商品未开启拼团',
        icon: 'none'
      });
      return;
    }

    // 打开购买弹窗
    await this.openBuyModal('group');
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
    // 滚动到评论区
    // 由于小程序不支持直接滚动到指定元素，这里使用页面滚动
    wx.pageScrollTo({
      selector: '.comment-section',
      duration: 300
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
          url: '/pkg_user/login/login'
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
   * 加载关注状态
   */
  async loadFollowStatus() {
    try {
      const user_id = wx.getStorageSync('user_id');
      if (!user_id) {
        this.setData({ isFollowed: false });
        return;
      }
      
      const seller_id = this.data.seller?.user_id;
      if (!seller_id) {
        return;
      }
      
      const result = await ajax(
        `/follow/check?user_id=${user_id}&followed_id=${seller_id}`,
        'GET',
        {}
      );
      
      if (result?.msg === 'success') {
        this.setData({
          isFollowed: !!result.data?.is_followed
        });
      }
    } catch (error) {
      console.error('获取关注状态失败:', error);
      // 失败不影响页面基本显示，静默处理
    }
  },

  /**
   * 点击关注按钮
   */
  onFollowClick() {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pkg_user/login/login'
        });
      }, 1500);
      return;
    }
    
    const seller_id = this.data.seller?.user_id;
    if (!seller_id) {
      wx.showToast({
        title: '卖家信息不存在',
        icon: 'none'
      });
      return;
    }
    
    const { isFollowed } = this.data;
    
    // 调用后端接口切换关注状态
    ajax('/follow/toggle', 'POST', { 
      user_id, 
      followed_id: seller_id 
    })
      .then(res => {
        if (res?.msg === 'success') {
          const data = res.data || {};
          const nextFollowed = typeof data.is_followed === 'boolean'
            ? data.is_followed
            : !isFollowed;
          
          this.setData({
            isFollowed: nextFollowed
          });
          
          wx.showToast({
            title: nextFollowed ? '已关注' : '已取消关注',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res?.error || '关注操作失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('切换关注状态失败:', err);
        wx.showToast({
          title: '网络异常，请稍后重试',
          icon: 'none'
        });
      });
  },

  /**
   * 点击卖家头像
   */
  onSellerAvatarClick() {
    const seller_id = this.data.seller?.user_id;
    if (!seller_id) {
      wx.showToast({
        title: '卖家信息不存在',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到卖家商品列表页面
    wx.navigateTo({
      url: `/pkg_goods/goodslist/goodslist?seller_id=${seller_id}&seller_name=${encodeURIComponent(this.data.seller.nickname || this.data.seller.name || '卖家')}`
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
          url: '/pkg_user/login/login'
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
      url: `/pkg_trade/chat/chat?target_user_id=${sellerId}&goods_id=${goodsId || ''}`
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

  },

  /**
   * 打开购买弹窗
   */
  async openBuyModal(buyType) {
    const user_id = wx.getStorageSync('user_id');
    
    // 加载用户信息和地址
    try {
      wx.showLoading({ title: '加载中...', mask: true });
      
      // 获取用户信息
      const userinfo = getUserinfo(user_id);
      const userInfo = wx.getStorageSync('userInfo') || {};
      
      // 获取地址列表
      const addressResult = await ajax(`/address/list?user_id=${user_id}`, 'GET', {});
      let addressList = [];
      let selectedAddress = null;
      
      if (addressResult?.msg === 'success') {
        addressList = addressResult.data?.list || [];
        // 默认选择第一个地址，或者标记为默认的地址
        selectedAddress = addressList.find(addr => addr.is_default) || addressList[0] || null;
      }
      
      // 初始化规格选择
      let selectedSpec = null;
      if (this.data.goods.spec_enabled && this.data.goods.specs && this.data.goods.specs.length > 0) {
        // 如果有规格，默认选择第一个
        selectedSpec = { ...this.data.goods.specs[0] };
      }
      
      // 计算总价
      const basePrice = selectedSpec ? parseFloat(selectedSpec.price) : parseFloat(this.data.goods.price);
      const finalPrice = buyType === 'group' && this.data.goods.group_buy_discount 
        ? basePrice * this.data.goods.group_buy_discount 
        : basePrice;
      const totalPrice = (finalPrice * 1).toFixed(2);
      
      wx.hideLoading();
      
      this.setData({
        showBuyModal: true,
        buyType: buyType,
        userInfo: {
          nickname: userinfo?.nickname || userInfo?.nickname || '未设置昵称',
          avatar: userinfo?.avatar || '/assets/default_avatar.png'
        },
        addressList: addressList,
        selectedAddress: selectedAddress,
        selectedSpec: selectedSpec,
        quantity: 1,
        totalPrice: totalPrice
      });
    } catch (error) {
      wx.hideLoading();
      console.error('加载购买信息失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 关闭购买弹窗
   */
  onCloseBuyModal() {
    this.setData({
      showBuyModal: false
    });
  },

  /**
   * 阻止弹窗内容区域的事件冒泡
   */
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  /**
   * 选择地址
   */
  onSelectAddress() {
    if (this.data.addressList.length === 0) {
      wx.showToast({
        title: '请先添加收货地址',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pkg_user/addresslist/addresslist'
        });
      }, 1500);
      return;
    }
    
    // 显示地址选择器（这里简化处理，直接选择第一个或默认地址）
    // 实际项目中可以使用 picker 组件
    const addresses = this.data.addressList;
    const addressNames = addresses.map((addr, index) => {
      return `${addr.name} ${addr.phone} ${addr.province}${addr.city}${addr.district}${addr.detail}`;
    });
    
    wx.showActionSheet({
      itemList: addressNames,
      success: (res) => {
        this.setData({
          selectedAddress: addresses[res.tapIndex]
        });
      }
    });
  },

  /**
   * 选择规格
   */
  onSelectSpec(e) {
    const specIndex = parseInt(e.currentTarget.dataset.index);
    const specs = this.data.goods.specs || [];
    
    if (!isNaN(specIndex) && specIndex >= 0 && specIndex < specs.length) {
      const selectedSpec = specs[specIndex];
      this.setData({
        selectedSpec: selectedSpec
      });
      
      // 重新计算总价
      this.calculateTotalPrice();
    } else {
      console.error('选择规格失败: 索引无效', specIndex, specs.length);
    }
  },

  /**
   * 增加数量
   */
  onIncreaseQuantity() {
    const stock = this.data.selectedSpec 
      ? (this.data.selectedSpec.stock || 0)
      : (this.data.goods.stock || 999);
    
    if (this.data.quantity < stock) {
      this.setData({
        quantity: this.data.quantity + 1
      });
      this.calculateTotalPrice();
    } else {
      wx.showToast({
        title: '库存不足',
        icon: 'none'
      });
    }
  },

  /**
   * 减少数量
   */
  onDecreaseQuantity() {
    if (this.data.quantity > 1) {
      this.setData({
        quantity: this.data.quantity - 1
      });
      this.calculateTotalPrice();
    }
  },

  /**
   * 计算总价
   */
  calculateTotalPrice() {
    const basePrice = this.data.selectedSpec 
      ? parseFloat(this.data.selectedSpec.price) 
      : parseFloat(this.data.goods.price);
    
    const finalPrice = this.data.buyType === 'group' && this.data.goods.group_buy_discount
      ? basePrice * this.data.goods.group_buy_discount
      : basePrice;
    
    const totalPrice = (finalPrice * this.data.quantity).toFixed(2);
    
    this.setData({
      totalPrice: totalPrice
    });
  },

  /**
   * 确认购买
   */
  async onConfirmBuy() {
    // 验证必填项
    if (!this.data.selectedAddress) {
      wx.showToast({
        title: '请选择收货地址',
        icon: 'none'
      });
      return;
    }

    if (this.data.goods.spec_enabled && !this.data.selectedSpec) {
      wx.showToast({
        title: '请选择商品规格',
        icon: 'none'
      });
      return;
    }

    const user_id = wx.getStorageSync('user_id');
    
    try {
      wx.showLoading({ title: '提交中...', mask: true });
      
      // 准备订单数据
      const orderData = {
        user_id: user_id,
        goods_id: this.data.goods_id,
        address_id: this.data.selectedAddress.address_id,
        quantity: this.data.quantity,
        spec_id: this.data.selectedSpec ? (this.data.selectedSpec.spec_id || this.data.selectedSpec.id || null) : null,
        spec_name: this.data.selectedSpec ? this.data.selectedSpec.name : null, // 规格名称，用于后端验证
        is_group_buy: this.data.buyType === 'group',
        total_price: this.data.totalPrice,
        // 拼团相关：如果有正在进行的拼团，传递group_id，否则由后端创建新拼团
        group_id: this.data.buyType === 'group' && this.data.groupBuyInfo && this.data.groupBuyInfo.group_id 
          ? this.data.groupBuyInfo.group_id 
          : null
      };
      
      // 调用创建订单接口
      const result = await ajax('/order/create', 'POST', orderData);
      
      wx.hideLoading();
      
      if (result?.msg === 'success') {
        const order_id = result.data?.order_id;
        const group_buy_status = result.data?.group_buy_status; // 拼团状态：pending-拼团中，success-成团成功，failed-拼团失败
        
        // 如果是拼团购买，刷新拼团信息
        if (this.data.buyType === 'group') {
          // 延迟一下再刷新，确保后端已处理完成
          setTimeout(() => {
            this.loadGroupBuyInfo();
          }, 500);
        }
        
        // 关闭购买弹窗
        this.onCloseBuyModal();
        
        // 打开支付弹窗
        await this.openPayModal(order_id, parseFloat(this.data.totalPrice));
      } else {
        wx.showToast({
          title: result?.error || '订单创建失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('创建订单失败:', error);
      wx.showToast({
        title: '网络异常，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 打开支付弹窗
   */
  async openPayModal(order_id, amount) {
    const user_id = wx.getStorageSync('user_id');
    
    try {
      // 获取钱包余额
      const balanceResult = await ajax(`/wallet/balance?user_id=${user_id}`, 'GET', {});
      let balance = 0;
      if (balanceResult?.msg === 'success') {
        balance = parseFloat(balanceResult.data?.balance || 0);
      }
      
      // 格式化金额
      const payAmountNum = parseFloat(amount) || 0;
      const balanceNum = parseFloat(balance) || 0;
      
      this.setData({
        showPayModal: true,
        currentOrderId: order_id,
        payAmount: payAmountNum,
        payAmountFormatted: payAmountNum.toFixed(2),
        walletBalance: balanceNum,
        walletBalanceFormatted: balanceNum.toFixed(2)
      });
    } catch (error) {
      console.error('获取余额失败:', error);
      // 即使获取余额失败，也显示支付弹窗
      const payAmountNum = parseFloat(amount) || 0;
      this.setData({
        showPayModal: true,
        currentOrderId: order_id,
        payAmount: payAmountNum,
        payAmountFormatted: payAmountNum.toFixed(2),
        walletBalance: 0,
        walletBalanceFormatted: '0.00'
      });
    }
  },

  /**
   * 关闭支付弹窗
   */
  onClosePayModal() {
    this.setData({
      showPayModal: false,
      currentOrderId: null,
      payAmount: 0,
      payAmountFormatted: '0.00',
      walletBalance: 0,
      walletBalanceFormatted: '0.00'
    });
  },

  /**
   * 确认支付
   */
  async onConfirmPay() {
    const { currentOrderId, payAmount, walletBalance } = this.data;
    
    if (!currentOrderId) {
      wx.showToast({
        title: '订单ID不存在',
        icon: 'none'
      });
      return;
    }

    // 检查余额
    if (walletBalance < payAmount) {
      wx.showModal({
        title: '余额不足',
        content: `当前余额：¥${walletBalance.toFixed(2)}\n支付金额：¥${payAmount.toFixed(2)}\n\n余额不足，请先充值`,
        confirmText: '去充值',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 关闭支付弹窗
            this.onClosePayModal();
            // 跳转到钱包页面
            setTimeout(() => {
              wx.navigateTo({
                url: '/pkg_user/wallet/wallet'
              });
            }, 300);
          }
        }
      });
      return;
    }

    // 执行支付
    await this.doPay(currentOrderId);
  },

  /**
   * 执行支付
   */
  async doPay(order_id) {
    const user_id = wx.getStorageSync('user_id');
    
    try {
      wx.showLoading({
        title: '支付中...',
        mask: true
      });

      const result = await ajax('/order/pay', 'POST', {
        user_id: user_id,
        order_id: order_id
      });

      wx.hideLoading();

      if (result?.msg === 'success') {
        // 获取订单信息
        const orderNo = result.data?.order_no || '';
        const payAmount = result.data?.pay_amount || this.data.payAmount;
        
        // 关闭支付弹窗
        this.onClosePayModal();
        
        // 跳转到支付成功页面
        let url = `/pkg_goods/paysuccess/paysuccess?order_id=${order_id}&pay_amount=${payAmount}`;
        if (orderNo) {
          url += `&order_no=${encodeURIComponent(orderNo)}`;
        }
        
        setTimeout(() => {
          wx.redirectTo({
            url: url
          });
        }, 500);
      } else {
        wx.showToast({
          title: result?.error || '支付失败',
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('支付失败:', error);
      wx.showToast({
        title: error?.msg || '网络请求失败',
        icon: 'none',
        duration: 3000
      });
    }
  },

  /**
   * 打开管理弹窗
   */
  onManageClick() {
    this.setData({
      showManageModal: true,
      newDescription: this.data.goods.description || '',
      newPrice: this.data.goods.price ? this.data.goods.price.toString() : ''
    });
  },

  /**
   * 关闭管理弹窗
   */
  onCloseManageModal() {
    this.setData({
      showManageModal: false,
      newDescription: '',
      newPrice: ''
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagationManage() {
    // 阻止点击弹窗内容区域时关闭弹窗
  },

  /**
   * 商品描述输入
   */
  onDescriptionInput(e) {
    this.setData({
      newDescription: e.detail.value
    });
  },

  /**
   * 价格输入
   */
  onPriceInputManage(e) {
    this.setData({
      newPrice: e.detail.value
    });
  },

  /**
   * 确认编辑商品
   */
  async onConfirmManage() {
    const { goods, newDescription, newPrice } = this.data;
    
    // 验证描述
    if (!newDescription || !newDescription.trim()) {
      wx.showToast({
        title: '请输入商品描述',
        icon: 'none'
      });
      return;
    }

    // 验证价格
    if (!newPrice || !newPrice.trim()) {
      wx.showToast({
        title: '请输入价格',
        icon: 'none'
      });
      return;
    }

    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      wx.showToast({
        title: '请输入有效的价格',
        icon: 'none'
      });
      return;
    }

    // 检查是否有变化
    const descriptionChanged = newDescription.trim() !== (goods.description || '');
    const priceChanged = price !== parseFloat(goods.price || 0);
    
    if (!descriptionChanged && !priceChanged) {
      this.onCloseManageModal();
      return;
    }

    try {
      const user_id = wx.getStorageSync('user_id');
      if (!user_id) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      wx.showLoading({
        title: '更新中...',
        mask: true
      });

      // 调用更新接口
      const updateData = {
        goods_id: goods.goods_id,
        user_id: user_id
      };
      
      if (descriptionChanged) {
        updateData.description = newDescription.trim();
      }
      
      if (priceChanged) {
        updateData.price = price;
      }

      const result = await ajax('/goods/update', 'POST', updateData);

      wx.hideLoading();

      if (result?.msg === 'success') {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
        
        // 关闭弹窗
        this.onCloseManageModal();
        
        // 刷新商品详情
        this.loadGoodsDetail();
      } else {
        wx.showToast({
          title: result?.error || '更新失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('更新商品失败:', error);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载评论列表
   */
  async loadCommentList(isLoadMore = false) {
    if (this.data.commentLoading) return;
    
    const page = isLoadMore ? this.data.commentPage : 1;
    
    this.setData({ commentLoading: true });
    
    try {
      const result = await ajax(
        `/comment/list?goods_id=${this.data.goods_id}&page=${page}&pageSize=${this.data.commentPageSize}`,
        'GET',
        {}
      );
      
      if (result?.msg === 'success') {
        const list = result.data?.list || [];
        const total = result.data?.total || 0;
        
        // 格式化评论时间
        const processedList = list.map(comment => {
          if (comment.create_time) {
            comment.create_time_formatted = this.formatCommentTime(comment.create_time);
          }
          return comment;
        });
        
        const currentList = isLoadMore ? this.data.commentList : [];
        const newList = [...currentList, ...processedList];
        
        this.setData({
          commentList: newList,
          commentPage: page + 1,
          commentHasMore: newList.length < total,
          commentLoading: false
        });
      } else {
        this.setData({ commentLoading: false });
      }
    } catch (error) {
      console.error('加载评论列表失败:', error);
      this.setData({ commentLoading: false });
    }
  },

  /**
   * 加载更多评论
   */
  loadMoreComments() {
    if (!this.data.commentHasMore || this.data.commentLoading) return;
    this.loadCommentList(true);
  },

  /**
   * 格式化评论时间
   */
  formatCommentTime(timeStr) {
    if (!timeStr) return '';
    
    try {
      const date = new Date(timeStr);
      const now = new Date();
      const diff = now - date;
      
      // 小于1分钟
      if (diff < 60000) {
        return '刚刚';
      }
      
      // 小于1小时
      if (diff < 3600000) {
        return Math.floor(diff / 60000) + '分钟前';
      }
      
      // 小于24小时
      if (diff < 86400000) {
        return Math.floor(diff / 3600000) + '小时前';
      }
      
      // 小于7天
      if (diff < 604800000) {
        return Math.floor(diff / 86400000) + '天前';
      }
      
      // 超过7天，显示具体日期
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      if (year === now.getFullYear()) {
        return `${month}-${day}`;
      }
      
      return `${year}-${month}-${day}`;
    } catch (e) {
      return timeStr;
    }
  },

  /**
   * 检查是否可以评价（待评价状态的订单）
   */
  async checkCanComment() {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id) return Promise.resolve();
    
    try {
      // 如果已经有订单ID（从URL参数传入），直接使用
      let orderId = this.data.completedOrderId;
      let canComment = false;
      let receiveTime = null;
      let hasComment = false;
      
      // 如果有传入的订单ID，使用check-comment接口获取订单信息和评价状态
      // 如果没有订单ID，也使用check-comment接口查询待评价订单
      const result = await ajax(
        `/order/check-comment?user_id=${user_id}&goods_id=${this.data.goods_id}${orderId ? `&order_id=${orderId}` : ''}`,
        'GET',
        {}
      );
      
      if (result?.msg === 'success') {
        const data = result.data || {};
        // 如果有传入的订单ID，直接设置为可评价
        if (orderId) {
          canComment = true;
        } else {
          canComment = data.can_comment || false;
          orderId = data.order_id || null;
        }
        receiveTime = data.receive_time || null; // 确认收货时间
        hasComment = data.has_comment || false;
      } else if (orderId) {
        // 如果接口调用失败但有订单ID，至少设置为可评价
        // 然后尝试单独检查是否已有评价
        canComment = true;
        try {
          const commentResult = await ajax(`/comment/check?order_id=${orderId}`, 'GET', {});
          if (commentResult?.msg === 'success') {
            hasComment = commentResult.data?.has_comment || false;
          }
        } catch (e) {
          // 静默处理错误，不影响功能
        }
      }
      
      // 如果待评价且未评价，显示评价提醒
      if (canComment && !hasComment && orderId) {
        // 检查是否超过7天（从确认收货时间开始计算）
        if (receiveTime) {
          const receiveDate = new Date(receiveTime);
          const now = new Date();
          const diffDays = Math.floor((now - receiveDate) / (1000 * 60 * 60 * 24));
          
          // 如果超过7天，自动好评
          if (diffDays > 7) {
            await this.autoGoodComment(orderId);
            return Promise.resolve();
          }
        }
        
        this.setData({
          canComment: true,
          showCommentReminder: true,
          completedOrderId: orderId
        });
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('检查是否可以评价失败:', error);
      return Promise.resolve();
    }
  },

  /**
   * 自动好评（超过7天未评价）
   * 从确认收货时间（receive_time）开始计算，超过7天自动好评
   */
  async autoGoodComment(orderId) {
    if (!orderId) return;
    
    try {
      const user_id = wx.getStorageSync('user_id');
      const result = await ajax('/comment/create', 'POST', {
        user_id: user_id,
        goods_id: this.data.goods_id,
        order_id: orderId,
        rating: 5,
        content: '系统默认好评',
        is_auto: true
      });
      
      if (result?.msg === 'success') {
        // 刷新评论列表和评论数
        this.loadCommentList();
        this.loadCommentCount();
        
        // 隐藏评价提醒
        this.setData({
          canComment: false,
          showCommentReminder: false
        });
      }
    } catch (error) {
      console.error('自动好评失败:', error);
    }
  },

  /**
   * 保存浏览记录到本地缓存
   */
  saveBrowseHistory() {
    try {
      const { goods_id, goods } = this.data;
      if (!goods_id || !goods || !goods.description) {
        return; // 商品信息不完整，不保存
      }
      
      // 从本地缓存读取历史记录
      let browseHistory = wx.getStorageSync('browse_history') || [];
      
      // 去重：如果该商品已存在，先删除旧记录
      browseHistory = browseHistory.filter(item => item.goods_id != goods_id);
      
      // 构建新的浏览记录
      const browseRecord = {
        goods_id: goods_id,
        description: goods.description || '',
        price: goods.price || 0,
        image: (goods.images && goods.images.length > 0) ? goods.images[0] : '',
        browse_time: new Date().toISOString() // 使用ISO格式保存时间
      };
      
      // 添加到最前面（最新的在最前面）
      browseHistory.unshift(browseRecord);
      
      // 限制最多20条
      if (browseHistory.length > 20) {
        browseHistory = browseHistory.slice(0, 20);
      }
      
      // 保存回本地缓存
      wx.setStorageSync('browse_history', browseHistory);
      
      // 更新个人中心的浏览数量
      this.updatePersonPageBrowseCount();
    } catch (error) {
      console.error('保存浏览记录失败:', error);
      // 静默失败，不影响页面正常使用
    }
  },

  /**
   * 更新个人中心页面的浏览数量
   */
  updatePersonPageBrowseCount() {
    try {
      const pages = getCurrentPages();
      const personPage = pages.find(page => page.route === 'pages/person/person');
      if (personPage && typeof personPage.loadBrowseCount === 'function') {
        personPage.loadBrowseCount();
      }
    } catch (error) {
      console.error('更新个人中心浏览数量失败:', error);
    }
  },

  /**
   * 显示评论弹窗
   */
  onShowCommentModal() {
    if (!this.data.canComment) {
      wx.showToast({
        title: '您暂无待评价的订单',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      showCommentModal: true,
      commentRating: 5,
      commentContent: '',
      commentImages: []
    });
  },

  /**
   * 关闭评论弹窗
   */
  onCloseCommentModal() {
    this.setData({
      showCommentModal: false,
      commentRating: 5,
      commentContent: '',
      commentImages: []
    });
  },

  /**
   * 选择评价星级
   */
  onSelectRating(e) {
    const rating = e.currentTarget.dataset.rating;
    this.setData({ commentRating: rating });
  },

  /**
   * 输入评价内容
   */
  onCommentContentInput(e) {
    this.setData({ commentContent: e.detail.value });
  },

  /**
   * 选择评价图片
   */
  async onSelectCommentImages() {
    try {
      const res = await wx.chooseMedia({
        count: 3,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      });
      
      if (res.tempFiles && res.tempFiles.length > 0) {
        const images = res.tempFiles.map(file => file.tempFilePath);
        this.setData({ commentImages: images });
      }
    } catch (error) {
      console.error('选择图片失败:', error);
    }
  },

  /**
   * 删除评价图片
   */
  onDeleteCommentImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.commentImages];
    images.splice(index, 1);
    this.setData({ commentImages: images });
  },

  /**
   * 预览评价图片
   */
  onPreviewCommentImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = e.currentTarget.dataset.urls || [];
    wx.previewImage({
      current: url,
      urls: urls.length > 0 ? urls : [url]
    });
  },

  /**
   * 提交评论
   */
  async onSubmitComment() {
    if (this.data.submittingComment) return;
    
    const { commentRating, commentContent, completedOrderId } = this.data;
    
    if (!commentContent || commentContent.trim() === '') {
      wx.showToast({
        title: '请输入评价内容',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ submittingComment: true });
    
    try {
      wx.showLoading({ title: '提交中...', mask: true });
      
      const user_id = wx.getStorageSync('user_id');
      
      // 上传图片（如果有）
      let imageUrls = [];
      if (this.data.commentImages.length > 0) {
        // 这里需要调用图片上传接口
        // 暂时使用临时路径，实际应该上传到服务器
        imageUrls = this.data.commentImages;
      }
      
      const result = await ajax('/comment/create', 'POST', {
        user_id: user_id,
        goods_id: this.data.goods_id,
        order_id: completedOrderId,
        rating: commentRating,
        content: commentContent.trim(),
        images: imageUrls
      });
      
      wx.hideLoading();
      
      if (result?.msg === 'success') {
        wx.showToast({
          title: '评价成功',
          icon: 'success'
        });
        
        // 关闭弹窗
        this.onCloseCommentModal();
        
        // 刷新评论列表和评论数
        this.loadCommentList();
        this.loadCommentCount();
        
        // 隐藏评价提醒
        this.setData({
          canComment: false,
          showCommentReminder: false
        });
        
        // 提示：评价完成后，订单状态已更新为已完成
      } else {
        wx.showToast({
          title: result?.error || '评价失败',
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('提交评论失败:', error);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ submittingComment: false });
    }
  }
})


