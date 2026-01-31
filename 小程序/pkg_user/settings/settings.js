// pages/settings/settings.js
Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  /**
   * 跳转到账号与安全页面
   */
  goToAccountSecurity() {
    wx.navigateTo({
      url: '/pkg_user/changepassword/changepassword'
    });
  },

  /**
   * 跳转到地址管理页面
   */
  goToAddressManage() {
    wx.navigateTo({
      url: '/pkg_user/addresslist/addresslist'
    });
  },

  /**
   * 清除缓存
   */
  clearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除所有缓存数据吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          try {
            // 清除所有本地存储
            wx.clearStorageSync();
            
            wx.showToast({
              title: '缓存已清除',
              icon: 'success',
              duration: 1500
            });

            // 清除缓存后跳转到登录页面
            setTimeout(() => {
              wx.reLaunch({
                url: '/pkg_user/login/login'
              });
            }, 1500);
          } catch (error) {
            console.error('清除缓存失败:', error);
            wx.showToast({
              title: '清除缓存失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 跳转到关于我们页面
   */
  goToAbout() {
    wx.navigateTo({
      url: '/pkg_interact/about/about'
    });
  },

  /**
   * 跳转到隐私政策页面
   */
  goToPrivacy() {
    wx.navigateTo({
      url: '/pkg_interact/privacy/privacy'
    });
  },

  /**
   * 退出登录
   */
  toquit() {
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
          
          // 显示退出成功提示
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 1500
          });
          
          // 跳转到登录页面（清空页面栈，不能返回）
          setTimeout(() => {
            wx.reLaunch({
              url: '/pkg_user/login/login'
            });
          }, 1500);
        }
      }
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

















