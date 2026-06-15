const app = getApp()
const storage = require('../../utils/storage')
const photoManager = require('../../utils/photoManager')
const locationUtil = require('../../utils/location')

Page({
  data: {
    categories: [],
    activeCategory: 'all',       // 当前选中的分类ID
    activeCategoryName: '',      // 当前选中分类名称
    activeCategoryColor: '#07C160',
    hasCameraAuth: false,        // 相机权限
    cameraPosition: 'back',     // 前置/后置
    settings: {},                // 全局设置
    showWatermarkPreview: true,
    currentTime: '',            // 实时时间
    locationText: '',            // 当前位置
    showCustomText: false,       // 是否展开自定义文字
    customText: '',              // 自定义水印文字
    // 镜头切换相关
    cameraReady: false,          // 相机是否初始化完成
    maxZoom: 1,                  // 相机最大变焦值
    currentZoom: 1,              // 当前变焦值
    zoomOptions: [               // 可用倍率选项（动态生成）
      { label: '1x', value: 1 }
    ],
    _supportsWideAngle: false,   // 是否支持广角（zoom < 1）
  },

  onLoad() {
    this.checkCameraAuth()
    this.updateSettings()
    this.updateCategories()
    this.startTimeUpdate()
    // loadLocation 延迟执行确保 settings 已加载
    setTimeout(() => { this.loadLocation() }, 100)
  },

  onShow() {
    this.checkCameraAuth()
    this.updateSettings()
    this.updateCategories()
  },

  // ==================== 相机权限 ====================

  // 检查相机权限
  checkCameraAuth() {
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

  // 主动请求相机权限
  requestCameraAuth() {
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        this.setData({ hasCameraAuth: true })
      },
      fail: () => {
        this.setData({ hasCameraAuth: false })
        wx.showModal({
          title: '需要相机权限',
          content: '请在设置中开启相机权限，才能使用拍照功能',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  // ==================== 镜头切换 ====================

  // 相机初始化完成
  onCameraInitDone(e) {
    const maxZoom = (e && e.detail && e.detail.maxZoom) ? e.detail.maxZoom : 1
    console.log('[相机] 初始化完成，maxZoom:', maxZoom)

    // 前置摄像头通常不支持变焦
    if (this.data.cameraPosition === 'front') {
      this.setData({
        cameraReady: true,
        maxZoom: 1,
        currentZoom: 1,
        zoomOptions: [{ label: '1x', value: 1 }]
      })
      return
    }

    // 后置摄像头：智能探测广角支持
    this._detectWideAngle(maxZoom)
  },

  // 智能探测是否支持广角（zoom < 1）
  _detectWideAngle(maxZoom) {
    const ctx = wx.createCameraContext()
    this._zoomCtx = ctx

    // 先尝试 0.5x
    ctx.setZoom({
      zoom: 0.5,
      success: () => {
        // 支持广角，恢复 1x
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
        // 不支持广角
        this._finalizeZoomOptions(maxZoom, false)
      }
    })
  },

  // 根据设备能力生成可用倍率列表
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
    // 如果 maxZoom > 3，追加最大倍率按钮
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

  // 切换镜头倍率
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
        console.log('[相机] 变焦成功:', zoom + 'x')
      },
      fail: (err) => {
        console.warn('[相机] 变焦失败:', err)
        wx.showToast({
          title: '该倍率不支持',
          icon: 'none',
          duration: 1500
        })
        // 回退到 1x
        this.setData({ currentZoom: 1 })
        ctx.setZoom({ zoom: 1 })
      }
    })
  },

  // ==================== 设置/分类/水印 ====================

  // 更新设置
  updateSettings() {
    this.setData({
      settings: app.globalData.settings
    })
  },

  // 更新分类列表
  updateCategories() {
    this.setData({
      categories: storage.getCategories()
    })
  },

  // 实时更新时间（每秒刷新）
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

  // 加载位置
  loadLocation() {
    if (!app.globalData.settings.defaultLocationWatermark) return
    locationUtil.getLocation()
      .then(loc => {
        this.setData({ locationText: loc.address })
      })
      .catch(() => {
        this.setData({ locationText: '未开启定位' })
      })
  },

  // 分类选择
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

  // 添加分类
  onAddCategory() {
    wx.showModal({
      title: '添加分类',
      editable: true,
      placeholderText: '输入分类名称',
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

  // 开关 - 时间水印
  toggleTimeWatermark() {
    app.globalData.settings.defaultTimeWatermark = !app.globalData.settings.defaultTimeWatermark
    app.saveSettings()
    this.updateSettings()
  },

  // 开关 - 地点水印
  toggleLocationWatermark() {
    app.globalData.settings.defaultLocationWatermark = !app.globalData.settings.defaultLocationWatermark
    app.saveSettings()
    this.updateSettings()
    if (app.globalData.settings.defaultLocationWatermark) {
      this.loadLocation()
    }
  },

  // 开关 - 自定义文字
  toggleCustomText() {
    this.setData({
      showCustomText: !this.data.showCustomText
    })
  },

  // 自定义文字输入
  onCustomTextInput(e) {
    this.setData({ customText: e.detail.value })
  },

  onCustomTextConfirm(e) {
    this.setData({ customText: e.detail.value })
  },

  // ==================== 拍照操作 ====================

  // 拍照
  onTakePhoto() {
    if (!this.data.hasCameraAuth) {
      this.requestCameraAuth()
      return
    }
    const ctx = wx.createCameraContext()
    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        // 跳转到预览页
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
        console.error('拍照失败', err)
        wx.showToast({ title: '拍照失败', icon: 'none' })
      }
    })
  },

  // 相册选取
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

  // 翻转摄像头
  onFlipTap() {
    this.setData({
      cameraPosition: this.data.cameraPosition === 'back' ? 'front' : 'back',
      currentZoom: 1,
      cameraReady: false  // 翻转后需等待重新 initdone
    })
  },

  // 打开设置
  openSetting() {
    wx.openSetting()
  },

  onCameraError(e) {
    console.error('相机错误', e)
    this.setData({ hasCameraAuth: false })
  },

  onUnload() {
    if (this._timeTimer) clearInterval(this._timeTimer)
  }
})
