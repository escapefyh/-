// pages/userinfo/userinfo.js
import { ajax, uploadToOSS, getUserinfo, setUserinfo } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
      avatar:'',
      nickname:'',
  },
 //他的作用就是让我拿到用户头像的地址，并把图片的地址设置为用户头像图片地址
  getAvatar(e){
      this.setData({
        avatar:e.detail.avatarUrl
      })
  },

    getNickname(e){
      this.setData({
        nickname:e.detail.value
      })
    },

    /**
     * 提交授权信息
     */
    async submit(){
      const{avatar,nickname}=this.data;
      
      // 验证昵称
      if(!nickname || !nickname.trim()){
        wx.showToast({
          title:'请输入昵称',
          icon:'none'
        })
        return
      }

      // 验证昵称长度（1-20个字符）
      if(nickname.trim().length < 1 || nickname.trim().length > 20){
        wx.showToast({
          title:'昵称长度为1-20个字符',
          icon:'none'
        })
        return
      }

      // 获取用户ID
      const user_id = wx.getStorageSync('user_id');
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

      try {
        wx.showLoading({
          title: '保存中...',
          mask: true
        });

        let avatarUrl = avatar; // 最终使用的头像URL

        // 如果用户选择了新头像（avatar是微信临时路径），需要上传到OSS
        if (avatar && avatar.startsWith('http://tmp/') || avatar.startsWith('wxfile://')) {
          try {
            wx.showLoading({
              title: '上传头像中...',
              mask: true
            });
            
            // 上传头像到OSS
            avatarUrl = await uploadToOSS(avatar, user_id);
            console.log('头像上传成功，OSS URL:', avatarUrl);

            // 调用后端接口更新用户头像
            const avatarResult = await ajax('/user/updateAvatar', 'POST', {
              user_id: user_id,
              avatar: avatarUrl
            });

            if (avatarResult?.msg !== 'success') {
              console.warn('更新头像到数据库失败:', avatarResult?.error);
              // 即使更新失败，也继续使用上传后的OSS URL
            }
          } catch (uploadError) {
            console.error('头像上传失败:', uploadError);
            wx.hideLoading();
            wx.showToast({
              title: '头像上传失败: ' + (uploadError.message || '未知错误'),
              icon: 'none',
              duration: 3000
            });
            return;
          }
        } else if (avatar && avatar.trim() !== '') {
          // 如果头像已经是完整URL（可能是之前上传的），也更新到数据库
          try {
            const avatarResult = await ajax('/user/updateAvatar', 'POST', {
              user_id: user_id,
              avatar: avatarUrl
            });
            if (avatarResult?.msg !== 'success') {
              console.warn('更新头像到数据库失败:', avatarResult?.error);
            }
          } catch (error) {
            console.warn('更新头像到数据库失败:', error);
            // 不影响主流程，继续执行
          }
        }

        // 调用更新昵称接口，保存到数据库
        const result = await ajax('/user/updateNickname', 'POST', {
          user_id: user_id,
          nickname: nickname.trim()
        });

        wx.hideLoading();

        if (result?.msg === 'success') {
          // 更新本地存储的用户信息
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.nickname = nickname.trim();
          wx.setStorageSync('userInfo', userInfo);

          // 保存头像和昵称到本地（按user_id存储，用于显示）- 使用上传后的OSS URL
          const userinfo = {
            avatar: avatarUrl || '/assets/default_avatar.png',
            nickname: nickname.trim()
          };
          setUserinfo(user_id, userinfo); // 使用工具函数按user_id存储
          wx.setStorageSync('wxlogin', true);

          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });

          // 返回个人中心
          setTimeout(() => {
            wx.switchTab({
              url: '../person/person'
            });
          }, 1500);
        } else {
          wx.showToast({
            title: result?.error || '保存失败',
            icon: 'none'
          });
        }
      } catch (error) {
        wx.hideLoading();
        console.error('保存失败:', error);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 加载已有的用户信息（如果有）
    const user_id = wx.getStorageSync('user_id');
    const userinfo = user_id ? getUserinfo(user_id) : null; // 根据user_id获取对应的userinfo
    const userInfo = wx.getStorageSync("userInfo");
    
    if (userinfo) {
      this.setData({
        avatar: userinfo.avatar || '',
        nickname: userinfo.nickname || ''
      });
    } else if (userInfo && userInfo.nickname) {
      // 如果userInfo中有nickname，也加载
      this.setData({
        nickname: userInfo.nickname
      });
    }
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










