App({
  globalData: {
    // 全局设置（从 Storage 加载）
    settings: {
      defaultTimeWatermark: true,
      defaultLocationWatermark: true,
      watermarkPosition: 'leftBottom',  // leftBottom | rightBottom | leftTop | rightTop
      watermarkOpacity: 70,             // 0-100
      categories: [
        { id: 'meeting', name: '会议', color: '#07C160' },
        { id: 'reception', name: '接待', color: '#4CAF50' },
        { id: 'travel', name: '出差', color: '#8BC34A' },
        { id: 'construction', name: '施工', color: '#689F38' },
        { id: 'inspection', name: '检查', color: '#558B2F' }
      ]
    }
  },

  onLaunch() {
    this.loadSettings()
  },

  // 从 Storage 加载设置
  loadSettings() {
    try {
      const saved = wx.getStorageSync('settings')
      if (saved) {
        this.globalData.settings = Object.assign(this.globalData.settings, saved)
      }
    } catch (e) {
      console.error('加载设置失败', e)
    }
  },

  // 保存设置到 Storage
  saveSettings() {
    try {
      wx.setStorageSync('settings', this.globalData.settings)
    } catch (e) {
      console.error('保存设置失败', e)
    }
  }
})
