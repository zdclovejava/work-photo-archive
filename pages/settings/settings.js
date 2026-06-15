const app = getApp()
const storage = require('../../utils/storage')

const POSITION_TEXT = {
  leftBottom: '左下角',
  rightBottom: '右下角',
  leftTop: '左上角',
  rightTop: '右上角'
}

Page({
  data: {
    settings: {},
    positionText: '左下角',
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
      positionText: POSITION_TEXT[settings.watermarkPosition] || '左下角',
      thumbSizeText: storage.formatStorageSize(thumbSize),
      thumbPercent: Math.min(100, (thumbSize / maxThumbSize * 100)).toFixed(1),
      photoCount: photos.length
    })
  },

  // 默认时间水印
  onTimeWatermarkChange(e) {
    app.globalData.settings.defaultTimeWatermark = e.detail.value
    app.saveSettings()
    this.updateData()
  },

  // 默认地点水印
  onLocationWatermarkChange(e) {
    app.globalData.settings.defaultLocationWatermark = e.detail.value
    app.saveSettings()
    this.updateData()
  },

  // 水印位置
  onPositionTap() {
    const items = ['leftBottom', 'rightBottom', 'leftTop', 'rightTop']
    const texts = ['左下角', '右下角', '左上角', '右上角']
    wx.showActionSheet({
      itemList: texts,
      success: (res) => {
        app.globalData.settings.watermarkPosition = items[res.tapIndex]
        app.saveSettings()
        this.updateData()
      }
    })
  },

  // 水印透明度
  onOpacityChange(e) {
    app.globalData.settings.watermarkOpacity = e.detail.value
    app.saveSettings()
    this.updateData()
  },

  // 添加分类
  onAddCategory() {
    wx.showModal({
      title: '添加分类',
      editable: true,
      placeholderText: '输入分类名称',
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

  // 删除分类
  onDeleteCategory(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除分类',
      content: '确定删除该分类？已归档的照片不受影响。',
      success: (res) => {
        if (res.confirm) {
          storage.removeCategory(id)
          this.updateData()
        }
      }
    })
  },

  // 分类排序（简化版：只提示）
  onSortCategory() {
    wx.showToast({ title: '拖拽排序开发中', icon: 'none' })
  },

  // 清理旧缩略图
  onCleanThumbs() {
    wx.showModal({
      title: '清理缩略图',
      content: '将清理30天前的缩略图，照片元数据不受影响。确认清理？',
      success: (res) => {
        if (res.confirm) {
          const cleaned = storage.cleanOldThumbnails(30)
          wx.showToast({
            title: cleaned > 0 ? `已清理${cleaned}张` : '没有可清理的缩略图',
            icon: 'none'
          })
          this.updateData()
        }
      }
    })
  },

  // 意见反馈
  onFeedback() {
    wx.showToast({ title: '反馈功能开发中', icon: 'none' })
  }
})
