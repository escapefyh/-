// pages/changepassword/changepassword.js
import { ajax } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  },

  /**
   * 原密码输入变化
   */
  onOldPasswordChange(e) {
    this.setData({
      oldPassword: e.detail.value
    });
  },

  /**
   * 新密码输入变化
   */
  onNewPasswordChange(e) {
    this.setData({
      newPassword: e.detail.value
    });
  },

  /**
   * 确认密码输入变化
   */
  onConfirmPasswordChange(e) {
    this.setData({
      confirmPassword: e.detail.value
    });
  },

  /**
   * 提交修改密码
   */
  async onSubmit() {
    const { oldPassword, newPassword, confirmPassword } = this.data;
    const user_id = wx.getStorageSync('user_id');

    // 验证是否登录
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

    // 验证输入
    if (!oldPassword || !oldPassword.trim()) {
      wx.showToast({
        title: '请输入原密码',
        icon: 'none'
      });
      return;
    }

    if (!newPassword || !newPassword.trim()) {
      wx.showToast({
        title: '请输入新密码',
        icon: 'none'
      });
      return;
    }

    // 验证密码长度
    if (newPassword.length < 6 || newPassword.length > 20) {
      wx.showToast({
        title: '新密码长度应在6-20个字符之间',
        icon: 'none'
      });
      return;
    }

    if (!confirmPassword || !confirmPassword.trim()) {
      wx.showToast({
        title: '请确认新密码',
        icon: 'none'
      });
      return;
    }

    // 验证两次输入的新密码是否一致
    if (newPassword !== confirmPassword) {
      wx.showToast({
        title: '两次输入的新密码不一致',
        icon: 'none'
      });
      return;
    }

    // 验证新密码不能与原密码相同
    if (oldPassword === newPassword) {
      wx.showToast({
        title: '新密码不能与原密码相同',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '修改中...',
        mask: true
      });

      // 调用修改密码接口
      const result = await ajax('/user/changePassword', 'POST', {
        user_id: user_id,
        old_password: oldPassword.trim(),
        new_password: newPassword.trim()
      });

      wx.hideLoading();

      if (result?.msg === 'success') {
        wx.showToast({
          title: '密码修改成功',
          icon: 'success'
        });

        // 清空输入框
        this.setData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result?.error || '密码修改失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('修改密码失败:', error);
      wx.showToast({
        title: error?.msg || '网络请求失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
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



















