// pages/collect/collect.js
import { ajax } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    goodsList: [],
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
      title: '我的收藏'
    });
    this.loadFavoriteList();
  },

  /**
   * 加载收藏列表
   */
  async loadFavoriteList(isRefresh = false) {
    if (this.data.loading) return;

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
        `/favorite/list?user_id=${user_id}&page=${currentPage}&pageSize=${this.data.pageSize}`,
        'GET',
        {}
      );

      if (result?.msg === 'success') {
        const list = result.data?.list || [];
        const total = result.data?.total || 0;

        // 处理每个商品，保证 images 为数组
        const processedList = list.map(item => {
          if (!item.images || !Array.isArray(item.images)) {
            item.images = [];
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
        console.error('获取收藏列表失败:', result);
        wx.showToast({
          title: result?.error || result?.msg || '获取收藏列表失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('获取收藏列表失败:', error);
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
    this.loadFavoriteList();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadFavoriteList(true);
    wx.stopPullDownRefresh();
  },

  /**
   * 点击商品，跳转到商品详情
   */
  onGoodsClick(e) {
    const goodsId = e.currentTarget.dataset.goodsId;
    if (!goodsId) return;

    wx.navigateTo({
      url: `/pages/goodsdetail/goodsdetail?goods_id=${goodsId}`
    });
  },

  /**
   * 图片加载错误处理
   */
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const goodsList = this.data.goodsList;
    if (goodsList[index] && goodsList[index].images && goodsList[index].images.length > 0) {
      // 将失败的图片替换为默认图片
      goodsList[index].images[0] = '/assets/store.png';
      this.setData({
        goodsList: goodsList
      });
    }
  }
})