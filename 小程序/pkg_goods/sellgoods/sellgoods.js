// pages/sellgoods/sellgoods.js
import { ajax, uploadToOSS, recognizeImage } from '../../utils/index'

Page({
  /**
   * 页面的初始数据
   */
  data: {
    images: [],
    description: '',
    price: '0.00',
    groupBuyEnabled: false,
    groupBuyCount: 2, // 默认拼单人数2人
    groupBuyDiscount: 0.9, // 默认拼团折扣9折
    uploading: false,
    showCategoryModal: false, // 是否显示分类选择弹窗
    specEnabled: false, // 是否开启规格
    specOptions: [], // SKU选项列表
    // 商品分类列表
    categoryList: [
      { category_id: 1, name: '水果蔬菜' },
      { category_id: 2, name: '美妆个护' },
      { category_id: 3, name: '家居百货' },
      { category_id: 4, name: '数码家电' },
      { category_id: 5, name: '服饰鞋包' },
      { category_id: 6, name: '母婴用品' },
      { category_id: 7, name: '运动户外' },
      { category_id: 8, name: '图书文娱' },
      { category_id: 9, name: '宠物用品' },
      { category_id: 10, name: '食品保健' },
      { category_id: 11, name: '汽车用品' },
      { category_id: 12, name: '办公文具' },
      { category_id: 13, name: '其他用品' }
    ],
    categoryIndex: -1, // 选中的分类索引
    selectedCategoryId: null, // 选中的分类ID
    selectedCategoryName: '', // 选中的分类名称
    isRecognizing: false, // 是否正在识别图片
    autoDetectedCategory: false // 是否自动检测到的分类（用于显示提示）
  },

  /**
   * 关闭页面
   */
  onClose() {
    wx.navigateBack();
  },

  /**
   * 发布
   */
  async onPublish() {
    // 验证必填项
    if (this.data.images.length === 0) {
      wx.showToast({
        title: '请上传商品图片',
        icon: 'none'
      });
      return;
    }

    if (this.data.images.length > 9) {
      wx.showToast({
        title: '图片数量不能超过9张',
        icon: 'none'
      });
      return;
    }
    //.trim()：这是一个非常实用的字符串功能，叫 “去除首尾空格”。
    const description = this.data.description.trim();
    if (!description) {
      wx.showToast({
        title: '请输入商品描述',
        icon: 'none'
      });
      return;
    }

    if (description.length < 10) {
      wx.showToast({
        title: '商品描述至少需要10个字符',
        icon: 'none'
      });
      return;
    }

    if (description.length > 500) {
      wx.showToast({
        title: '商品描述不能超过500个字符',
        icon: 'none'
      });
      return;
    }

    /*
    作用：它会把括号里的文本，强行翻译成数字。
    parseFloat('99.9') -> 变成数字 99.9
    parseFloat('100') -> 变成数字 100
    icon：none   意思：只显示文字，不要图标。
    */
    const price = parseFloat(this.data.price);
    if (!price || price <= 0) {
      wx.showToast({
        title: '价格必须大于0',
        icon: 'none'
      });
      return;
    }

    if (price > 999999.99) {
      wx.showToast({
        title: '价格不能超过999999.99',
        icon: 'none'
      });
      return;
    }

    // 分类验证
    if (!this.data.selectedCategoryId) {
      wx.showToast({
        title: '请选择商品分类',
        icon: 'none'
      });
      return;
    }

    // 拼团验证
    if (this.data.groupBuyEnabled) {
      // 验证拼单人数
      if (!this.data.groupBuyCount || this.data.groupBuyCount < 2 || this.data.groupBuyCount > 5) {
        wx.showToast({
          title: '拼单人数必须在2-5人之间',
          icon: 'none'
        });
        return;
      }

      // 验证折扣
      const discount = parseFloat(this.data.groupBuyDiscount);
      if (isNaN(discount) || discount <= 0 || discount >= 1) {
        wx.showToast({
          title: '折扣必须在0-1之间（不能等于0或1）',
          icon: 'none'
        });
        return;
      }
    }

    // 规格验证
    if (this.data.specEnabled) {
      if (!this.data.specOptions || this.data.specOptions.length === 0) {
        wx.showToast({
          title: '请至少添加一个规格选项',
          icon: 'none'
        });
        return;
      }

      // 验证每个规格选项
      for (let i = 0; i < this.data.specOptions.length; i++) {
        const option = this.data.specOptions[i];
        
        // 验证规格名称
        if (!option.name || !option.name.trim()) {
          wx.showToast({
            title: `第${i + 1}个规格选项的名称不能为空`,
            icon: 'none'
          });
          return;
        }

        // 验证价格
        const optionPrice = parseFloat(option.price);
        if (isNaN(optionPrice) || optionPrice <= 0) {
          wx.showToast({
            title: `第${i + 1}个规格选项"${option.name}"的价格必须大于0`,
            icon: 'none'
          });
          return;
        }

        // 验证库存
        const optionStock = parseInt(option.stock);
        if (isNaN(optionStock) || optionStock < 0) {
          wx.showToast({
            title: `第${i + 1}个规格选项"${option.name}"的库存必须大于等于0`,
            icon: 'none'
          });
          return;
        }
      }
    }

    // 防止重复提交
    if (this.data.uploading) {
      return;
    }

    this.setData({ uploading: true });

    try {
      // 显示上传进度
      wx.showLoading({
        title: '上传图片中...',
        mask: true   //在上传时，不让用户点击到其他地方
      });

      // 获取用户ID（从登录接口获取，用于上传图片）
      const user_id = wx.getStorageSync('user_id');
      if (!user_id) {
        wx.hideLoading();
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateTo({
            url: '/pkg_user/login/login'
          });
        }, 1500);
        this.setData({ uploading: false });
        return;
      }

      // 上传所有图片到OSS（传递卖家ID）
      const imageUrls = [];
      for (let i = 0; i < this.data.images.length; i++) {
        const imagePath = this.data.images[i];
        try {
          // 传递 seller_id（即 user_id）给上传接口
          const imageUrl = await uploadToOSS(imagePath, user_id);
          imageUrls.push(imageUrl);
        } catch (error) {
          console.error('图片上传失败:', error);
          wx.hideLoading();
          wx.showToast({
            title: `第${i + 1}张图片上传失败: ${error.message || '未知错误'}`,
            icon: 'none',
            duration: 3000
          });
          this.setData({ uploading: false });
          return;
        }
      }

      wx.hideLoading();
      wx.showLoading({
        title: '发布中...',
        mask: true
      });

      // 准备商品数据（匹配后端接口）
      const goodsData = {
        user_id: user_id, // 用户ID（必填）
        images: imageUrls, // 图片URL数组
        description: description,
        price: parseFloat(price.toFixed(2)), // 保留2位小数
        category_id: this.data.selectedCategoryId, // 分类ID（必填）
        groupBuyEnabled: this.data.groupBuyEnabled || false,
        groupBuyCount: this.data.groupBuyEnabled ? parseInt(this.data.groupBuyCount) : null, // 拼单人数
        groupBuyDiscount: this.data.groupBuyEnabled ? parseFloat(parseFloat(this.data.groupBuyDiscount).toFixed(2)) : null, // 拼团折扣
        specEnabled: this.data.specEnabled || false, // 是否开启规格
        specs: this.data.specEnabled ? this.formatSpecsForApi() : null // 规格选项数据
      };

      // 调用发布接口
      const result = await ajax('/goods/publish', 'POST', goodsData);
      const msg = result?.msg;
      const error = result?.error;

      wx.hideLoading();

      if (msg === 'success') {
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        // 显示后端返回的具体错误信息
        wx.showToast({
          title: error || msg || '发布失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('发布失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ uploading: false });
    }
  },

  /**
   * 上传图片（包含自动AI识别逻辑）
   */
  onUploadImage() {
    const that = this;
    wx.chooseMedia({
      count: 9 - that.data.images.length, // 最多9张
      mediaType: ['image'], // 只选择图片
      sourceType: ['album', 'camera'], // 相册和相机
      sizeType: ['compressed'], // 压缩图片
      success(res) {
        // 1. 获取新选的图片
        const tempFilePaths = res.tempFiles.map(file => file.tempFilePath);
        
        // 2. 更新到界面上
        const newImages = [...that.data.images, ...tempFilePaths];
        that.setData({
          images: newImages
        });
        
        // 3. 关键逻辑修正：只要当前“还没选中分类”且“上传了图片”，就触发识别
        // 注意：这里我们使用 tempFilePaths[0] (本次新传的第一张) 进行识别
        if (!that.data.selectedCategoryId && tempFilePaths.length > 0) {
          that.recognizeCategory(tempFilePaths[0]);
        }
      },
      fail(err) {
        console.error('选择图片失败:', err);
      }
    });
  },

  /**
   * 预览图片
   */
  onPreviewImage(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    });
  },

  /**
   * 删除图片
   */
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success(res) {
        if (res.confirm) {
          const images = [...that.data.images];
          images.splice(index, 1);
          that.setData({
            images: images
          });
          
          // 如果删除的是第一张图片，且当前分类是自动识别的，清除分类选择
          // 这样用户可以重新上传图片进行识别
          if (index === 0 && that.data.autoDetectedCategory && images.length === 0) {
            that.setData({
              selectedCategoryId: null,
              selectedCategoryName: '',
              categoryIndex: -1,
              autoDetectedCategory: false
            });
          }
        }
      }
    });
  },

  /**
   * 识别商品分类
   */
  async recognizeCategory(imagePath) {
    // 如果已经有分类了，不自动识别（防止覆盖用户手动选择）
    if (this.data.selectedCategoryId) {
      return;
    }

    this.setData({
      isRecognizing: true
    });

    try {
      wx.showLoading({
        title: '正在识别商品分类...',
        mask: true
      });

      // 调用识别接口
      const result = await recognizeImage(imagePath);
      
      wx.hideLoading();

      // 自动填充分类
      const categoryIndex = this.data.categoryList.findIndex(
        cat => cat.category_id === result.category_id
      );

      if (categoryIndex >= 0) {
        this.setData({
          selectedCategoryId: result.category_id,
          selectedCategoryName: result.category_name,
          categoryIndex: categoryIndex,
          autoDetectedCategory: true // 标记为自动识别
        });

        // 显示识别成功提示
        wx.showToast({
          title: `已识别为：${result.category_name}`,
          icon: 'success',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: '未能识别分类，请手动选择',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('图片识别失败:', error);
      
      // 显示识别失败提示（不影响用户继续操作）
      wx.showToast({
        title: error.message || '识别失败，请手动选择分类',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({
        isRecognizing: false
      });
    }
  },

  /**
   * 描述输入变化
   */
  onDescriptionChange(e) {
    this.setData({
      description: e.detail.value
    });
  },

  /**
   * 价格点击
   */
  onPriceClick() {
    const that = this;
    wx.showModal({
      title: '设置价格',
      editable: true,
      placeholderText: '请输入价格',
      success(res) {
        if (res.confirm && res.content) {
          const price = parseFloat(res.content);
          if (!isNaN(price) && price >= 0) {
            that.setData({
              price: price.toFixed(2)
            });
          } else {
            wx.showToast({
              title: '请输入有效价格',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 拼团开关变化
   */
  onGroupBuyChange(e) {
    this.setData({
      groupBuyEnabled: e.detail.value,
      // 如果关闭拼团，重置为默认值
      groupBuyCount: e.detail.value ? this.data.groupBuyCount : 2,
      groupBuyDiscount: e.detail.value ? this.data.groupBuyDiscount : 0.9
    });
  },

  /**
   * 选择拼单人数
   */
  onSelectGroupCount(e) {
    const count = e.currentTarget.dataset.count;
    this.setData({
      groupBuyCount: count
    });
  },

  /**
   * 折扣输入
   */
  onDiscountInput(e) {
    // 1. 直接获取用户输入的内容（哪怕是空字符串，或者是 "0." 这种半成品）
    const value = e.detail.value;
    this.setData({
      groupBuyDiscount: value
    });
  },

  /**
   * 分类选择点击
   */
  onCategoryClick() {
    this.setData({
      showCategoryModal: true
    });
  },

  /**
   * 关闭分类选择弹窗
   */
  onCloseCategoryModal() {
    this.setData({
      showCategoryModal: false
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  /**
   * 选择分类
   */
  onSelectCategory(e) {
    const categoryId = e.currentTarget.dataset.categoryId;
    const categoryName = e.currentTarget.dataset.categoryName;
    const index = e.currentTarget.dataset.index;
    
    console.log('选择分类:', categoryId, categoryName);
    
    this.setData({
      categoryIndex: index,
      selectedCategoryId: categoryId,
      selectedCategoryName: categoryName,
      showCategoryModal: false,
      autoDetectedCategory: false // 用户手动选择后，清除自动识别标记
    });
    
    // 显示选中的分类
    wx.showToast({
      title: `已选择：${categoryName}`,
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 规格开关变化
   */
  onSpecChange(e) {
    const enabled = e.detail.value;
    
    if (enabled) {
      // 开启规格时，如果当前没有选项，自动添加一个空选项
      const currentOptions = this.data.specOptions || [];
      if (currentOptions.length === 0) {
        this.setData({
          specEnabled: enabled,
          specOptions: [{
            name: '',
            price: '',
            stock: ''
          }]
        });
      } else {
        this.setData({
          specEnabled: enabled
        });
      }
    } else {
      // 关闭规格时，清空规格数据
      this.setData({
        specEnabled: enabled,
        specOptions: []
      });
    }
  },

  /**
   * 添加规格选项
   */
  onAddSpecOption() {
    const newOption = {
      name: '',
      price: '',
      stock: ''
    };
    this.setData({
      specOptions: [...this.data.specOptions, newOption]
    });
  },

  /**
   * 删除规格选项
   */
  onDeleteSpecOption(e) {
    const index = e.currentTarget.dataset.index;
    const options = [...this.data.specOptions];
    options.splice(index, 1);
    this.setData({
      specOptions: options
    });
  },

  /**
   * 规格选项名称输入
   */
  onSpecOptionNameInput(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    const options = [...this.data.specOptions];
    options[index].name = value;
    this.setData({
      specOptions: options
    });
  },

  /**
   * 规格选项价格输入
   */
  onSpecOptionPriceInput(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    const options = [...this.data.specOptions];
    options[index].price = value;
    this.setData({
      specOptions: options
    });
  },

  /**
   * 规格选项库存输入
   */
  onSpecOptionStockInput(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    const options = [...this.data.specOptions];
    options[index].stock = value;
    this.setData({
      specOptions: options
    });
  },

  /**
   * 格式化规格数据为API格式
   */
  formatSpecsForApi() {
    return this.data.specOptions.map(option => ({
      name: option.name.trim(),
      price: parseFloat(parseFloat(option.price).toFixed(2)),
      stock: parseInt(option.stock) || 0
    }));
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 确保 categoryList 已初始化
  },
})
