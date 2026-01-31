// pkg_goods/paysuccess/paysuccess.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    orderInfo: null,  // 订单信息
    payAmount: '0.00',  // 支付金额
    orderId: null,     // 订单ID
    orderNo: ''        // 订单编号
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 从页面参数中获取订单信息
    if (options.order_id) {
      this.setData({
        orderId: options.order_id
      });
    }
    
    if (options.order_no) {
      this.setData({
        orderNo: decodeURIComponent(options.order_no)
      });
    }
    
    if (options.pay_amount) {
      const payAmount = parseFloat(options.pay_amount) || 0;
      this.setData({
        payAmount: payAmount.toFixed(2)
      });
    }

    // 如果有订单ID，可以加载订单详情（可选）
    if (this.data.orderId) {
      // this.loadOrderDetail();
    }
  },

  /**
   * 查看订单
   */
  onViewOrder() {
    // 跳转到订单页面，显示已支付的订单
    wx.redirectTo({
      url: '/pkg_goods/order/order?status=paid'
    });
  },

  /**
   * 继续逛逛
   */
  onContinueShopping() {
    // 返回首页
    wx.switchTab({
      url: '/pages/index/index'
    });
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

  }
})





