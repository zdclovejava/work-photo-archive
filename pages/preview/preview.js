const storage = require('../../utils/storage')
const photoManager = require('../../utils/photoManager')
const watermarkUtil = require('../../utils/watermark')
const locationUtil = require('../../utils/location')

Page({
  data: {
    tempPath: '',           // 鍘熷浘涓存椂璺緞
    categoryId: 'all',      // 閫変腑鐨勫垎绫?    categoryName: '',
    categoryColor: '#07C160',
    categories: [],
    watermark: {
      time: true,
      location: false,
      customText: '',
      showCategory: true,
      timeText: '',         // 鏄剧ず鐢ㄧ殑鏃堕棿鏂囨湰
      locationText: ''      // 鏄剧ず鐢ㄧ殑鍦扮偣鏂囨湰
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

    // 鑾峰彇褰撳墠浣嶇疆锛堝鏋滃紑鍚簡鍦扮偣姘村嵃锛?    let locationText = ''
    if (watermark.location) {
      locationUtil.getLocation()
        .then(loc => {
          this.setData({
            'watermark.locationText': loc.address
          })
        })
        .catch(() => {
          this.setData({
            'watermark.locationText': '鏈紑鍚畾浣?
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
        locationText: watermark.location ? '鑾峰彇涓?..' : ''
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

  // 鍒嗙被閫夋嫨
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

  // 鏃堕棿姘村嵃寮€鍏?  onTimeWatermarkChange(e) {
    this.setData({
      'watermark.time': e.detail.value,
      'watermark.timeText': e.detail.value ? this.formatTime(new Date()) : ''
    })
  },

  // 鍦扮偣姘村嵃寮€鍏?  onLocationWatermarkChange(e) {
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
            'watermark.locationText': '鏈紑鍚畾浣?
          })
        })
    } else {
      this.setData({
        'watermark.location': false,
        'watermark.locationText': ''
      })
    }
  },

  // 鑷畾涔夋枃瀛楄緭鍏?  onCustomTextInput(e) {
    this.setData({
      'watermark.customText': e.detail.value
    })
  },

  // 澶囨敞杈撳叆
  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  // 淇濆瓨鍒扮浉鍐?  async onSave() {
    if (this.data.isSaving) return
    this.setData({ isSaving: true })
    wx.showLoading({ title: '淇濆瓨涓?..' })

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
      // 杩斿洖鐓х墖搴撻〉
      wx.switchTab({
        url: '/pages/album/album'
      })
    } catch (err) {
      wx.hideLoading()
      console.error('淇濆瓨澶辫触', err)
      wx.showToast({ title: '淇濆瓨澶辫触', icon: 'none' })
      this.setData({ isSaving: false })
    }
  },

  // 閲嶆媿
  onRetake() {
    wx.navigateBack()
  },

  // 鐐瑰嚮鍥剧墖棰勮澶у浘
  onImagePreview() {
    wx.previewImage({
      urls: [this.data.tempPath],
      current: this.data.tempPath
    })
  }
})
