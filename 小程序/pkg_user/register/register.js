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
      title: '请输入手机号',
      icon: 'none'
    });
    return;
  }

  // 验证手机号格式（必须是11位数字）
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone.trim())) {
    wx.showToast({
      title: '手机号必须是11位数字',
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

  // 验证账号长度（至少6位）
  if (account.trim().length < 6) {
    wx.showToast({
      title: '账号长度不能少于6位',
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

  // 验证密码长度（至少6位）
  if (password.trim().length < 6) {
    wx.showToast({
      title: '密码长度不能少于6位',
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
    const msg = result?.msg;
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
      // 显示后端返回的具体错误信息
      const errorMsg = result?.error || '服务器出错';
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });
    } else {
      // 未知的返回状态
      console.warn('未知的返回状态:', msg);
      wx.showToast({
        title: result?.error || '注册失败，请重试',
        icon: 'none',
        duration: 2000
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