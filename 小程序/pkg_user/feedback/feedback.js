import { ajax, uploadToOSS } from '../../utils/index'

Page({
  data: {
    content: '',
    images: [],
    submitting: false
  },

  onContentInput(e) {
    this.setData({
      content: e.detail.value || ''
    })
  },

  onChooseImage() {
    const remain = 3 - this.data.images.length
    if (remain <= 0) return
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = res.tempFiles.map(f => f.tempFilePath)
        this.setData({
          images: [...this.data.images, ...files]
        })
      }
    })
  },

  onPreviewImage(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    })
  },

  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index
    const list = [...this.data.images]
    list.splice(index, 1)
    this.setData({ images: list })
  },

  async onSubmit() {
    if (this.data.submitting) return

    const user_id = wx.getStorageSync('user_id')
    if (!user_id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const content = this.data.content.trim()
    if (!content) {
      wx.showToast({ title: '请填写问题描述', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      wx.showLoading({ title: '提交中...', mask: true })

      // 先上传图片到 OSS，复用现有工具
      const imageUrls = []
      for (let i = 0; i < this.data.images.length; i++) {
        const p = this.data.images[i]
        const url = await uploadToOSS(p, user_id)
        imageUrls.push(url)
      }

      // 提交反馈到后端
      const res = await ajax('/feedback/create', 'POST', {
        user_id,
        content,
        images: imageUrls
      })

      wx.hideLoading()

      if (res?.msg === 'success') {
        // 人性化提示
        wx.showToast({
          title: '我们会尽快核实，感谢您的建议',
          icon: 'none',
          duration: 2500
        })

        // 重置表单
        this.setData({
          content: '',
          images: []
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 2500)
      } else {
        wx.showToast({
          title: res?.error || '提交失败，请稍后重试',
          icon: 'none'
        })
      }
    } catch (e) {
      wx.hideLoading()
      console.error('提交问题反馈失败:', e)
      wx.showToast({
        title: '提交失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  }
})




