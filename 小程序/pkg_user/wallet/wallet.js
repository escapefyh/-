// pkg_user/wallet/wallet.js
import { ajax } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    balance: 0.00,           // 账户余额
    loading: false,          // 加载状态
    
    // 充值相关
    showRechargeModal: false,  // 是否显示充值弹窗
    rechargeAmounts: [10, 50, 100, 200, 500, 1000],  // 预设充值金额
    selectedAmount: null,      // 选中的充值金额
    customAmount: '',          // 自定义充值金额
    isCustomMode: false        // 是否自定义金额模式
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadWalletBalance();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时刷新余额（可能从其他页面返回，余额可能已更新）
    this.loadWalletBalance();
  },

  /**
   * 加载钱包余额
   */
  async loadWalletBalance() {
    // 检查登录状态
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

    this.setData({ loading: true });

    try {
      const result = await ajax(
        `/wallet/balance?user_id=${user_id}`,
        'GET',
        {}
      );

      if (result?.msg === 'success') {
        const balance = parseFloat(result.data?.balance || 0);
        this.setData({
          balance: balance.toFixed(2),
          loading: false
        });
      } else {
        console.error('API返回错误:', result);
        wx.showToast({
          title: result?.error || result?.msg || '获取余额失败',
          icon: 'none',
          duration: 3000
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('获取余额失败:', error);
      wx.showToast({
        title: error?.msg || '网络请求失败',
        icon: 'none',
        duration: 3000
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 打开充值弹窗
   */
  onOpenRechargeModal() {
    this.setData({
      showRechargeModal: true,
      selectedAmount: null,
      customAmount: '',
      isCustomMode: false
    });
  },

  /**
   * 关闭充值弹窗
   */
  onCloseRechargeModal() {
    this.setData({
      showRechargeModal: false,
      selectedAmount: null,
      customAmount: '',
      isCustomMode: false
    });
  },

  /**
   * 选择预设充值金额
   */
  onSelectAmount(e) {
    const amount = e.currentTarget.dataset.amount;
    this.setData({
      selectedAmount: amount,
      isCustomMode: false,
      customAmount: ''
    });
  },

  /**
   * 切换到自定义金额模式
   */
  onSwitchToCustom() {
    this.setData({
      isCustomMode: true,
      selectedAmount: null,
      customAmount: ''
    });
  },

  /**
   * 自定义金额输入
   */
  onCustomAmountInput(e) {
    let value = e.detail.value;
    // 只允许输入数字和小数点
    value = value.replace(/[^\d.]/g, '');
    // 限制小数点后两位
    if (value.indexOf('.') !== -1) {
      const parts = value.split('.');
      if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
      }
    }
    this.setData({
      customAmount: value
    });
  },

  /**
   * 确认充值
   */
  async onConfirmRecharge() {
    let amount = 0;
    
    if (this.data.isCustomMode) {
      // 自定义金额
      amount = parseFloat(this.data.customAmount);
      if (!amount || amount <= 0) {
        wx.showToast({
          title: '请输入有效的充值金额',
          icon: 'none'
        });
        return;
      }
      // 限制最大充值金额
      if (amount > 10000) {
        wx.showToast({
          title: '单次充值金额不能超过10000元',
          icon: 'none'
        });
        return;
      }
    } else {
      // 预设金额
      if (!this.data.selectedAmount) {
        wx.showToast({
          title: '请选择充值金额',
          icon: 'none'
        });
        return;
      }
      amount = this.data.selectedAmount;
    }

    // 保留两位小数
    amount = parseFloat(amount.toFixed(2));

    // 确认充值
    wx.showModal({
      title: '确认充值',
      content: `确定要充值 ¥${amount.toFixed(2)} 吗？`,
      success: async (res) => {
        if (res.confirm) {
          await this.recharge(amount);
        }
      }
    });
  },

  /**
   * 执行充值
   */
  async recharge(amount) {
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
        title: '充值中...',
        mask: true
      });

      const result = await ajax('/wallet/recharge', 'POST', {
        user_id: user_id,
        amount: amount
      });

      wx.hideLoading();

      if (result?.msg === 'success') {
        wx.showToast({
          title: '充值成功',
          icon: 'success'
        });
        
        // 关闭充值弹窗
        this.onCloseRechargeModal();
        
        // 刷新余额
        this.loadWalletBalance();
      } else {
        wx.showToast({
          title: result?.error || '充值失败',
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('充值失败:', error);
      wx.showToast({
        title: error?.msg || '网络请求失败',
        icon: 'none',
        duration: 3000
      });
    }
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止事件冒泡
  }
})












