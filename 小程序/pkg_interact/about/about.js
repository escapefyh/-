// pages/about/about.js
import { ajax } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    appName: '拼单商城',
    appVersion: '1.0.0',
    aboutContent: '',
    contactInfo: null,
    copyrightYear: new Date().getFullYear()
  },

  /**
   * 加载关于我们信息
   */
  async loadAboutInfo() {
    try {
      wx.showLoading({
        title: '加载中...',
        mask: true
      });

      const result = await ajax('/app/about', 'GET', {});

      wx.hideLoading();

      if (result?.msg === 'success') {
        const data = result.data || {};
        this.setData({
          appName: data.app_name || this.data.appName,
          appVersion: data.app_version || this.data.appVersion,
          aboutContent: data.content || '暂无介绍',
          contactInfo: data.contact_info || null,
          copyrightYear: data.copyright_year || this.data.copyrightYear
        });
      } else {
        // 如果接口失败，使用默认内容
        this.setData({
          aboutContent: '拼单商城是一个便捷的二手商品交易平台，致力于为用户提供安全、便捷的购物体验。'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载关于我们信息失败:', error);
      // 使用默认内容
      this.setData({
        aboutContent: '拼单商城是一个便捷的二手商品交易平台，致力于为用户提供安全、便捷的购物体验。'
      });
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadAboutInfo();
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
    this.loadAboutInfo();
    wx.stopPullDownRefresh();
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







