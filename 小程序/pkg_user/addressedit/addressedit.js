// pages/addressedit/addressedit.js
import { ajax } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    addressId: null, // 地址ID（编辑时使用）
    contactName: '', // 联系人
    phone: '', // 手机号
    region: '', // 所在地区（显示用）
    regionArray: [], // 地区数组（用于picker）
    province: '', // 省
    city: '', // 市
    district: '', // 区
    street: '', // 街道
    detailAddress: '', // 详细地址
    isDefault: false // 是否默认地址
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const addressId = options.address_id;
    if (addressId) {
      // 编辑模式：加载地址信息
      this.setData({
        addressId: addressId
      });
      this.loadAddressDetail(addressId);
    }
  },

  /**
   * 加载地址详情
   */
  async loadAddressDetail(addressId) {
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

      const result = await ajax(`/address/detail?address_id=${addressId}&user_id=${user_id}`, 'GET', {});
      
      wx.hideLoading();

      if (result?.msg === 'success') {
        const address = result.data || {};
        this.setData({
          contactName: address.contact_name || '',
          phone: address.phone || '',
          region: address.region || '',
          regionArray: this.parseRegionToArray(address.region || ''),
          province: address.province || '',
          city: address.city || '',
          district: address.district || '',
          street: address.street || '',
          detailAddress: address.detail_address || '',
          isDefault: address.is_default || false
        });
      } else {
        wx.showToast({
          title: result?.error || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载地址详情失败:', error);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
    }
  },

  /**
   * 将地区字符串解析为数组
   */
  parseRegionToArray(region) {
    if (!region) return [];
    const parts = region.split(' ');
    return parts.length >= 3 ? [parts[0], parts[1], parts[2]] : [];
  },

  /**
   * 联系人输入
   */
  onContactNameInput(e) {
    this.setData({
      contactName: e.detail.value
    });
  },

  /**
   * 手机号输入
   */
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  /**
   * 地区选择变化
   */
  onRegionChange(e) {
    const regionArray = e.detail.value;
    const region = regionArray.join(' ');
    this.setData({
      region: region,
      regionArray: regionArray,
      province: regionArray[0] || '',
      city: regionArray[1] || '',
      district: regionArray[2] || '',
      street: regionArray[3] || ''
    });
  },

  /**
   * 详细地址输入
   */
  onDetailAddressInput(e) {
    this.setData({
      detailAddress: e.detail.value
    });
  },

  /**
   * 默认地址开关变化
   */
  onDefaultChange(e) {
    this.setData({
      isDefault: e.detail.value
    });
  },

  /**
   * 保存地址
   */
  async onSave() {
    // 验证必填项
    if (!this.data.contactName || !this.data.contactName.trim()) {
      wx.showToast({
        title: '请输入联系人',
        icon: 'none'
      });
      return;
    }

    if (!this.data.phone || !this.data.phone.trim()) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return;
    }

    // 验证手机号格式
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(this.data.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    if (!this.data.region || !this.data.region.trim()) {
      wx.showToast({
        title: '请选择所在地区',
        icon: 'none'
      });
      return;
    }

    if (!this.data.detailAddress || !this.data.detailAddress.trim()) {
      wx.showToast({
        title: '请输入详细地址',
        icon: 'none'
      });
      return;
    }

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
        title: '保存中...',
        mask: true
      });

      const addressData = {
        user_id: user_id,
        contact_name: this.data.contactName.trim(),
        phone: this.data.phone.trim(),
        region: this.data.region.trim(),
        province: this.data.province,
        city: this.data.city,
        district: this.data.district,
        street: this.data.street,
        detail_address: this.data.detailAddress.trim(),
        is_default: this.data.isDefault ? 1 : 0
      };

      let result;
      if (this.data.addressId) {
        // 编辑模式
        addressData.address_id = this.data.addressId;
        result = await ajax('/address/update', 'POST', addressData);
      } else {
        // 新增模式
        result = await ajax('/address/add', 'POST', addressData);
      }

      wx.hideLoading();

      if (result?.msg === 'success') {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result?.error || '保存失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('保存地址失败:', error);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
    }
  }
})

