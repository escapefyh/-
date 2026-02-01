// pkg_user/follow/follow.js
import { ajax } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    followList: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    hasMore: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '我的关注'
    });
    this.loadFollowList();
  },

  /**
   * 加载关注列表
   */
  async loadFollowList(isRefresh = false) {
    if (this.data.loading) return;

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

    if (isRefresh) {
      this.setData({
        page: 1,
        hasMore: true
      });
    }

    if (!this.data.hasMore && !isRefresh) return;

    this.setData({ loading: true });

    try {
      const currentPage = isRefresh ? 1 : this.data.page;
      const result = await ajax(
        `/follow/list?user_id=${user_id}&page=${currentPage}&pageSize=${this.data.pageSize}`,
        'GET',
        {}
      );

      if (result?.msg === 'success') {
        const list = result.data?.list || [];
        const total = result.data?.total || 0;

        const currentList = isRefresh ? [] : this.data.followList;
        const newList = [...currentList, ...list];

        this.setData({
          followList: newList,
          total,
          page: currentPage + 1,
          hasMore: newList.length < total,
          loading: false
        });
      } else {
        console.error('获取关注列表失败:', result);
        wx.showToast({
          title: result?.error || result?.msg || '获取关注列表失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('获取关注列表失败:', error);
      wx.showToast({
        title: '网络异常，请稍后重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 触底加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadFollowList();
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadFollowList(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 点击用户，跳转到该用户的商品列表
   */
  onUserClick(e) {
    const userId = e.currentTarget.dataset.userId;
    if (!userId) return;

    const followItem = this.data.followList.find(item => item.user_id == userId);
    const userName = followItem?.nickname || followItem?.name || '卖家';

    wx.navigateTo({
      url: `/pkg_goods/goodslist/goodslist?seller_id=${userId}&seller_name=${encodeURIComponent(userName)}`
    });
  },

  /**
   * 取消关注
   */
  onUnfollowClick(e) {
    const userId = e.currentTarget.dataset.userId;
    const index = e.currentTarget.dataset.index;
    
    if (!userId) return;

    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认取消关注',
      content: '确定要取消关注该用户吗？',
      success: (res) => {
        if (res.confirm) {
          this.doUnfollow(user_id, userId, index);
        }
      }
    });
  },

  /**
   * 执行取消关注操作
   */
  async doUnfollow(user_id, followed_id, index) {
    try {
      const result = await ajax('/follow/toggle', 'POST', {
        user_id,
        followed_id
      });

      if (result?.msg === 'success') {
        // 从列表中移除
        const followList = [...this.data.followList];
        followList.splice(index, 1);
        
        this.setData({
          followList,
          total: this.data.total - 1
        });

        wx.showToast({
          title: '已取消关注',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result?.error || '取消关注失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('取消关注失败:', error);
      wx.showToast({
        title: '网络异常，请稍后重试',
        icon: 'none'
      });
    }
  }
})











