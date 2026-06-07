App({
  globalData: {
    // 鍏ㄥ眬璁剧疆锛堜粠 Storage 鍔犺浇锛?    settings: {
      defaultTimeWatermark: true,
      defaultLocationWatermark: true,
      watermarkPosition: 'leftBottom',  // leftBottom | rightBottom | leftTop | rightTop
      watermarkOpacity: 70,             // 0-100
      categories: [
        { id: 'meeting', name: '浼氳', color: '#07C160' },
        { id: 'reception', name: '鎺ュ緟', color: '#4CAF50' },
        { id: 'travel', name: '鍑哄樊', color: '#8BC34A' },
        { id: 'construction', name: '鏂藉伐', color: '#689F38' },
        { id: 'inspection', name: '妫€鏌?, color: '#558B2F' }
      ]
    }
  },

  onLaunch() {
    this.loadSettings()
  },

  // 浠?Storage 鍔犺浇璁剧疆
  loadSettings() {
    try {
      const saved = wx.getStorageSync('settings')
      if (saved) {
        this.globalData.settings = Object.assign(this.globalData.settings, saved)
      }
    } catch (e) {
      console.error('鍔犺浇璁剧疆澶辫触', e)
    }
  },

  // 淇濆瓨璁剧疆鍒?Storage
  saveSettings() {
    try {
      wx.setStorageSync('settings', this.globalData.settings)
    } catch (e) {
      console.error('淇濆瓨璁剧疆澶辫触', e)
    }
  }
})
