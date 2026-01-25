// pages/message/message.js
import { ajax } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    chatList: [],      // 聊天列表
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '消息'
    });
    this.loadChatList();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 加载聊天列表
   */
  async loadChatList() {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      // 未登录，显示空状态
      this.setData({
        chatList: []
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const result = await ajax(`/chat/list?user_id=${user_id}`, 'GET', {});

      if (result?.msg === 'success') {
        const list = result.data?.list || [];
        
        console.log('聊天列表原始数据:', list);
        
        // 处理聊天列表数据
        const processedList = list.map(item => {
          // 确定聊天对象信息（对方用户）
          // 后端可能返回 user 和 target_user，或者 user1 和 user2
          // 需要找到不是当前用户的那个
          let targetUser = null;
          
          if (item.target_user) {
            // 如果后端返回了 target_user，直接使用
            targetUser = item.target_user;
          } else if (item.user) {
            // 如果后端返回了 user，需要判断是否是当前用户
            if (item.user.user_id == user_id) {
              // user 是当前用户，需要找另一个用户（可能是 user2 或其他字段）
              targetUser = item.user2 || item.other_user || null;
            } else {
              // user 不是当前用户，就是聊天对象
              targetUser = item.user;
            }
          } else if (item.user1 && item.user2) {
            // 如果后端返回了 user1 和 user2，找到不是当前用户的那个
            targetUser = item.user1.user_id == user_id ? item.user2 : item.user1;
          }
          
          // 如果还是找不到，尝试从其他字段获取
          if (!targetUser) {
            console.warn('无法确定聊天对象，item:', item);
            // 使用默认值
            targetUser = {
              user_id: item.target_user_id || item.other_user_id || '',
              nickname: '未设置昵称',
              avatar: '/assets/default_avatar.png'
            };
          }
          
          // 处理头像URL
          let avatarUrl = targetUser.avatar || '/assets/default_avatar.png';
          // 如果头像URL是无效的示例URL，使用默认头像
          if (avatarUrl && (avatarUrl.includes('your-domain.com') || avatarUrl.includes('example.com') || avatarUrl.includes('localhost'))) {
            avatarUrl = '/assets/default_avatar.png';
          }
          // 如果头像URL为空字符串或null，使用默认头像
          if (!avatarUrl || avatarUrl.trim() === '' || avatarUrl === 'null' || avatarUrl === 'undefined') {
            avatarUrl = '/assets/default_avatar.png';
          }
          
          const processedItem = {
            chat_id: item.chat_id,
            target_user_id: targetUser.user_id || '',
            target_user_name: targetUser.nickname || '未设置昵称',
            target_user_avatar: avatarUrl,
            last_message: item.last_message || '',
            last_message_time: item.last_message_time || '',
            timeText: this.formatTime(item.last_message_time), // 格式化后的时间文本
            unread_count: item.unread_count || 0,
            goods_id: item.goods_id || ''
          };
          
          console.log('处理后的聊天项:', processedItem);
          return processedItem;
        });

        this.setData({
          chatList: processedList,
          loading: false
        });
      } else {
        wx.showToast({
          title: result?.error || '加载聊天列表失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('加载聊天列表失败:', error);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 点击聊天项
   */
  onChatItemClick(e) {
    console.log('点击聊天项，事件对象:', e);
    const targetUserId = e.currentTarget.dataset.targetUserId;
    const goodsId = e.currentTarget.dataset.goodsId || '';
    
    console.log('targetUserId:', targetUserId, 'goodsId:', goodsId);
    
    if (!targetUserId || targetUserId === '') {
      wx.showToast({
        title: '无法获取聊天对象信息',
        icon: 'none'
      });
      return;
    }

    // 检查是否登录
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

    // 检查不能和自己聊天
    if (targetUserId == user_id) {
      wx.showToast({
        title: '不能和自己聊天',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/chat/chat?target_user_id=${targetUserId}&goods_id=${goodsId}`
    });
  },

  /**
   * 头像加载失败处理
   */
  onAvatarError(e) {
    const index = e.currentTarget.dataset.index;
    console.warn('头像加载失败，切换到默认头像，索引:', index);
    const chatList = this.data.chatList;
    if (chatList[index]) {
      chatList[index].target_user_avatar = '/assets/default_avatar.png';
      this.setData({
        chatList: chatList
      });
    }
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
    
    return `${date.getMonth() + 1}-${date.getDate()}`;
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示时刷新聊天列表（从聊天详情页返回时会自动刷新未读消息数）
    this.loadChatList();
    // 更新tabBar角标
    this.updateUnreadMessageBadge();
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
    this.loadChatList().then(() => {
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