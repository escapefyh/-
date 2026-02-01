// pkg_user/browse/browse.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    browseList: [],
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '历史浏览'
    });
    this.loadBrowseList();
  },

  /**
   * 加载浏览记录列表
   */
  loadBrowseList() {
    this.setData({ loading: true });
    
    try {
      // 从本地缓存读取浏览记录
      const browseHistory = wx.getStorageSync('browse_history') || [];
      
      // 格式化时间显示
      const formattedList = browseHistory.map(item => {
        const browseTime = new Date(item.browse_time);
        const now = new Date();
        const diffMs = now - browseTime;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        let timeText = '';
        if (diffMins < 1) {
          timeText = '刚刚';
        } else if (diffMins < 60) {
          timeText = `${diffMins}分钟前`;
        } else if (diffHours < 24) {
          timeText = `${diffHours}小时前`;
        } else if (diffDays < 7) {
          timeText = `${diffDays}天前`;
        } else {
          const month = browseTime.getMonth() + 1;
          const day = browseTime.getDate();
          timeText = `${month}月${day}日`;
        }
        
        return {
          ...item,
          browse_time_text: timeText
        };
      });
      
      this.setData({
        browseList: formattedList,
        loading: false
      });
    } catch (error) {
      console.error('加载浏览记录失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 点击商品，跳转到商品详情
   */
  onGoodsClick(e) {
    const goodsId = e.currentTarget.dataset.goodsId;
    if (!goodsId) return;

    wx.navigateTo({
      url: `/pkg_goods/goodsdetail/goodsdetail?goods_id=${goodsId}`
    });
  },

  /**
   * 删除单条记录
   */
  onDeleteClick(e) {
    const goodsId = e.currentTarget.dataset.goodsId;
    const index = e.currentTarget.dataset.index;
    
    if (!goodsId) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条浏览记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteBrowseItem(goodsId, index);
        }
      }
    });
  },

  /**
   * 删除单条浏览记录
   */
  deleteBrowseItem(goodsId, index) {
    try {
      const browseHistory = wx.getStorageSync('browse_history') || [];
      const newHistory = browseHistory.filter(item => item.goods_id != goodsId);
      
      wx.setStorageSync('browse_history', newHistory);
      
      // 更新列表
      const browseList = [...this.data.browseList];
      browseList.splice(index, 1);
      
      this.setData({ browseList });
      
      // 更新个人中心的浏览数量
      this.updateBrowseCount();
      
      wx.showToast({
        title: '已删除',
        icon: 'success'
      });
    } catch (error) {
      console.error('删除浏览记录失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  /**
   * 清空所有记录
   */
  onClearAll() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有浏览记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.clearAllBrowseHistory();
        }
      }
    });
  },

  /**
   * 清空所有浏览记录
   */
  clearAllBrowseHistory() {
    try {
      wx.setStorageSync('browse_history', []);
      
      this.setData({ browseList: [] });
      
      // 更新个人中心的浏览数量
      this.updateBrowseCount();
      
      wx.showToast({
        title: '已清空',
        icon: 'success'
      });
    } catch (error) {
      console.error('清空浏览记录失败:', error);
      wx.showToast({
        title: '清空失败',
        icon: 'none'
      });
    }
  },

  /**
   * 更新个人中心的浏览数量
   */
  updateBrowseCount() {
    try {
      // 通过事件通知个人中心页面更新
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
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示时重新加载，因为可能在其他页面有新的浏览记录
    this.loadBrowseList();
  }
})

