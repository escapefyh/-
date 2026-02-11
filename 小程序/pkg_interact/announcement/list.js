import { ajax } from '../../utils/index'

Page({
  data: {
    list: [],
    loading: false,
    page: 1,
    pageSize: 20,
    hasMore: true
  },

  onLoad() {
    this.loadList(true)
  },

  onPullDownRefresh() {
    this.loadList(true).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this.loadList(false)
  },

  async loadList(isRefresh) {
    if (this.data.loading) return

    const nextPage = isRefresh ? 1 : this.data.page
    this.setData({ loading: true })

    try {
      const res = await ajax(
        `/announcement/list?page=${nextPage}&pageSize=${this.data.pageSize}`,
        'GET',
        {}
      )

      if (res?.msg === 'success') {
        const newList = res.data?.list || []
        const total = res.data?.total || 0

        const merged = isRefresh ? newList : [...this.data.list, ...newList]
        this.setData({
          list: merged,
          page: nextPage + 1,
          hasMore: merged.length < total,
          loading: false
        })
      } else {
        wx.showToast({ title: res?.error || '加载失败', icon: 'none' })
        this.setData({ loading: false })
      }
    } catch (e) {
      console.error('加载系统公告失败:', e)
      wx.showToast({ title: '网络请求失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  onItemClick(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({
      url: `/pkg_interact/announcement/detail?announcement_id=${id}`
    })
  },

  formatTime(ts) {
    if (!ts) return ''
    const date = new Date(ts)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}`
  }
})



