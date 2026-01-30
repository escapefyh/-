// pages/goodsmanage/goodsmanage.js
import { ajax } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    goodsList: [],
    page: 1,
    pageSize: 20,
    total: 0,
    loading: false,
    hasMore: true,
    showEditModal: false,      // 是否显示编辑弹窗
    editingGoods: null,         // 正在编辑的商品
    newPrice: ''                // 新价格
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadMyGoodsList();
  },

  /**
   * 加载我的商品列表
   */
  async loadMyGoodsList(isRefresh = false) {
    if (this.data.loading) return;
    
    // 检查登录状态
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
      this.setData({ page: 1, hasMore: true });
    }

    if (!this.data.hasMore && !isRefresh) return;

    this.setData({ loading: true });

    try {
      const currentPage = isRefresh ? 1 : this.data.page;
      const result = await ajax(
        `/goods/myGoods?user_id=${user_id}&page=${currentPage}&pageSize=${this.data.pageSize}`,
        'GET',
        {}
      );

      if (result?.msg === 'success') {
        const list = result.data?.list || [];
        const total = result.data?.total || 0;

        // 处理每个商品
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
      wx.showToast({
        title: '网络请求失败',
        icon: 'none',
        duration: 3000
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 编辑商品
   */
  onEdit(e) {
    const goods_id = e.currentTarget.dataset.goodsId;
    // 找到要编辑的商品
    const goods = this.data.goodsList.find(item => item.goods_id == goods_id);
    if (!goods) {
      wx.showToast({
        title: '商品不存在',
        icon: 'none'
      });
      return;
    }
    
    // 显示编辑弹窗
    this.setData({
      showEditModal: true,
      editingGoods: goods,
      newPrice: goods.price.toString()
    });
  },

  /**
   * 价格输入
   */
  onPriceInput(e) {
    this.setData({
      newPrice: e.detail.value
    });
  },

  /**
   * 关闭编辑弹窗
   */
  onCloseEditModal() {
    this.setData({
      showEditModal: false,
      editingGoods: null,
      newPrice: ''
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止点击弹窗内容区域时关闭弹窗
  },

  /**
   * 确认编辑
   */
  async onConfirmEdit() {
    const { editingGoods, newPrice } = this.data;
    
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

    // 如果价格没有变化，直接关闭
    if (price === editingGoods.price) {
      this.onCloseEditModal();
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
      const result = await ajax('/goods/update', 'POST', {
        goods_id: editingGoods.goods_id,
        user_id: user_id,
        price: price
      });

      wx.hideLoading();

      if (result?.msg === 'success') {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
        
        // 关闭弹窗
        this.onCloseEditModal();
        
        // 刷新列表
        this.loadMyGoodsList(true);
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
   * 删除商品
   */
  onDelete(e) {
    const goods_id = e.currentTarget.dataset.goodsId;
    
    wx.showModal({
      title: '提示',
      content: '确定要删除这个商品吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const user_id = wx.getStorageSync('user_id');
            const result = await ajax(`/goods/delete`, 'POST', {
              goods_id: goods_id,
              user_id: user_id
            });

            if (result?.msg === 'success') {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              // 刷新列表
              this.loadMyGoodsList(true);
            } else {
              wx.showToast({
                title: result?.error || '删除失败',
                icon: 'none'
              });
            }
          } catch (error) {
            console.error('删除商品失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
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
    // 从其他页面返回时刷新列表
    this.loadMyGoodsList(true);
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
    this.loadMyGoodsList(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMyGoodsList();
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








