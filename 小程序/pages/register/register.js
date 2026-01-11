// pages/register/register.js
import {ajax} from '../../utils/index' 
Page({

  /**
   * 页面的初始数据
   */
  data: {
      name:'',
      phone:'',
      account:'',
      password:'',
  },
getname(e){
  this.setData({
    name:e.detail.value
  })
},
getphone(e){
  this.setData({
    phone:e.detail.value
  })
},
getaccount(e){
  this.setData({
    account:e.detail.value
  })
},
getpassword(e){
  this.setData({
    password:e.detail.value
  })
},
async register(){
  const{name,phone,account,password}=this.data;
  
  // 验证所有字段是否都有值
  if (!name || !name.trim()) {
    wx.showToast({
      title: '请输入姓名',
      icon: 'none'
    });
    return;
  }
  
  if (!phone || !phone.trim()) {
    wx.showToast({
      title: '请输入电话',
      icon: 'none'
    });
    return;
  }
  //account.trim:去掉空格后是空的
  if (!account || !account.trim()) {
    wx.showToast({
      title: '请输入账号',
      icon: 'none'
    });
    return;
  }
  
  if (!password || !password.trim()) {
    wx.showToast({
      title: '请输入密码',
      icon: 'none'
    });
    return;
  }
  
  const params = {
    name: name.trim(),
    phone: phone.trim(), // 
    account: account.trim(), // 
    password: password.trim()
  };
  
  try {
    const result = await ajax('/register','POST', params);
    // 后端返回的数据结构：{ msg: "registered" | "success" | "error" }
    // 数据在 result.data 中
    const msg = result.data?.msg;
    if (msg === "registered") {
      wx.showToast({
        title: '该账号已注册',
        icon: 'none'
      });
    } else if (msg === "success") {
      wx.showToast({
        title: '注册成功!',
        icon: 'success'
      });
      setTimeout(() => {
        wx.redirectTo({
          url:'../login/login'
        });
      }, 1500);
    } else if (msg === "error") {
      wx.showToast({
        title: '服务器出错!',
        icon:'none'
      });
    } else {
      // 未知的返回状态
      console.warn('未知的返回状态:', msg);
      wx.showToast({
        title: '注册失败，请重试',
        icon:'none'
      });
    }
  } catch (error) {
    console.error('注册失败:', error);
    wx.showToast({
      title: '网络请求失败',
      icon:'none'
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