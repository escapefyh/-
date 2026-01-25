// pages/chat/chat.js
import { ajax, getUserinfo } from '../../utils/index'

Page({
  /**
   * 页面的初始数据
   */
  data: {
    targetUserId: '',      // 聊天对象用户ID
    targetUserInfo: {},    // 聊天对象用户信息（头像、昵称）
    goodsId: '',          // 关联的商品ID（可选）
    goodsInfo: {},         // 商品信息（可选）
    messageList: [],       // 消息列表
    inputText: '',        // 输入框内容
    loading: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    userinfo: {}          // 当前用户信息（用于显示自己的头像）
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const targetUserId = options.target_user_id;
    const goodsId = options.goods_id || '';
    
    if (!targetUserId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      targetUserId: targetUserId,
      goodsId: goodsId
    });

    // 加载当前用户信息（用于显示自己的头像）
    const user_id = wx.getStorageSync('user_id');
    const userinfo = user_id ? getUserinfo(user_id) : null;
    if (userinfo) {
      this.setData({ userinfo });
    }

    // 加载聊天对象信息
    this.loadTargetUserInfo();
    // 如果有商品ID，加载商品信息
    if (goodsId) {
      this.loadGoodsInfo();
    }
    // 标记消息为已读
    this.markMessagesAsRead();
    // 加载聊天记录
    this.loadChatMessages();
  },

  /**
   * 加载聊天对象信息
   */
  async loadTargetUserInfo() {
    try {
      const result = await ajax(`/user/info?user_id=${this.data.targetUserId}`, 'GET', {});
      if (result?.msg === 'success') {
        const userInfo = result.data || {};
        this.setData({
          targetUserInfo: {
            user_id: userInfo.user_id,
            nickname: userInfo.nickname || '未设置昵称',
            avatar: userInfo.avatar || '/assets/default_avatar.png'
          }
        });
        // 设置导航栏标题
        wx.setNavigationBarTitle({
          title: this.data.targetUserInfo.nickname
        });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  /**
   * 加载商品信息（如果有）
   */
  async loadGoodsInfo() {
    try {
      const result = await ajax(`/goods/detail?goods_id=${this.data.goodsId}`, 'GET', {});
      if (result?.msg === 'success') {
        const goods = result.data?.goods || {};
        this.setData({
          goodsInfo: {
            goods_id: goods.goods_id,
            description: goods.description,
            price: goods.price,
            images: goods.images || []
          }
        });
      }
    } catch (error) {
      console.error('加载商品信息失败:', error);
    }
  },

  /**
   * 点击商品信息卡片
   */
  onGoodsCardClick() {
    const goodsId = this.data.goodsId || this.data.goodsInfo.goods_id;
    if (!goodsId) {
      wx.showToast({
        title: '商品信息不存在',
        icon: 'none'
      });
      return;
    }

    // 跳转到商品详情页面
    wx.navigateTo({
      url: `/pages/goodsdetail/goodsdetail?goods_id=${goodsId}`
    });
  },

  /**
   * 标记消息为已读
   */
  async markMessagesAsRead() {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id || !this.data.targetUserId) {
      return;
    }

    try {
      const result = await ajax('/chat/markRead', 'POST', {
        user_id: user_id,
        target_user_id: this.data.targetUserId
      });

      if (result?.msg === 'success') {
        console.log('消息已标记为已读');
        // 标记成功后，通知消息列表页面刷新（如果存在）
        // 通过事件总线或页面栈来实现
        const pages = getCurrentPages();
        if (pages.length >= 2) {
          const prevPage = pages[pages.length - 2];
          // 如果上一页是消息列表页面，刷新它
          if (prevPage && prevPage.route === 'pages/message/message') {
            prevPage.loadChatList && prevPage.loadChatList();
            prevPage.updateUnreadMessageBadge && prevPage.updateUnreadMessageBadge();
          }
        }
        // 更新tabBar角标
        this.updateUnreadMessageBadge();
      } else {
        console.warn('标记消息为已读失败:', result?.error);
      }
    } catch (error) {
      console.error('标记消息为已读失败:', error);
      // 不显示错误提示，避免影响用户体验
    }
  },

  /**
   * 加载聊天记录
   */
  async loadChatMessages(isRefresh = false) {
    if (this.data.loading) return;

    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (isRefresh) {
      this.setData({ page: 1, hasMore: true });
    }

    if (!this.data.hasMore && !isRefresh) return;

    this.setData({ loading: true });

    try {
      const currentPage = isRefresh ? 1 : this.data.page;
      const result = await ajax(
        `/chat/messages?user_id=${user_id}&target_user_id=${this.data.targetUserId}&page=${currentPage}&pageSize=${this.data.pageSize}`,
        'GET',
        {}
      );

      if (result?.msg === 'success') {
        const list = result.data?.list || [];
        const total = result.data?.total || 0;

        // 处理消息列表，按时间排序
        const processedList = list.map(item => ({
          message_id: item.message_id,
          sender_id: item.sender_id,
          receiver_id: item.receiver_id,
          content: item.content,
          create_time: item.create_time,
          timeText: this.formatTime(item.create_time), // 格式化后的时间文本
          isMine: item.sender_id == user_id // 判断是否是自己发送的消息
        }));

        // 按时间升序排列（最早的在前）
        processedList.sort((a, b) => new Date(a.create_time) - new Date(b.create_time));

        const currentList = isRefresh ? [] : this.data.messageList;
        const newList = [...currentList, ...processedList];

        this.setData({
          messageList: newList,
          page: currentPage + 1,
          hasMore: newList.length < total,
          loading: false
        });

        // 滚动到底部
        this.scrollToBottom();
      } else {
        wx.showToast({
          title: result?.error || '加载消息失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('加载聊天记录失败:', error);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 输入框内容变化
   */
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  /**
   * 发送消息
   */
  async onSendMessage() {
    const content = this.data.inputText.trim();
    if (!content) {
      wx.showToast({
        title: '请输入消息内容',
        icon: 'none'
      });
      return;
    }

    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 清空输入框
    this.setData({ inputText: '' });

    try {
      const result = await ajax('/chat/send', 'POST', {
        sender_id: user_id,
        receiver_id: this.data.targetUserId,
        content: content,
        goods_id: this.data.goodsId || null
      });

      if (result?.msg === 'success') {
        // 发送成功，重新加载最新消息
        this.loadChatMessages(true);
      } else {
        wx.showToast({
          title: result?.error || '发送失败',
          icon: 'none'
        });
        // 恢复输入框内容
        this.setData({ inputText: content });
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
      // 恢复输入框内容
      this.setData({ inputText: content });
    }
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    setTimeout(() => {
      wx.createSelectorQuery().select('.chat-messages').boundingClientRect((rect) => {
        if (rect) {
          wx.pageScrollTo({
            scrollTop: rect.bottom,
            duration: 300
          });
        }
      }).exec();
    }, 100);
  },

  /**
   * 格式化时间
   */
  formatTime(timeStr) {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示时刷新消息列表并标记为已读
    if (this.data.targetUserId) {
      this.markMessagesAsRead();
      this.loadChatMessages(true);
    }
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    // 加载历史消息
    if (this.data.hasMore && !this.data.loading) {
      this.loadChatMessages();
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadChatMessages(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 更新未读消息数角标
   */
  async updateUnreadMessageBadge() {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      // 未登录，清除角标
      wx.removeTabBarBadge({
        index: 1 // 消息tabBar的索引
      });
      return;
    }

    try {
      const result = await ajax(`/chat/unreadCount?user_id=${user_id}`, 'GET', {});
      if (result?.msg === 'success') {
        const unreadCount = result.data?.unread_count || 0;
        if (unreadCount > 0) {
          // 显示角标，最多显示99+
          wx.setTabBarBadge({
            index: 1, // 消息tabBar的索引（从0开始，消息是第二个）
            text: unreadCount > 99 ? '99+' : String(unreadCount)
          });
        } else {
          // 清除角标
          wx.removeTabBarBadge({
            index: 1
          });
        }
      } else {
        // 请求失败，清除角标
        wx.removeTabBarBadge({
          index: 1
        });
      }
    } catch (error) {
      console.error('获取未读消息数失败:', error);
      // 出错时清除角标
      wx.removeTabBarBadge({
        index: 1
      });
    }
  }
})

