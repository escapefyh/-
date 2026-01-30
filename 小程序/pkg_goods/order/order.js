// pages/order/order.js
import { ajax, getUserinfo } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 订单状态筛选
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待付款' },
      { key: 'paid', label: '待发货' },
      { key: 'shipped', label: '待收货' },
      { key: 'completed', label: '已完成' },
      { key: 'cancelled', label: '已取消' }
    ],
    activeStatus: 'all', // 当前选中的状态
    
    // 订单列表
    orderList: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    hasMore: true,
    
    // 空状态
    isEmpty: false,
    
    // 支付弹窗相关
    showPayModal: false,     // 是否显示支付弹窗
    currentPayOrder: null,   // 当前待支付的订单信息
    walletBalance: 0,        // 钱包余额（数字）
    walletBalanceFormatted: '0.00',  // 钱包余额（格式化字符串）
    payAmountFormatted: '0.00'  // 支付金额（格式化字符串）
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 如果从其他页面传入状态筛选，使用传入的状态
    if (options.status) {
      this.setData({
        activeStatus: options.status
      });
    }
    this.loadOrderList(true);
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时刷新订单列表（可能从订单详情页返回，订单状态可能已更新）
    this.loadOrderList(true);
  },

  /**
   * 切换订单状态筛选
   */
  onStatusTabChange(e) {
    const status = e.currentTarget.dataset.status;
    if (status === this.data.activeStatus) return;
    
    this.setData({
      activeStatus: status,
      page: 1,
      hasMore: true,
      orderList: []
    });
    this.loadOrderList(true);
  },

  /**
   * 加载订单列表
   */
  async loadOrderList(isRefresh = false) {
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
      this.setData({ page: 1, hasMore: true, orderList: [] });
    }

    if (!this.data.hasMore && !isRefresh) return;

    this.setData({ loading: true });

    try {
      const currentPage = isRefresh ? 1 : this.data.page;
      const status = this.data.activeStatus === 'all' ? '' : this.data.activeStatus;
      
      const result = await ajax(
        `/order/list?user_id=${user_id}&status=${status}&page=${currentPage}&pageSize=${this.data.pageSize}`,
        'GET',
        {}
      );

      if (result?.msg === 'success') {
        const list = result.data?.list || [];
        const total = result.data?.total || 0;

        // 处理订单数据，格式化时间、价格等
        const processedList = list.map(order => {
          // 格式化创建时间
          if (order.create_time) {
            order.create_time_formatted = this.formatTime(order.create_time);
          }
          
          // 格式化订单状态显示文本
          order.status_text = this.getStatusText(order.status);
          
          // 确保商品图片是数组
          if (order.goods_image && !Array.isArray(order.goods_image)) {
            order.goods_image = [order.goods_image];
          }
          
          // 处理价格显示
          if (order.total_price !== undefined) {
            order.total_price_formatted = parseFloat(order.total_price).toFixed(2);
          }
          
          return order;
        });

        const currentList = isRefresh ? [] : this.data.orderList;
        const newList = [...currentList, ...processedList];
        
        this.setData({
          orderList: newList,
          total,
          page: currentPage + 1,
          hasMore: newList.length < total,
          loading: false,
          isEmpty: newList.length === 0 && !this.data.loading
        });
      } else {
        console.error('API返回错误:', result);
        wx.showToast({
          title: result?.error || result?.msg || '获取订单列表失败',
          icon: 'none',
          duration: 3000
        });
        this.setData({ 
          loading: false,
          isEmpty: this.data.orderList.length === 0
        });
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
      wx.showToast({
        title: error?.msg || '网络请求失败',
        icon: 'none',
        duration: 3000
      });
      this.setData({ 
        loading: false,
        isEmpty: this.data.orderList.length === 0
      });
    }
  },

  /**
   * 格式化时间
   */
  formatTime(timeStr) {
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
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      
      // 如果是今年，不显示年份
      if (year === now.getFullYear()) {
        return `${month}-${day} ${hour}:${minute}`;
      }
      
      return `${year}-${month}-${day} ${hour}:${minute}`;
    } catch (e) {
      return timeStr;
    }
  },

  /**
   * 获取订单状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'pending': '待付款',
      'paid': '待发货',
      'shipped': '待收货',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  },

  /**
   * 查看订单详情
   */
  onViewDetail(e) {
    const order_id = e.currentTarget.dataset.orderId;
    if (!order_id) return;
    
    // 跳转到订单详情页（如果后续需要实现）
    // wx.navigateTo({
    //   url: `/pkg_goods/orderdetail/orderdetail?order_id=${order_id}`
    // });
    
    // 暂时显示订单信息
    const order = this.data.orderList.find(item => item.order_id == order_id);
    if (order) {
      wx.showModal({
        title: '订单详情',
        content: `订单编号：${order.order_no || order.order_id}\n商品：${order.goods_description || '未知'}\n数量：${order.quantity || 1}\n总价：¥${order.total_price_formatted || '0.00'}\n状态：${order.status_text}\n时间：${order.create_time_formatted}`,
        showCancel: false
      });
    }
  },

  /**
   * 取消订单
   */
  async onCancelOrder(e) {
    const order_id = e.currentTarget.dataset.orderId;
    if (!order_id) return;
    
    const order = this.data.orderList.find(item => item.order_id == order_id);
    if (!order) return;
    
    // 只有待付款和待发货的订单可以取消
    if (order.status !== 'pending' && order.status !== 'paid') {
      wx.showToast({
        title: '该订单无法取消',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.cancelOrder(order_id);
        }
      }
    });
  },

  /**
   * 执行取消订单
   */
  async cancelOrder(order_id) {
    try {
      wx.showLoading({
        title: '处理中...',
        mask: true
      });
      
      const user_id = wx.getStorageSync('user_id');
      const result = await ajax('/order/cancel', 'POST', {
        user_id: user_id,
        order_id: order_id
      });
      
      wx.hideLoading();
      
      if (result?.msg === 'success') {
        wx.showToast({
          title: '订单已取消',
          icon: 'success'
        });
        // 刷新订单列表
        this.loadOrderList(true);
      } else {
        wx.showToast({
          title: result?.error || '取消订单失败',
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('取消订单失败:', error);
      wx.showToast({
        title: error?.msg || '网络请求失败',
        icon: 'none',
        duration: 3000
      });
    }
  },

  /**
   * 确认收货
   */
  async onConfirmReceive(e) {
    const order_id = e.currentTarget.dataset.orderId;
    if (!order_id) return;
    
    const order = this.data.orderList.find(item => item.order_id == order_id);
    if (!order) return;
    
    // 只有待收货的订单可以确认收货
    if (order.status !== 'shipped') {
      wx.showToast({
        title: '该订单无法确认收货',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认收货',
      content: '确认已收到商品吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.confirmReceive(order_id);
        }
      }
    });
  },

  /**
   * 执行确认收货
   */
  async confirmReceive(order_id) {
    try {
      wx.showLoading({
        title: '处理中...',
        mask: true
      });
      
      const user_id = wx.getStorageSync('user_id');
      const result = await ajax('/order/confirm', 'POST', {
        user_id: user_id,
        order_id: order_id
      });
      
      wx.hideLoading();
      
      if (result?.msg === 'success') {
        wx.showToast({
          title: '确认收货成功',
          icon: 'success'
        });
        // 刷新订单列表
        this.loadOrderList(true);
      } else {
        wx.showToast({
          title: result?.error || '确认收货失败',
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('确认收货失败:', error);
      wx.showToast({
        title: error?.msg || '网络请求失败',
        icon: 'none',
        duration: 3000
      });
    }
  },

  /**
   * 去付款
   */
  async onPayOrder(e) {
    const order_id = e.currentTarget.dataset.orderId;
    if (!order_id) return;
    
    const order = this.data.orderList.find(item => item.order_id == order_id);
    if (!order) return;
    
    // 只有待付款的订单可以支付
    if (order.status !== 'pending') {
      wx.showToast({
        title: '该订单无法支付',
        icon: 'none'
      });
      return;
    }
    
    // 打开支付弹窗
    await this.openPayModal(order);
  },

  /**
   * 打开支付弹窗
   */
  async openPayModal(order) {
    const user_id = wx.getStorageSync('user_id');
    
    try {
      // 获取钱包余额
      const balanceResult = await ajax(`/wallet/balance?user_id=${user_id}`, 'GET', {});
      let balance = 0;
      if (balanceResult?.msg === 'success') {
        balance = parseFloat(balanceResult.data?.balance || 0);
      }
      
      // 格式化金额
      const payAmount = parseFloat(order.total_price || order.total_price_formatted || 0);
      const balanceNum = parseFloat(balance) || 0;
      
      // 确保订单有格式化后的价格
      if (!order.total_price_formatted) {
        order.total_price_formatted = payAmount.toFixed(2);
      }
      
      this.setData({
        showPayModal: true,
        currentPayOrder: order,
        walletBalance: balanceNum,
        walletBalanceFormatted: balanceNum.toFixed(2),
        payAmountFormatted: payAmount.toFixed(2)
      });
    } catch (error) {
      console.error('获取余额失败:', error);
      // 即使获取余额失败，也显示支付弹窗
      const payAmount = parseFloat(order.total_price || order.total_price_formatted || 0);
      if (!order.total_price_formatted) {
        order.total_price_formatted = payAmount.toFixed(2);
      }
      this.setData({
        showPayModal: true,
        currentPayOrder: order,
        walletBalance: 0,
        walletBalanceFormatted: '0.00',
        payAmountFormatted: payAmount.toFixed(2)
      });
    }
  },

  /**
   * 关闭支付弹窗
   */
  onClosePayModal() {
    this.setData({
      showPayModal: false,
      currentPayOrder: null,
      walletBalance: 0,
      walletBalanceFormatted: '0.00',
      payAmountFormatted: '0.00'
    });
  },

  /**
   * 确认支付
   */
  async onConfirmPay() {
    const { currentPayOrder, walletBalance } = this.data;
    
    if (!currentPayOrder || !currentPayOrder.order_id) {
      wx.showToast({
        title: '订单信息不存在',
        icon: 'none'
      });
      return;
    }

    const payAmount = parseFloat(currentPayOrder.total_price || currentPayOrder.total_price_formatted || 0);

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
    await this.doPay(currentPayOrder.order_id);
  },

  /**
   * 执行支付订单
   */
  async doPay(order_id) {
    try {
      wx.showLoading({
        title: '支付中...',
        mask: true
      });
      
      const user_id = wx.getStorageSync('user_id');
      const result = await ajax('/order/pay', 'POST', {
        user_id: user_id,
        order_id: order_id
      });
      
      wx.hideLoading();
      
      if (result?.msg === 'success') {
        wx.showToast({
          title: '支付成功',
          icon: 'success'
        });
        
        // 关闭支付弹窗
        this.onClosePayModal();
        
        // 刷新订单列表
        this.loadOrderList(true);
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
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadOrderList(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadOrderList(false);
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '我的订单',
      path: '/pkg_goods/order/order'
    };
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  }
})
