// pages/addresslist/addresslist.js
import { ajax } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    addressList: [], // 地址列表
    isManageMode: false // 是否处于管理模式
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadAddressList();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时刷新地址列表
    this.loadAddressList();
  },

  /**
   * 加载地址列表
   */
  async loadAddressList() {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    try {
      wx.showLoading({
        title: '加载中...',
        mask: true
      });

      const result = await ajax(`/address/list?user_id=${user_id}`, 'GET', {});
      
      wx.hideLoading();

      if (result.data?.msg === 'success') {
        const list = result.data.data?.list || [];
        this.setData({
          addressList: list
        });
      } else {
        wx.showToast({
          title: result.data?.error || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载地址列表失败:', error);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
    }
  },

  /**
   * 编辑地址
   */
  onEditAddress(e) {
    const addressId = e.currentTarget.dataset.addressId;
    wx.navigateTo({
      url: `/pages/addressedit/addressedit?address_id=${addressId}`
    });
  },

  /**
   * 添加地址
   */
  onAddAddress() {
    wx.navigateTo({
      url: '/pages/addressedit/addressedit'
    });
  },

  /**
   * 管理地址
   */
  onManage() {
    // 切换管理模式
    this.setData({
      isManageMode: !this.data.isManageMode
    });
  },

  /**
   * 删除地址
   */
  onDeleteAddress(e) {
    const addressId = e.currentTarget.dataset.addressId;
    const contactName = e.currentTarget.dataset.contactName || '该地址';
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${contactName}"的收货地址吗？`,
      confirmText: '删除',
      confirmColor: '#ff4444',
      success: async (res) => {
        if (res.confirm) {
          await this.deleteAddress(addressId);
        }
      }
    });
  },

  /**
   * 执行删除地址
   */
  async deleteAddress(addressId) {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '删除中...',
        mask: true
      });

      const result = await ajax('/address/delete', 'POST', {
        address_id: addressId,
        user_id: user_id
      });

      wx.hideLoading();

      if (result.data?.msg === 'success') {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        // 刷新地址列表
        setTimeout(() => {
          this.loadAddressList();
        }, 1500);
      } else {
        wx.showToast({
          title: result.data?.error || '删除失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('删除地址失败:', error);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
    }
  }
})


