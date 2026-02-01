// pages/person/person.js
import { ajax, getUserinfo } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    wxlogin: false,
    userinfo: undefined,
    // 统计数据
    collectCount: 0,      // 收藏数量
    followCount: 0,       // 关注数量
    browseCount: 0,       // 历史浏览数量
    publishedCount: 0,   // 我发布的数量
    soldCount: 0,        // 我卖出的数量
    boughtCount: 0,      // 我买到的数量
    // 待处理事项
    pendingCount: 0,      // 待处理总数
    pendingShipCount: 0,  // 待发货数量（卖家）
    pendingReceiveCount: 0, // 待收货数量（买家）
    pendingReviewCount: 0   // 待评价数量（买家）
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
   * 跳转到我的关注页面
   */
  goToFollow() {
    wx.navigateTo({
      url: '/pkg_user/follow/follow'
    });
  },

  /**
   * 跳转到历史浏览页面
   */
  goToBrowse() {
    wx.navigateTo({
      url: '/pkg_user/browse/browse'
    });
  },

  /**
   * 跳转到我发布的商品页面
   */
  goToPublished() {
    // 跳转到商品管理页面（我发布的）
    wx.navigateTo({
      url: '/pkg_goods/goodsmanage/goodsmanage'
    });
  },

  /**
   * 跳转到我卖出的订单页面
   */
  goToSold() {
    // 跳转到订单页面，显示已卖出的订单
    wx.navigateTo({
      url: '/pkg_goods/order/order?type=sold'
    });
  },

  /**
   * 跳转到我买到的订单页面
   */
  goToBought() {
    // 跳转到订单页面，显示已买到的订单
    wx.navigateTo({
      url: '/pkg_goods/order/order?type=bought'
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
   * 跳转到我的钱包页面
   */
  goToWallet() {
    // ✅ 路径：pkg_user 分包
    wx.navigateTo({
      url: '/pkg_user/wallet/wallet'
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
        // 加载统计数据
        this.loadStatistics(user_id);
        // 加载历史浏览数量（从本地缓存）
        this.loadBrowseCount();
        // 加载待处理事项
        this.loadPendingItems(user_id);
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
   * 加载统计数据
   */
  async loadStatistics(user_id) {
    try {
      // 加载收藏数量
      const collectResult = await ajax(`/favorite/count?user_id=${user_id}`, 'GET', {});
      if (collectResult?.msg === 'success') {
        this.setData({
          collectCount: collectResult.data?.count || 0
        });
      }

      // 加载关注数量
      const followResult = await ajax(`/follow/count?user_id=${user_id}`, 'GET', {});
      if (followResult?.msg === 'success') {
        this.setData({
          followCount: followResult.data?.count || 0
        });
      }

      // 加载历史浏览数量（从本地缓存读取）
      this.loadBrowseCount();

      // 加载我发布的数量
      const publishedResult = await ajax(`/goods/my/count?user_id=${user_id}`, 'GET', {});
      if (publishedResult?.msg === 'success') {
        this.setData({
          publishedCount: publishedResult.data?.count || 0
        });
      }

      // 加载我卖出的数量
      const soldResult = await ajax(`/order/sold/count?user_id=${user_id}`, 'GET', {});
      if (soldResult?.msg === 'success') {
        this.setData({
          soldCount: soldResult.data?.count || 0
        });
      }

      // 加载我买到的数量
      const boughtResult = await ajax(`/order/bought/count?user_id=${user_id}`, 'GET', {});
      if (boughtResult?.msg === 'success') {
        this.setData({
          boughtCount: boughtResult.data?.count || 0
        });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
      // 静默失败，不影响页面显示
    }
  },

  /**
   * 加载历史浏览数量（从本地缓存读取）
   */
  loadBrowseCount() {
    try {
      const browseHistory = wx.getStorageSync('browse_history') || [];
      this.setData({
        browseCount: browseHistory.length
      });
    } catch (error) {
      console.error('加载浏览数量失败:', error);
      this.setData({
        browseCount: 0
      });
    }
  },

  /**
   * 加载待处理事项
   */
  async loadPendingItems(user_id) {
    try {
      const result = await ajax(`/order/pending-count?user_id=${user_id}`, 'GET', {});
      
      if (result?.msg === 'success') {
        const data = result.data || {};
        const pendingShipCount = data.pending_ship_count || 0;      // 待发货数量（卖家）
        const pendingReceiveCount = data.pending_receive_count || 0; // 待收货数量（买家）
        const pendingReviewCount = data.pending_review_count || 0;    // 待评价数量（买家）
        const pendingCount = pendingShipCount + pendingReceiveCount + pendingReviewCount;
        
        this.setData({
          pendingCount,
          pendingShipCount,
          pendingReceiveCount,
          pendingReviewCount
        });
      }
    } catch (error) {
      console.error('加载待处理事项失败:', error);
      // 静默失败，不影响页面显示
    }
  },

  /**
   * 跳转到待发货订单（卖家）
   */
  goToPendingShip() {
    wx.navigateTo({
      url: '/pkg_goods/order/order?type=sold&status=paid'
    });
  },

  /**
   * 跳转到待收货订单（买家）
   */
  goToPendingReceive() {
    wx.navigateTo({
      url: '/pkg_goods/order/order?type=bought&status=shipped'
    });
  },

  /**
   * 跳转到待评价订单（买家）
   * 跳转到订单页面，显示待评价的订单
   */
  goToPendingReview() {
    wx.navigateTo({
      url: '/pkg_goods/order/order?type=bought&status=review'
    });
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