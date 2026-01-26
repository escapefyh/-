// pages/login/login.js
import {ajax, getUserinfo, setUserinfo} from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    account:'',
    password:''
  },

  getaccount(e){
    this.setData({
      account:e.detail.value
    })
    console.log(e)
  },

  getpassword(e){
    this.setData({
      password:e.detail.value
    })
  },

  /**
   * 密码输入框回车确认事件
   */
  onPasswordConfirm(e){
    // 更新密码值
    this.setData({
      password: e.detail.value
    });
    // 自动提交表单
    this.submit();
  },
  

  async submit(){
    const{account,password}=this.data;
    
    // 验证所有字段是否都有值
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
      account: account.trim(),
      password: password.trim()
    };
    
    try {
      const result = await ajax('/login','POST', params);
      
      // 后端返回的数据结构：{ msg: "success" | "accountError" | "error", result?: {...} }
      const msg = result?.msg;
      
      if (msg === "success") {
        // 登录成功，保存用户信息
        const userInfo = result?.result;
        if (userInfo && userInfo.user_id) {
          const user_id = userInfo.user_id;
          
          // 将用户信息保存到本地存储
          wx.setStorageSync('userInfo', userInfo);
          // 单独保存user_id，方便后续接口调用
          wx.setStorageSync('user_id', user_id);
          
          // 检查是否有该账号之前保存的微信授权信息（按user_id存储）
          const savedUserinfo = getUserinfo(user_id);
          
          // 如果有保存的微信授权信息，自动恢复
          if (savedUserinfo && savedUserinfo.avatar && savedUserinfo.nickname) {
            // 将保存的微信授权信息合并到用户信息中
            userInfo.nickname = savedUserinfo.nickname;
            
            // 恢复微信授权状态
            wx.setStorageSync('wxlogin', true);
            console.log('已自动恢复该账号的微信授权信息:', savedUserinfo);
          }
        }
        
        wx.showToast({
          title: '登录成功!',
          icon: 'success'
        });
        
        setTimeout(() => {
          // 跳转到首页
          wx.switchTab({
            url:'/pages/index/index'
          });
        }, 1500);
      } else if (msg === "accountError") {
        wx.showToast({
          title: '账号或密码错误',
          icon: 'none'
        });
      } else if (msg === "error") {
        wx.showToast({
          title: '服务器出错!',
          icon:'none'
        });
      } else {
        console.warn('未知的返回状态:', msg);
        wx.showToast({
          title: '登录失败，请重试',
          icon:'none'
        });
      }
    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({
        title: '网络请求失败',
        icon:'none'
      });
    }
  },
    
  toregister(){
    wx.navigateTo({
      url:'../register/register',
    })
  },

  /**
   * 跳转到忘记密码页面
   */
  toForgotPassword() {
    wx.navigateTo({
      url: '../forgotpassword/forgotpassword'
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