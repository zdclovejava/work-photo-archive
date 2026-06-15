const storage = require('../../utils/storage')
const photoManager = require('../../utils/photoManager')
const watermarkUtil = require('../../utils/watermark')
const locationUtil = require('../../utils/location')

Page({
  data: {
    tempPath: '',           // 原图临时路径
    categoryId: 'all',      // 选中的分类
    categoryName: '',
    categoryColor: '#07C160',
    categories: [],
    watermark: {
      time: true,
      location: false,
      customText: '',
      showCategory: true,
      timeText: '',         // 显示用的时间文本
      locationText: ''      // 显示用的地点文本
    },
    note: '',
    showWatermarkOverlay: true,
    isSaving: false
  },

  onLoad(options) {
    const tempPath = decodeURIComponent(options.tempPath || '')
    let watermark = {}
    try {
      watermark = JSON.parse(decodeURIComponent(options.watermark || '{}'))
    } catch (e) {}

    const categoryId = options.categoryId || 'all'
    const categories = storage.getCategories()
    const cat = categories.find(c => c.id === categoryId)

    // 获取当前位置（如果开启了地点水印）
    let locationText = ''
    if (watermark.location) {
      locationUtil.getLocation()
        .then(loc => {
          this.setData({
            'watermark.locationText': loc.address
          })
        })
        .catch(() => {
          this.setData({
            'watermark.locationText': '未开启定位'
          })
        })
    }

    this.setData({
      tempPath,
      categoryId,
      categoryName: cat ? cat.name : '',
      categoryColor: cat ? cat.color : '#07C160',
      categories,
      watermark: {
        ...watermark,
        timeText: watermark.time ? this.formatTime(new Date()) : '',
        locationText: watermark.location ? '获取中...' : ''
      }
    })
  },

  formatTime(date) {
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    const h = date.getHours().toString().padStart(2, '0')
    const min = date.getMinutes().toString().padStart(2, '0')
    return `${y}-${m}-${d} ${h}:${min}`
  },

  // 分类选择
  onCategorySelect(e) {
    const id = e.currentTarget.dataset.id
    const cat = this.data.categories.find(c => c.id === id)
    this.setData({
      categoryId: id,
      categoryName: cat ? cat.name : '',
      categoryColor: cat ? cat.color : '#07C160',
      'watermark.showCategory': true
    })
  },

  // 时间水印开关
  onTimeWatermarkChange(e) {
    this.setData({
      'watermark.time': e.detail.value,
      'watermark.timeText': e.detail.value ? this.formatTime(new Date()) : ''
    })
  },

  // 地点水印开关
  onLocationWatermarkChange(e) {
    const enabled = e.detail.value
    if (enabled) {
      locationUtil.getLocation()
        .then(loc => {
          this.setData({
            'watermark.location': true,
            'watermark.locationText': loc.address
          })
        })
        .catch(() => {
          this.setData({
            'watermark.location': true,
            'watermark.locationText': '未开启定位'
          })
        })
    } else {
      this.setData({
        'watermark.location': false,
        'watermark.locationText': ''
      })
    }
  },

  // 自定义文字输入
  onCustomTextInput(e) {
    this.setData({
      'watermark.customText': e.detail.value
    })
  },

  // 备注输入
  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  // 保存到相册
  async onSave() {
    if (this.data.isSaving) return
    this.setData({ isSaving: true })
    wx.showLoading({ title: '保存中...' })

    try {
      const photo = await photoManager.savePhoto(this.data.tempPath, {
        categoryId: this.data.categoryId === 'all' ? this.data.categories[0]?.id || 'meeting' : this.data.categoryId,
        watermark: {
          time: this.data.watermark.time,
          location: this.data.watermark.location,
          customText: this.data.watermark.customText || null,
          showCategory: this.data.watermark.showCategory
        },
        note: this.data.note
      })

      wx.hideLoading()
      // 返回照片库页
      wx.switchTab({
        url: '/pages/album/album'
      })
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
      this.setData({ isSaving: false })
    }
  },

  // 重拍
  onRetake() {
    wx.navigateBack()
  },

  // 点击图片预览大图
  onImagePreview() {
    wx.previewImage({
      urls: [this.data.tempPath],
      current: this.data.tempPath
    })
  }
})
