// pages/person/person.js
import { ajax, getUserinfo } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
      wxlogin:false,
      userinfo:undefined
  },

  getuserinfo(){
    // 跳转到用户信息页面进行授权
    wx.navigateTo({
      url: '../userinfo/userinfo'
    });
  },

  /**
   * 跳转到购物车页面
   */
  goToCollect() {
    wx.navigateTo({
      url: '../collect/collect'
    });
  },

  /**
   * 跳转到我的订单页面
   */
  goToOrder() {
    wx.navigateTo({
      url: '../order/order'
    });
  },

  /**
   * 跳转到商品管理页面
   */
  goToGoodsManage() {
    wx.navigateTo({
      url: '../goodsmanage/goodsmanage'
    });
  },

  toquit(){
    // 显示确认对话框
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 获取当前登录的user_id
          const currentUserId = wx.getStorageSync('user_id');
          
          // 清除登录相关的信息
          // 注意：不清除 userinfo_{user_id}，这样下次登录该账号时可以恢复微信授权信息
          wx.removeStorageSync('user_id');
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('wxlogin');
          
          // 重置页面数据为默认状态
          this.setData({
            wxlogin: false,
            userinfo: undefined
          });
          
          // 显示退出成功提示
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 1500
          });
          
          // 跳转到登录页面（清空页面栈，不能返回）
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/login'
            });
          }, 1500);
        }
      }
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  /*
  onLoad(options) 是小程序页面首次加载时执行的生命周期函数，仅触发一次；
options 参数用于接收其他页面跳转时传递的 URL 参数，是页面间传参的核心方式；
主要用于页面初始化（如请求数据、检查登录、接收参数），是页面逻辑的 “入口”。
*/

/*this.setData({ wxlogin, userinfo }) 的作用是 将变量 wxlogin 和 userinfo 的值更新到页面数据中，并触发视图重新渲染，确保页面显示最新的登录状态和用户信息。
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

  /*
  你打开 “我的” 页面 → onLoad（1 次） + onShow（第 1 次）；
从 “我的” 页面跳转到 “设置” 页面 → 当前页面触发 onHide；
从 “设置” 页面返回 “我的” 页面 → 不会触发 onLoad，但会触发 onShow（第 2 次）；
把小程序切到后台（比如切到微信聊天）再切回来 → 触发 onShow（第 3 次）。
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