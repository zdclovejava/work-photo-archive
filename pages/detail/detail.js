const storage = require('../../utils/storage')
const photoManager = require('../../utils/photoManager')

Page({
  data: {
    photos: [],           // 褰撳墠绛涢€夊悗鐨勭収鐗囧垪琛?    currentIndex: 0,      // 褰撳墠swiper绱㈠紩
    currentPhoto: null,   // 褰撳墠鏄剧ず鐨勭収鐗?    watermarkPreview: '', // 姘村嵃棰勮鏂囨湰
  },

  onLoad(options) {
    const id = options.id || ''
    this.loadPhotos(id)
  },

  onShow() {
    // 浠庣紪杈戝娉ㄨ繑鍥炲悗鍒锋柊
    if (this.data.currentPhoto) {
      this.refreshCurrentPhoto()
    }
  },

  // 鍔犺浇鐓х墖鍒楄〃锛屽畾浣嶅埌鎸囧畾ID
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

  // 鏋勫缓姘村嵃棰勮鏂囨湰
  buildWatermarkPreview(photo) {
    if (!photo) return ''
    const parts = []
    if (photo.watermark.time) parts.push(photo.watermark.time)
    if (photo.watermark.location) parts.push(photo.watermark.location)
    if (photo.watermark.customText) parts.push(photo.watermark.customText)
    return parts.join(' | ') || '鏃犳按鍗?
  },

  // 鍒锋柊褰撳墠鐓х墖锛堜粠缂栬緫杩斿洖鏃讹級
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

  // Swiper 鍒囨崲
  onSwiperChange(e) {
    const index = e.detail.current
    const photo = this.data.photos[index]
    this.setData({
      currentIndex: index,
      currentPhoto: photo,
      watermarkPreview: this.buildWatermarkPreview(photo)
    })
  },

  // 涓婁竴寮?  onPrev() {
    if (this.data.currentIndex > 0) {
      this.setData({ currentIndex: this.data.currentIndex - 1 })
    }
  },

  // 涓嬩竴寮?  onNext() {
    if (this.data.currentIndex < this.data.photos.length - 1) {
      this.setData({ currentIndex: this.data.currentIndex + 1 })
    }
  },

  // 鐐瑰嚮鐓х墖鍏ㄥ睆棰勮
  onPhotoPreview(e) {
    const src = e.currentTarget.dataset.src
    if (src) {
      wx.previewImage({ urls: [src], current: src })
    }
  },

  // 閲嶆柊淇濆瓨鍒扮浉鍐?  async onSaveToAlbum() {
    // 娉ㄦ剰锛氱缉鐣ュ浘鏄帇缂╁悗鐨勶紝鏃犳硶鐩存帴淇濆瓨鍒扮浉鍐?    // 瀹為檯椤圭洰涓渶瑕佷繚瀛樺師鍥惧埌鐩稿唽锛堝弬鑰冭璁℃枃妗ｏ紝鍘熷浘瀛樼郴缁熺浉鍐岋級
    // 姝ゅ鎻愮ず鐢ㄦ埛锛氬師鍥惧凡鍦ㄧ郴缁熺浉鍐屼腑
    wx.showModal({
      title: '鎻愮ず',
      content: '甯︽按鍗扮殑鍘熷浘宸蹭繚瀛樺湪绯荤粺鐩稿唽涓€傚闇€閲嶆柊淇濆瓨锛岃鍦ㄧ郴缁熺浉鍐屼腑鎵惧埌璇ョ収鐗囥€?,
      showCancel: false
    })
  },

  // 淇敼澶囨敞
  onEditNote() {
    wx.showModal({
      title: '淇敼澶囨敞',
      editable: true,
      placeholderText: '杈撳叆澶囨敞淇℃伅',
      content: this.data.currentPhoto.note || '',
      success: (res) => {
        if (res.confirm) {
          const success = storage.updatePhotoNote(
            this.data.currentPhoto.id,
            res.content || ''
          )
          if (success) {
            this.refreshCurrentPhoto()
            wx.showToast({ title: '宸蹭繚瀛?, icon: 'success' })
          }
        }
      }
    })
  },

  // 鍒犻櫎鐓х墖
  onDelete() {
    wx.showModal({
      title: '纭鍒犻櫎',
      content: '鍒犻櫎鍚庣缉鐣ュ浘灏嗕粠灏忕▼搴忎腑绉婚櫎锛岀郴缁熺浉鍐屼腑鐨勫師鍥鹃渶鎵嬪姩鍒犻櫎銆傜‘璁ゅ垹闄わ紵',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          const success = storage.deletePhoto(this.data.currentPhoto.id)
          if (success) {
            wx.showToast({ title: '宸插垹闄?, icon: 'success' })
            // 杩斿洖鐓х墖搴?            setTimeout(() => {
              wx.navigateBack()
            }, 500)
          }
        }
      }
    })
  }
})
