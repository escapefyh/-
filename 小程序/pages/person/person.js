// pages/person/person.js
import { ajax, getUserinfo } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    wxlogin: false,
    userinfo: undefined
  },

  getuserinfo() {
    // 跳转到用户信息页面进行授权
    // ✅ 修改：路径改为 pkg_user 分包
    wx.navigateTo({
      url: '/pkg_user/userinfo/userinfo'
    });
  },

  /**
   * 跳转到购物车(我的收藏)页面
   */
  goToCollect() {
    // ✅ 修改：路径改为 pkg_user 分包
    wx.navigateTo({
      url: '/pkg_user/collect/collect'
    });
  },

  /**
   * 跳转到我的订单页面
   */
  goToOrder() {
    // ✅ 修改：路径改为 pkg_goods 分包
    wx.navigateTo({
      url: '/pkg_goods/order/order'
    });
  },

  /**
   * 跳转到商品管理页面
   */
  goToGoodsManage() {
    // ✅ 修改：路径改为 pkg_goods 分包
    wx.navigateTo({
      url: '/pkg_goods/goodsmanage/goodsmanage'
    });
  },

  /**
   * 跳转到设置页面
   */
  goToSettings() {
    // ✅ 修改：路径改为 pkg_user 分包
    wx.navigateTo({
      url: '/pkg_user/settings/settings'
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

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
    // 检查是否已登录
    const userInfo = wx.getStorageSync("userInfo");
    const user_id = wx.getStorageSync("user_id");

    // 如果已登录，检查是否有nickname
    if (userInfo && user_id) {
      // 获取该账号的微信授权信息（按user_id存储）
      const userinfo = getUserinfo(user_id);

      // 如果有nickname或userinfo，说明已授权
      if (userInfo.nickname || (userinfo && userinfo.nickname)) {
        this.setData({
          wxlogin: true,
          userinfo: {
            nickname: userInfo.nickname || userinfo?.nickname || '未设置昵称',
            avatar: userinfo?.avatar || '/assets/default_avatar.png'
          }
        });
      } else {
        // 没有nickname，显示"微信授权"
        this.setData({
          wxlogin: false,
          userinfo: undefined
        });
      }
    } else {
      // 未登录
      this.setData({
        wxlogin: false,
        userinfo: undefined
      });
    }
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

  }
})