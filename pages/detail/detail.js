const storage = require('../../utils/storage')
const photoManager = require('../../utils/photoManager')

Page({
  data: {
    photos: [],           // 当前筛选后的照片列表
    currentIndex: 0,      // 当前swiper索引
    currentPhoto: null,   // 当前显示的照片
    watermarkPreview: '', // 水印预览文本
  },

  onLoad(options) {
    const id = options.id || ''
    this.loadPhotos(id)
  },

  onShow() {
    // 从编辑备注返回后刷新
    if (this.data.currentPhoto) {
      this.refreshCurrentPhoto()
    }
  },

  // 加载照片列表，定位到指定ID
  loadPhotos(targetId) {
    const photos = storage.getPhotos()
    const categories = storage.getCategories()
    const categoryMap = {}
    categories.forEach(c => { categoryMap[c.id] = c })

    photos.forEach(p => {
      const cat = categoryMap[p.categoryId]
      p.categoryColor = cat ? cat.color : '#07C160'
      p.categoryName = cat ? cat.name : ''
    })

    let currentIndex = 0
    if (targetId) {
      currentIndex = photos.findIndex(p => p.id === targetId)
      if (currentIndex === -1) currentIndex = 0
    }

    const currentPhoto = photos[currentIndex] || null
    const watermarkPreview = this.buildWatermarkPreview(currentPhoto)

    this.setData({
      photos,
      currentIndex,
      currentPhoto,
      watermarkPreview
    })
  },

  // 构建水印预览文本
  buildWatermarkPreview(photo) {
    if (!photo) return ''
    const parts = []
    if (photo.watermark.time) parts.push(photo.watermark.time)
    if (photo.watermark.location) parts.push(photo.watermark.location)
    if (photo.watermark.customText) parts.push(photo.watermark.customText)
    return parts.join(' | ') || '无水印'
  },

  // 刷新当前照片（从编辑返回时）
  refreshCurrentPhoto() {
    const photos = storage.getPhotos()
    const currentId = this.data.currentPhoto.id
    const updated = photos.find(p => p.id === currentId)
    if (updated) {
      this.setData({
        currentPhoto: updated,
        watermarkPreview: this.buildWatermarkPreview(updated)
      })
    }
  },

  // Swiper 切换
  onSwiperChange(e) {
    const index = e.detail.current
    const photo = this.data.photos[index]
    this.setData({
      currentIndex: index,
      currentPhoto: photo,
      watermarkPreview: this.buildWatermarkPreview(photo)
    })
  },

  // 上一张
  onPrev() {
    if (this.data.currentIndex > 0) {
      this.setData({ currentIndex: this.data.currentIndex - 1 })
    }
  },

  // 下一张
  onNext() {
    if (this.data.currentIndex < this.data.photos.length - 1) {
      this.setData({ currentIndex: this.data.currentIndex + 1 })
    }
  },

  // 点击照片全屏预览
  onPhotoPreview(e) {
    const src = e.currentTarget.dataset.src
    if (src) {
      wx.previewImage({ urls: [src], current: src })
    }
  },

  // 重新保存到相册
  async onSaveToAlbum() {
    // 注意：缩略图是压缩后的，无法直接保存到相册
    // 实际项目中需要保存原图到相册（参考设计文档，原图存系统相册）
    // 此处提示用户：原图已在系统相册中
    wx.showModal({
      title: '提示',
      content: '带水印的原图已保存在系统相册中。如需重新保存，请在系统相册中找到该照片。',
      showCancel: false
    })
  },

  // 修改备注
  onEditNote() {
    wx.showModal({
      title: '修改备注',
      editable: true,
      placeholderText: '输入备注信息',
      content: this.data.currentPhoto.note || '',
      success: (res) => {
        if (res.confirm) {
          const success = storage.updatePhotoNote(
            this.data.currentPhoto.id,
            res.content || ''
          )
          if (success) {
            this.refreshCurrentPhoto()
            wx.showToast({ title: '已保存', icon: 'success' })
          }
        }
      }
    })
  },

  // 删除照片
  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '删除后缩略图将从小程序中移除，系统相册中的原图需手动删除。确认删除？',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          const success = storage.deletePhoto(this.data.currentPhoto.id)
          if (success) {
            wx.showToast({ title: '已删除', icon: 'success' })
            // 返回照片库
            setTimeout(() => {
              wx.navigateBack()
            }, 500)
          }
        }
      }
    })
  }
})
