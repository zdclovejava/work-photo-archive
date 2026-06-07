const app = getApp()
const storage = require('../../utils/storage')

const POSITION_TEXT = {
  leftBottom: '宸︿笅瑙?,
  rightBottom: '鍙充笅瑙?,
  leftTop: '宸︿笂瑙?,
  rightTop: '鍙充笂瑙?
}

Page({
  data: {
    settings: {},
    positionText: '宸︿笅瑙?,
    thumbSizeText: '0 KB',
    thumbPercent: 0,
    photoCount: 0
  },

  onLoad() {
    this.updateData()
  },

  onShow() {
    this.updateData()
  },

  updateData() {
    const settings = app.globalData.settings
    const thumbSize = storage.getThumbStorageSize()
    const photos = storage.getPhotos()
    const maxThumbSize = 200 * 1024 * 1024 // 200MB

    this.setData({
      settings,
      positionText: POSITION_TEXT[settings.watermarkPosition] || '宸︿笅瑙?,
      thumbSizeText: storage.formatStorageSize(thumbSize),
      thumbPercent: Math.min(100, (thumbSize / maxThumbSize * 100)).toFixed(1),
      photoCount: photos.length
    })
  },

  // 榛樿鏃堕棿姘村嵃
  onTimeWatermarkChange(e) {
    app.globalData.settings.defaultTimeWatermark = e.detail.value
    app.saveSettings()
    this.updateData()
  },

  // 榛樿鍦扮偣姘村嵃
  onLocationWatermarkChange(e) {
    app.globalData.settings.defaultLocationWatermark = e.detail.value
    app.saveSettings()
    this.updateData()
  },

  // 姘村嵃浣嶇疆
  onPositionTap() {
    const items = ['leftBottom', 'rightBottom', 'leftTop', 'rightTop']
    const texts = ['宸︿笅瑙?, '鍙充笅瑙?, '宸︿笂瑙?, '鍙充笂瑙?]
    wx.showActionSheet({
      itemList: texts,
      success: (res) => {
        app.globalData.settings.watermarkPosition = items[res.tapIndex]
        app.saveSettings()
        this.updateData()
      }
    })
  },

  // 姘村嵃閫忔槑搴?  onOpacityChange(e) {
    app.globalData.settings.watermarkOpacity = e.detail.value
    app.saveSettings()
    this.updateData()
  },

  // 娣诲姞鍒嗙被
  onAddCategory() {
    wx.showModal({
      title: '娣诲姞鍒嗙被',
      editable: true,
      placeholderText: '杈撳叆鍒嗙被鍚嶇О',
      success: (res) => {
        if (res.confirm && res.content) {
          const colors = ['#07C160', '#4CAF50', '#8BC34A', '#689F38', '#558B2F', '#388E3C', '#C0D960']
          const idx = storage.getCategories().length % colors.length
          storage.addCategory(res.content, colors[idx])
          this.updateData()
        }
      }
    })
  },

  // 鍒犻櫎鍒嗙被
  onDeleteCategory(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '鍒犻櫎鍒嗙被',
      content: '纭畾鍒犻櫎璇ュ垎绫伙紵宸插綊妗ｇ殑鐓х墖涓嶅彈褰卞搷銆?,
      success: (res) => {
        if (res.confirm) {
          storage.removeCategory(id)
          this.updateData()
        }
      }
    })
  },

  // 鍒嗙被鎺掑簭锛堢畝鍖栫増锛氬彧鎻愮ず锛?  onSortCategory() {
    wx.showToast({ title: '鎷栨嫿鎺掑簭寮€鍙戜腑', icon: 'none' })
  },

  // 娓呯悊鏃х缉鐣ュ浘
  onCleanThumbs() {
    wx.showModal({
      title: '娓呯悊缂╃暐鍥?,
      content: '灏嗘竻鐞?0澶╁墠鐨勭缉鐣ュ浘锛岀収鐗囧厓鏁版嵁涓嶅彈褰卞搷銆傜‘璁ゆ竻鐞嗭紵',
      success: (res) => {
        if (res.confirm) {
          const cleaned = storage.cleanOldThumbnails(30)
          wx.showToast({
            title: cleaned > 0 ? `宸叉竻鐞?{cleaned}寮燻 : '娌℃湁鍙竻鐞嗙殑缂╃暐鍥?,
            icon: 'none'
          })
          this.updateData()
        }
      }
    })
  },

  // 鎰忚鍙嶉
  onFeedback() {
    wx.showToast({ title: '鍙嶉鍔熻兘寮€鍙戜腑', icon: 'none' })
  }
})
