// pages/privacy/privacy.js
import { ajax } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    privacyTitle: '隐私政策',
    publishDate: '',
    effectiveDate: '',
    privacyContent: '',
    contactInfo: null
  },

  /**
   * 加载隐私政策内容
   */
  async loadPrivacyContent() {
    try {
      wx.showLoading({
        title: '加载中...',
        mask: true
      });

      const result = await ajax('/app/privacy', 'GET', {});

      wx.hideLoading();

      if (result?.msg === 'success') {
        const data = result.data || {};
        this.setData({
          privacyTitle: data.title || this.data.privacyTitle,
          publishDate: data.publish_date || '',
          effectiveDate: data.effective_date || '',
          privacyContent: data.content || '暂无内容',
          contactInfo: data.contact_info || null
        });
      } else {
        // 如果接口失败，使用默认内容
        this.setData({
          privacyContent: '我们非常重视您的隐私保护。在使用我们的服务时，我们会按照相关法律法规的要求，保护您的个人信息安全。'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载隐私政策失败:', error);
      // 使用默认内容
      this.setData({
        privacyContent: '我们非常重视您的隐私保护。在使用我们的服务时，我们会按照相关法律法规的要求，保护您的个人信息安全。'
      });
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadPrivacyContent();
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
    this.loadPrivacyContent();
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







