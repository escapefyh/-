import { ajax } from '../../utils/index'

Page({
  data: {
    loading: false,
    detail: null,
    announcement_id: ''
  },

  onLoad(options) {
    const id = options.announcement_id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1200)
      return
    }
    this.setData({ announcement_id: id })
    this.loadDetail()
  },

  async loadDetail() {
    this.setData({ loading: true })
    try {
      const res = await ajax(
        `/announcement/detail?announcement_id=${this.data.announcement_id}`,
        'GET',
        {}
      )
      if (res?.msg === 'success') {
        this.setData({ detail: res.data, loading: false })
      } else {
        wx.showToast({ title: res?.error || '加载失败', icon: 'none' })
        this.setData({ loading: false, detail: null })
      }
    } catch (e) {
      console.error('加载公告详情失败:', e)
      wx.showToast({ title: '网络请求失败', icon: 'none' })
      this.setData({ loading: false, detail: null })
    }
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



