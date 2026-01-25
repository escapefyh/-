// pages/goodslist/goodslist.js
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
    hasMore: true,
    categoryId: null,      // 分类ID（可选）
    categoryName: ''       // 分类名称（用于显示标题）
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取分类ID和名称（如果是从分类页面跳转过来的）
    if (options.category_id) {
      const categoryId = parseInt(options.category_id);
      const categoryName = decodeURIComponent(options.category_name || '');
      
      this.setData({
        categoryId: categoryId,
        categoryName: categoryName
      });
      
      // 设置页面标题
      if (categoryName) {
        wx.setNavigationBarTitle({
          title: categoryName
        });
      }
      
      console.log('加载分类商品，分类ID:', categoryId, '分类名称:', categoryName);
    }
    
    this.loadGoodsList();
  },

  /**
   * 加载商品列表
   */
  async loadGoodsList(isRefresh = false) {
    if (this.data.loading) return;
    
    if (isRefresh) {
      this.setData({ page: 1, hasMore: true });
    }

    if (!this.data.hasMore && !isRefresh) return;

    this.setData({ loading: true });

    try {
      // 构建请求URL，如果有分类ID则添加 category_id 参数
      let requestUrl = `/goods/list?page=${this.data.page}&pageSize=${this.data.pageSize}`;
      if (this.data.categoryId) {
        requestUrl += `&category_id=${this.data.categoryId}`;
      }
      
      console.log('请求商品列表，URL:', requestUrl);
      
      const result = await ajax(
        requestUrl,
        'GET',
        {}
      );

      if (result?.msg === 'success') {
        const list = result.data?.list || [];
        const total = result.data?.total || 0;

        console.log('获取到的商品列表:', list);
        console.log('商品总数:', total);

        // 处理每个商品，添加拼团折扣文本
        const processedList = list.map(item => {
          if (item.group_buy_enabled && item.group_buy_discount) {
            item.groupBuyDiscountText = (item.group_buy_discount * 10).toFixed(0);
          }
          // 确保 images 是数组
          if (!item.images || !Array.isArray(item.images)) {
            item.images = [];
          }
          // 确保 seller 是对象
          if (!item.seller || typeof item.seller !== 'object') {
            item.seller = {};
          }
          // 确保 sales_count 存在
          item.sales_count = item.sales_count || 0;
          return item;
        });

        const currentList = isRefresh ? [] : this.data.goodsList;
        const newList = [...currentList, ...processedList];
        
        this.setData({
          goodsList: newList,
          total,
          page: this.data.page + 1,
          hasMore: newList.length < total,
          loading: false
        });
      } else {
        console.error('API返回错误:', result);
        wx.showToast({
          title: result?.error || result?.msg || '获取商品列表失败',
          icon: 'none',
          duration: 3000
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('获取商品列表失败:', error);
      console.error('错误详情:', JSON.stringify(error));
      wx.showToast({
        title: '网络请求失败: ' + (error.message || '未知错误'),
        icon: 'none',
        duration: 3000
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 点击商品
   */
  onGoodsClick(e) {
    const goods_id = e.currentTarget.dataset.goodsId;
    wx.navigateTo({
      url: `/pages/goodsdetail/goodsdetail?goods_id=${goods_id}`
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
    this.loadGoodsList(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadGoodsList();
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

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

