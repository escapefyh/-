// pages/index/index.js
import { ajax } from '../../utils/index'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    currentTab: 'recommend', // 当前选中的标签：follow-关注, recommend-推荐, new-新发
    searchKeyword: '',    // 用户输入的搜索关键词
    isSearching: false,   // 是否处于搜索状态
    goodsList: [],        // 商品列表
    page: 1,              // 当前页码
    pageSize: 20,         // 每页显示数量
    total: 0,             // 总数据量
    loading: false,       // 是否正在加载
    hasMore: true,        // 是否还有更多数据
    categoryCurrentPage: 0, // 分类当前页索引（用于指示器）
    categoryPages: [],     // 分类分页数据
    categoryTotalPages: 0, // 分类总页数
    // 商品分类列表
    categoryList: [
      { 
        category_id: 1, 
        name: '美食生鲜',
        image: '/assets/Delicious_Fresh_Food.png'
      },
      { 
        category_id: 2, 
        name: '美妆个护',
        image: '/assets/Beauty_Personal_Care.png'
      },
      { 
        category_id: 3, 
        name: '家居百货',
        image: '/assets/Home_Goods.png'
      },
      { 
        category_id: 4, 
        name: '数码家电',
        image: '/assets/Digital_home_appliances.png'
      },
      { 
        category_id: 5, 
        name: '服饰鞋包',
        image: '/assets/Clothing_shoes_bags.png'
      },
      { 
        category_id: 6, 
        name: '母婴用品',
        image: '/assets/Mother_bab_products.png'
      },
      { 
        category_id: 7, 
        name: '运动户外',
        image: '/assets/Sports_Outdoors.png'
      },
      { 
        category_id: 8, 
        name: '图书文娱',
        image: '/assets/book_entertainment.png'
      },
      { 
        category_id: 9, 
        name: '宠物用品',
        image: '/assets/pet_supplies.png'
      },
      { 
        category_id: 10, 
        name: '食品保健',
        image: '/assets/Food_health_products.png'
      },
      { 
        category_id: 11, 
        name: '汽车用品',
        image: '/assets/Automotive_supplies.png'
      },
      { 
        category_id: 12, 
        name: '办公文具',
        image: '/assets/Office_stationery.png'
      },
      { 
        category_id: 13, 
        name: '其他用品',
        image: '/assets/Other_supplies.png'
      }
    ]
  },

  toNavigate(e){
    const page=e.currentTarget.dataset.page;
    wx.navigateTo({ 
      url:page,
    })
  },

  /**
   * 导航标签切换
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (this.data.currentTab === tab) {
      return; // 如果点击的是当前标签，不执行任何操作
    }
    
    this.setData({
      currentTab: tab,
      page: 1,
      hasMore: true,
      goodsList: []
    });
    
    // 根据不同的标签加载不同的数据
    // 这里可以根据实际需求调用不同的接口
    this.loadGoodsList(true);
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 计算分类分页数据
    const categoryPages = this.getCategoryPages();
    this.setData({
      categoryPages: categoryPages,
      categoryTotalPages: categoryPages.length
    });
    this.loadGoodsList();
    // 加载未读消息数并更新tabBar角标
    this.updateUnreadMessageBadge();
  },

  /**
   * 搜索输入变化
   */
  onSearchInput(e) {
    console.log('=== 搜索输入变化 ===');
    console.log('输入值:', e.detail?.value);
    this.setData({
      searchKeyword: e.detail.value || ''
    });
  },

  /**
   * 搜索按钮点击
   */
  onSearchButtonClick() {
    console.log('=== 搜索按钮点击 ===');
    console.log('当前搜索关键词:', this.data.searchKeyword);
    // 触发搜索
    const event = {
      detail: {
        value: this.data.searchKeyword
      }
    };
    this.onSearch(event);
  },

  /**
   * 搜索提交
   * 用户点击搜索按钮或按回车时触发
   * 对商品描述进行部分匹配搜索（模糊搜索）
   */
  onSearch(e) {
    console.log('=== 搜索提交事件触发 ===');
    console.log('事件类型:', e.type || '未知');
    console.log('事件对象:', e);
    console.log('事件详情:', e.detail);
    console.log('输入值:', e.detail?.value);
    console.log('当前搜索关键词:', this.data.searchKeyword);
    
    // 兼容不同事件类型：submit 事件有 value，action-click 事件可能没有
    const keyword = e.detail?.value || this.data.searchKeyword || '';
    const trimmedKeyword = keyword.trim();
    
    console.log('处理后的关键词:', trimmedKeyword);
    
    if (!trimmedKeyword) {
      console.log('关键词为空，恢复显示所有商品');
      // 如果搜索关键词为空，显示所有商品
      this.setData({
        searchKeyword: '',
        isSearching: false,
        page: 1,
        hasMore: true
      });
      this.loadGoodsList(true);
      return;
    }
    
    console.log('执行搜索，关键词:', trimmedKeyword);
    
    // 执行搜索：查找商品描述中包含关键词的商品（部分匹配）
    this.setData({
      searchKeyword: trimmedKeyword,
      isSearching: true,
      page: 1,
      hasMore: true
    });
    
    console.log('搜索状态已设置:', {
      searchKeyword: trimmedKeyword,
      isSearching: true
    });
    
    this.searchGoods(trimmedKeyword, true);
  },

  /**
   * 清除搜索
   */
  onSearchClear() {
    this.setData({
      searchKeyword: '',
      isSearching: false,
      page: 1,
      hasMore: true
    });
    this.loadGoodsList(true);
  },

  /**
   * 搜索商品
   * 根据关键词对商品描述进行部分匹配（模糊搜索）
   * 只要商品描述中包含关键词的任何部分，就会显示该商品
   */
  async searchGoods(keyword, isRefresh = false) {
    if (this.data.loading) {
      console.log('搜索被阻止：正在加载中');
      return;
    }
    
    // 去除关键词首尾空格
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      console.log('搜索被阻止：关键词为空');
      // 如果关键词为空，恢复显示所有商品
      this.setData({
        searchKeyword: '',
        isSearching: false,
        page: 1,
        hasMore: true
      });
      this.loadGoodsList(true);
      return;
    }
    
    console.log('开始搜索，关键词:', trimmedKeyword, '是否刷新:', isRefresh);
    
    if (isRefresh) {
      // 刷新时重置分页和商品列表
      this.setData({ 
        page: 1, 
        hasMore: true,
        goodsList: [] // 清空之前的商品列表，只显示匹配的商品
      });
      console.log('搜索刷新：已清空商品列表');
    }

    if (!this.data.hasMore && !isRefresh) {
      console.log('搜索被阻止：没有更多数据');
      return;
    }

    this.setData({ loading: true });

    try {
      // 使用当前页码进行搜索
      const currentPage = isRefresh ? 1 : this.data.page;
      // 对关键词进行URL编码，支持中文和特殊字符
      const encodedKeyword = encodeURIComponent(trimmedKeyword);
      const searchUrl = `/goods/search?keyword=${encodedKeyword}&page=${currentPage}&pageSize=${this.data.pageSize}`;
      
      console.log('=== 搜索请求信息 ===');
      console.log('搜索URL:', searchUrl);
      console.log('搜索关键词（原始）:', trimmedKeyword);
      console.log('搜索关键词（编码）:', encodedKeyword);
      console.log('当前页码:', currentPage);
      console.log('每页数量:', this.data.pageSize);
      
      const result = await ajax(searchUrl, 'GET', {});

      console.log('=== 搜索API返回结果 ===');
      console.log('完整返回:', result);
      console.log('返回状态码:', result.statusCode);
      console.log('返回数据:', result.data);

      if (result.data?.msg === 'success') {
        const list = result.data.data?.list || [];
        const total = result.data.data?.total || 0;

        console.log('=== 搜索结果 ===');
        console.log('搜索到的商品数量:', list.length);
        console.log('搜索结果总数:', total);
        console.log('搜索到的商品列表:', list);
        console.log('匹配说明: 商品描述中包含关键词"' + trimmedKeyword + '"的商品');
        
        // 验证搜索结果：检查每个商品的描述是否包含关键词
        if (list.length > 0) {
          console.log('=== 搜索结果验证 ===');
          list.forEach((item, index) => {
            const containsKeyword = item.description && item.description.includes(trimmedKeyword);
            console.log(`商品${index + 1}:`, {
              goods_id: item.goods_id,
              description: item.description,
              containsKeyword: containsKeyword ? '✓ 包含关键词' : '✗ 不包含关键词'
            });
          });
        }

        // 处理每个商品，添加拼团折扣文本
        const processedList = list.map(item => {
          if (item.group_buy_enabled && item.group_buy_discount) {
            item.groupBuyDiscountText = (item.group_buy_discount * 10).toFixed(0);
          }
          // 确保 images 是数组
          if (!item.images || !Array.isArray(item.images)) {
            item.images = [];
          }
          // 确保 seller 是对象
          if (!item.seller || typeof item.seller !== 'object') {
            item.seller = {};
          }
          return item;
        });

        // 如果是刷新，直接替换列表；否则追加
        const currentList = isRefresh ? [] : this.data.goodsList;
        const newList = [...currentList, ...processedList];
        
        this.setData({
          goodsList: newList,
          total,
          page: currentPage + 1,
          hasMore: newList.length < total,
          loading: false
        });
      } else {
        console.error('=== 搜索API返回错误 ===');
        console.error('错误信息:', result.data);
        console.error('错误详情:', JSON.stringify(result.data));
        
        // 检查是否是后端没有实现搜索接口，返回了所有商品
        if (result.data?.data?.list && result.data?.data?.list.length > 0) {
          console.warn('⚠️ 警告：搜索接口可能返回了所有商品，而不是搜索结果！');
          console.warn('请检查后端是否正确实现了 /goods/search 接口');
        }
        
        wx.showToast({
          title: result.data?.error || result.data?.msg || '搜索失败',
          icon: 'none',
          duration: 3000
        });
        this.setData({ 
          loading: false,
          goodsList: [] // 搜索失败时清空列表
        });
      }
    } catch (error) {
      console.error('搜索失败:', error);
      console.error('错误详情:', JSON.stringify(error));
      wx.showToast({
        title: '网络请求失败: ' + (error.message || '未知错误'),
        icon: 'none',
        duration: 3000
      });
      this.setData({ 
        loading: false,
        goodsList: [] // 搜索失败时清空列表
      });
    }
  },

  /**
   * 加载商品列表
   */
  async loadGoodsList(isRefresh = false) {
    // 如果正在搜索，不执行普通列表加载
    if (this.data.isSearching) {
      return;
    }

    if (this.data.loading) return;
    
    if (isRefresh) {
      this.setData({ page: 1, hasMore: true });
    }

    if (!this.data.hasMore && !isRefresh) return;

    this.setData({ loading: true });

    try {
      const result = await ajax(
        `/goods/list?page=${this.data.page}&pageSize=${this.data.pageSize}`,
        'GET',
        {}
      );

      console.log('API返回结果:', result);
      console.log('API返回的data:', result.data);

      if (result.data?.msg === 'success') {
        const list = result.data.data?.list || [];
        const total = result.data.data?.total || 0;

        console.log('获取到的商品列表:', list);
        console.log('商品总数:', total);

        // 处理每个商品，添加拼团折扣文本
        const processedList = list.map(item => {
          if (item.group_buy_enabled && item.group_buy_discount) {
            item.groupBuyDiscountText = (item.group_buy_discount * 10).toFixed(0);
          }
          // 确保 images 是数组
          if (!item.images || !Array.isArray(item.images)) {
            item.images = [];
          }
          // 确保 seller 是对象
          if (!item.seller || typeof item.seller !== 'object') {
            item.seller = {};
          }
          return item;
        });

        const currentList = isRefresh ? [] : this.data.goodsList;
        const newList = [...currentList, ...processedList];
        
        this.setData({
          goodsList: newList,
          total,
          page: this.data.page + 1,
          hasMore: newList.length < total,
          loading: false
        });
      } else {
        console.error('API返回错误:', result.data);
        wx.showToast({
          title: result.data?.error || result.data?.msg || '获取商品列表失败',
          icon: 'none',
          duration: 3000
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('获取商品列表失败:', error);
      console.error('错误详情:', JSON.stringify(error));
      wx.showToast({
        title: '网络请求失败: ' + (error.message || '未知错误'),
        icon: 'none',
        duration: 3000
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 点击商品
   */
  onGoodsClick(e) {
    const goods_id = e.currentTarget.dataset.goodsId;
    wx.navigateTo({
      url: `/pages/goodsdetail/goodsdetail?goods_id=${goods_id}`
    });
  },

  /**
   * 点击分类
   */
  onCategoryClick(e) {
    const categoryId = e.currentTarget.dataset.categoryId;
    const categoryName = e.currentTarget.dataset.categoryName;
    
    // 跳转到商品列表页面，传递分类ID和名称
    wx.navigateTo({
      url: `/pages/goodslist/goodslist?category_id=${categoryId}&category_name=${encodeURIComponent(categoryName)}`
    });
  },

  /**
   * 分类swiper切换事件
   */
  onCategorySwiperChange(e) {
    this.setData({
      categoryCurrentPage: e.detail.current
    });
  },

  /**
   * 计算分类分页数据
   * 每页显示5个分类
   */
  getCategoryPages() {
    const categoryList = this.data.categoryList;
    const itemsPerPage = 5;
    const pages = [];
    
    for (let i = 0; i < categoryList.length; i += itemsPerPage) {
      pages.push(categoryList.slice(i, i + itemsPerPage));
    }
    
    return pages;
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
    // 更新未读消息数角标
    this.updateUnreadMessageBadge();
    // 如果正在搜索状态，保持搜索状态，不重新加载
    if (this.data.isSearching && this.data.searchKeyword) {
      console.log('页面显示：保持搜索状态，关键词:', this.data.searchKeyword);
      return;
    }
    console.log('页面显示：普通状态');
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
    if (this.data.isSearching && this.data.searchKeyword) {
      // 搜索状态下，刷新搜索结果
      this.searchGoods(this.data.searchKeyword, true).then(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      // 普通状态下，刷新商品列表
      this.loadGoodsList(true).then(() => {
        wx.stopPullDownRefresh();
      });
    }
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      if (this.data.isSearching && this.data.searchKeyword) {
        // 搜索状态下，加载更多搜索结果
        this.searchGoods(this.data.searchKeyword);
      } else {
        // 普通状态下，加载更多商品列表
        this.loadGoodsList();
      }
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 更新未读消息数角标
   */
  async updateUnreadMessageBadge() {
    const user_id = wx.getStorageSync('user_id');
    if (!user_id) {
      // 未登录，清除角标
      wx.removeTabBarBadge({
        index: 1 // 消息tabBar的索引
      });
      return;
    }

    try {
      const result = await ajax(`/chat/unreadCount?user_id=${user_id}`, 'GET', {});
      if (result.data?.msg === 'success') {
        const unreadCount = result.data.data?.unread_count || 0;
        if (unreadCount > 0) {
          // 显示角标，最多显示99+
          wx.setTabBarBadge({
            index: 1, // 消息tabBar的索引（从0开始，消息是第二个）
            text: unreadCount > 99 ? '99+' : String(unreadCount)
          });
        } else {
          // 清除角标
          wx.removeTabBarBadge({
            index: 1
          });
        }
      } else {
        // 请求失败，清除角标
        wx.removeTabBarBadge({
          index: 1
        });
      }
    } catch (error) {
      console.error('获取未读消息数失败:', error);
      // 出错时清除角标
      wx.removeTabBarBadge({
        index: 1
      });
    }
  }
})