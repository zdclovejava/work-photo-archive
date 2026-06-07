const app = getApp()
const storage = require('../../utils/storage')
const photoManager = require('../../utils/photoManager')
const locationUtil = require('../../utils/location')

Page({
  data: {
    categories: [],
    activeCategory: 'all',       // 褰撳墠閫変腑鐨勫垎绫籌D
    activeCategoryName: '',      // 褰撳墠閫変腑鍒嗙被鍚嶇О
    activeCategoryColor: '#07C160',
    hasCameraAuth: false,        // 鐩告満鏉冮檺
    cameraPosition: 'back',     // 鍓嶇疆/鍚庣疆
    settings: {},                // 鍏ㄥ眬璁剧疆
    showWatermarkPreview: true,
    currentTime: '',            // 瀹炴椂鏃堕棿
    locationText: '',            // 褰撳墠浣嶇疆
    showCustomText: false,       // 鏄惁灞曞紑鑷畾涔夋枃瀛?    customText: '',              // 鑷畾涔夋按鍗版枃瀛?    // 闀滃ご鍒囨崲鐩稿叧
    cameraReady: false,          // 鐩告満鏄惁鍒濆鍖栧畬鎴?    maxZoom: 1,                  // 鐩告満鏈€澶у彉鐒﹀€?    currentZoom: 1,              // 褰撳墠鍙樼劍鍊?    zoomOptions: [               // 鍙敤鍊嶇巼閫夐」锛堝姩鎬佺敓鎴愶級
      { label: '1x', value: 1 }
    ],
    _supportsWideAngle: false,   // 鏄惁鏀寔骞胯锛坺oom < 1锛?  },

  onLoad() {
    this.checkCameraAuth()
    this.updateSettings()
    this.updateCategories()
    this.startTimeUpdate()
    // loadLocation 寤惰繜鎵ц纭繚 settings 宸插姞杞?    setTimeout(() => { this.loadLocation() }, 100)
  },

  onShow() {
    this.checkCameraAuth()
    this.updateSettings()
    this.updateCategories()
  },

  // ==================== 鐩告満鏉冮檺 ====================

  // 妫€鏌ョ浉鏈烘潈闄?  checkCameraAuth() {
    wx.getSetting({
      success: (res) => {
        const auth = res.authSetting['scope.camera']
        if (auth === true) {
          this.setData({ hasCameraAuth: true })
        } else if (auth === false) {
          this.setData({ hasCameraAuth: false })
        } else {
          this.requestCameraAuth()
        }
      }
    })
  },

  // 涓诲姩璇锋眰鐩告満鏉冮檺
  requestCameraAuth() {
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        this.setData({ hasCameraAuth: true })
      },
      fail: () => {
        this.setData({ hasCameraAuth: false })
        wx.showModal({
          title: '闇€瑕佺浉鏈烘潈闄?,
          content: '璇峰湪璁剧疆涓紑鍚浉鏈烘潈闄愶紝鎵嶈兘浣跨敤鎷嶇収鍔熻兘',
          confirmText: '鍘昏缃?,
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  // ==================== 闀滃ご鍒囨崲 ====================

  // 鐩告満鍒濆鍖栧畬鎴?  onCameraInitDone(e) {
    const maxZoom = (e && e.detail && e.detail.maxZoom) ? e.detail.maxZoom : 1
    console.log('[鐩告満] 鍒濆鍖栧畬鎴愶紝maxZoom:', maxZoom)

    // 鍓嶇疆鎽勫儚澶撮€氬父涓嶆敮鎸佸彉鐒?    if (this.data.cameraPosition === 'front') {
      this.setData({
        cameraReady: true,
        maxZoom: 1,
        currentZoom: 1,
        zoomOptions: [{ label: '1x', value: 1 }]
      })
      return
    }

    // 鍚庣疆鎽勫儚澶达細鏅鸿兘鎺㈡祴骞胯鏀寔
    this._detectWideAngle(maxZoom)
  },

  // 鏅鸿兘鎺㈡祴鏄惁鏀寔骞胯锛坺oom < 1锛?  _detectWideAngle(maxZoom) {
    const ctx = wx.createCameraContext()
    this._zoomCtx = ctx

    // 鍏堝皾璇?0.5x
    ctx.setZoom({
      zoom: 0.5,
      success: () => {
        // 鏀寔骞胯锛屾仮澶?1x
        ctx.setZoom({
          zoom: 1,
          success: () => {
            this._finalizeZoomOptions(maxZoom, true)
          },
          fail: () => {
            this._finalizeZoomOptions(maxZoom, true)
          }
        })
      },
      fail: () => {
        // 涓嶆敮鎸佸箍瑙?        this._finalizeZoomOptions(maxZoom, false)
      }
    })
  },

  // 鏍规嵁璁惧鑳藉姏鐢熸垚鍙敤鍊嶇巼鍒楄〃
  _finalizeZoomOptions(maxZoom, supportsWideAngle) {
    this._supportsWideAngle = supportsWideAngle
    const options = []

    if (supportsWideAngle) {
      options.push({ label: '0.5x', value: 0.5 })
    }
    options.push({ label: '1x', value: 1 })

    if (maxZoom >= 2) {
      options.push({ label: '2x', value: 2 })
    }
    if (maxZoom >= 3) {
      options.push({ label: '3x', value: 3 })
    }
    // 濡傛灉 maxZoom > 3锛岃拷鍔犳渶澶у€嶇巼鎸夐挳
    if (maxZoom > 3) {
      const maxLabel = Math.floor(maxZoom) >= 10 ? '10x' : Math.floor(maxZoom) + 'x'
      options.push({ label: maxLabel, value: Math.floor(maxZoom) })
    }

    this.setData({
      cameraReady: true,
      maxZoom,
      zoomOptions: options,
      currentZoom: 1
    })
  },

  // 鍒囨崲闀滃ご鍊嶇巼
  onZoomTap(e) {
    const zoom = Number(e.currentTarget.dataset.zoom)
    if (zoom === this.data.currentZoom) return
    if (!this._zoomCtx) {
      this._zoomCtx = wx.createCameraContext()
    }

    const ctx = this._zoomCtx
    ctx.setZoom({
      zoom: zoom,
      success: () => {
        this.setData({ currentZoom: zoom })
        console.log('[鐩告満] 鍙樼劍鎴愬姛:', zoom + 'x')
      },
      fail: (err) => {
        console.warn('[鐩告満] 鍙樼劍澶辫触:', err)
        wx.showToast({
          title: '璇ュ€嶇巼涓嶆敮鎸?,
          icon: 'none',
          duration: 1500
        })
        // 鍥為€€鍒?1x
        this.setData({ currentZoom: 1 })
        ctx.setZoom({ zoom: 1 })
      }
    })
  },

  // ==================== 璁剧疆/鍒嗙被/姘村嵃 ====================

  // 鏇存柊璁剧疆
  updateSettings() {
    this.setData({
      settings: app.globalData.settings
    })
  },

  // 鏇存柊鍒嗙被鍒楄〃
  updateCategories() {
    this.setData({
      categories: storage.getCategories()
    })
  },

  // 瀹炴椂鏇存柊鏃堕棿锛堟瘡绉掑埛鏂帮級
  startTimeUpdate() {
    this.updateTime()
    this._timeTimer = setInterval(() => {
      this.updateTime()
    }, 1000)
  },

  updateTime() {
    const now = new Date()
    const h = now.getHours().toString().padStart(2, '0')
    const m = now.getMinutes().toString().padStart(2, '0')
    this.setData({
      currentTime: `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')} ${h}:${m}`
    })
  },

  // 鍔犺浇浣嶇疆
  loadLocation() {
    if (!app.globalData.settings.defaultLocationWatermark) return
    locationUtil.getLocation()
      .then(loc => {
        this.setData({ locationText: loc.address })
      })
      .catch(() => {
        this.setData({ locationText: '鏈紑鍚畾浣? })
      })
  },

  // 鍒嗙被閫夋嫨
  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id
    if (id === 'all') {
      this.setData({
        activeCategory: 'all',
        activeCategoryName: '',
        activeCategoryColor: '#07C160'
      })
      return
    }
    const cat = this.data.categories.find(c => c.id === id)
    this.setData({
      activeCategory: id,
      activeCategoryName: cat ? cat.name : '',
      activeCategoryColor: cat ? cat.color : '#07C160'
    })
  },

  // 娣诲姞鍒嗙被
  onAddCategory() {
    wx.showModal({
      title: '娣诲姞鍒嗙被',
      editable: true,
      placeholderText: '杈撳叆鍒嗙被鍚嶇О',
      success: (res) => {
        if (res.confirm && res.content) {
          const colors = ['#07C160', '#4CAF50', '#8BC34A', '#689F38', '#558B2F', '#388E3C']
          const idx = storage.getCategories().length % colors.length
          storage.addCategory(res.content, colors[idx])
          this.updateCategories()
        }
      }
    })
  },

  // 寮€鍏?- 鏃堕棿姘村嵃
  toggleTimeWatermark() {
    app.globalData.settings.defaultTimeWatermark = !app.globalData.settings.defaultTimeWatermark
    app.saveSettings()
    this.updateSettings()
  },

  // 寮€鍏?- 鍦扮偣姘村嵃
  toggleLocationWatermark() {
    app.globalData.settings.defaultLocationWatermark = !app.globalData.settings.defaultLocationWatermark
    app.saveSettings()
    this.updateSettings()
    if (app.globalData.settings.defaultLocationWatermark) {
      this.loadLocation()
    }
  },

  // 寮€鍏?- 鑷畾涔夋枃瀛?  toggleCustomText() {
    this.setData({
      showCustomText: !this.data.showCustomText
    })
  },

  // 鑷畾涔夋枃瀛楄緭鍏?  onCustomTextInput(e) {
    this.setData({ customText: e.detail.value })
  },

  onCustomTextConfirm(e) {
    this.setData({ customText: e.detail.value })
  },

  // ==================== 鎷嶇収鎿嶄綔 ====================

  // 鎷嶇収
  onTakePhoto() {
    if (!this.data.hasCameraAuth) {
      this.requestCameraAuth()
      return
    }
    const ctx = wx.createCameraContext()
    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        // 璺宠浆鍒伴瑙堥〉
        const { activeCategory, customText, settings, currentZoom } = this.data
        const watermark = {
          time: settings.defaultTimeWatermark,
          location: settings.defaultLocationWatermark,
          customText: this.data.customText || null,
          showCategory: activeCategory !== 'all'
        }
        const params = [
          `tempPath=${encodeURIComponent(res.tempImagePath)}`,
          `categoryId=${activeCategory}`,
          `watermark=${encodeURIComponent(JSON.stringify(watermark))}`
        ].join('&')

        wx.navigateTo({
          url: `/pages/preview/preview?${params}`
        })
      },
      fail: (err) => {
        console.error('鎷嶇収澶辫触', err)
        wx.showToast({ title: '鎷嶇収澶辫触', icon: 'none' })
      }
    })
  },

  // 鐩稿唽閫夊彇
  onAlbumTap() {
    photoManager.chooseImage('album')
      .then(tempPath => {
        const { activeCategory } = this.data
        const watermark = {
          time: this.data.settings.defaultTimeWatermark,
          location: this.data.settings.defaultLocationWatermark,
          customText: this.data.customText || null,
          showCategory: activeCategory !== 'all'
        }
        const params = [
          `tempPath=${encodeURIComponent(tempPath)}`,
          `categoryId=${activeCategory}`,
          `watermark=${encodeURIComponent(JSON.stringify(watermark))}`
        ].join('&')
        wx.navigateTo({
          url: `/pages/preview/preview?${params}`
        })
      })
      .catch(() => {})
  },

  // 缈昏浆鎽勫儚澶?  onFlipTap() {
    this.setData({
      cameraPosition: this.data.cameraPosition === 'back' ? 'front' : 'back',
      currentZoom: 1,
      cameraReady: false  // 缈昏浆鍚庨渶绛夊緟閲嶆柊 initdone
    })
  },

  // 鎵撳紑璁剧疆
  openSetting() {
    wx.openSetting()
  },

  onCameraError(e) {
    console.error('鐩告満閿欒', e)
    this.setData({ hasCameraAuth: false })
  },

  onUnload() {
    if (this._timeTimer) clearInterval(this._timeTimer)
  }
})
