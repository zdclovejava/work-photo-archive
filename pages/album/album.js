const storage = require('../../utils/storage')

Page({
  data: {
    categories: [],
    activeFilter: 'all',  // 当前筛选分类
    photoGroups: [],       // 按日期分组的照片
    // 日期索引相关
    indexList: [],          // 索引列表 [{ date, label }]
    scrollIntoView: '',     // scroll-into-view 目标 id
    showBubble: false,      // 是否显示日期气泡
    bubbleDate: '',         // 气泡中显示的日期
    activeIndexDate: '',    // 当前高亮的索引日期
  },

  onLoad() {
    this.updateData()
  },

  onShow() {
    this.updateData()
  },

  onReady() {
    // 缓存索引条位置信息（用于拖拽计算）
    this._cacheIndexBarRect()
  },

  // ==================== 数据更新 ====================

  // 更新数据
  updateData() {
    const categories = storage.getCategories()
    const photoGroups = storage.getPhotosGrouped(this.data.activeFilter)

    // 为每个照片添加分类颜色 + 生成分组 id
    const categoryMap = {}
    categories.forEach(c => { categoryMap[c.id] = c })

    photoGroups.forEach(group => {
      // 生成安全的 groupId（不含中文，用于 scroll-into-view）
      if (!group.groupId) {
        group.groupId = this._getGroupId(group.date)
      }
      group.photos.forEach(photo => {
        const cat = categoryMap[photo.categoryId]
        photo.categoryColor = cat ? cat.color : '#07C160'
        photo.categoryName = cat ? cat.name : ''
      })
    })

    // 计算日期索引列表
    const indexList = photoGroups.map(group => ({
      date: group.date,
      label: this._getIndexLabel(group.date)
    }))

    this.setData({
      categories,
      photoGroups,
      indexList,
      // 重置索引状态
      activeIndexDate: '',
      showBubble: false
    })
  },

  // 生成分组 id（不含中文，用于 scroll-into-view）
  _getGroupId(dateStr) {
    if (dateStr === '今天') return 'group-today'
    if (dateStr === '昨天') return 'group-yesterday'
    // '2026-06-05' -> 'group-2026-06-05'（安全）
    return 'group-' + dateStr
  },

  // 生成索引条显示文字
  _getIndexLabel(dateStr) {
    if (dateStr === '今天') return '今'
    if (dateStr === '昨天') return '昨'
    // '2026-06-05' -> '6/5'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const m = parseInt(parts[1])
      const d = parseInt(parts[2])
      return m + '/' + d
    }
    return dateStr
  },

  // ==================== 分类筛选 ====================

  // 分类筛选
  onFilterTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ activeFilter: id })
    this.updateData()
  },

  // ==================== 日期索引条 ====================

  // 缓存索引条 boundingClientRect
  _cacheIndexBarRect() {
    const query = wx.createSelectorQuery()
    query.select('.date-index-bar').boundingClientRect()
    query.exec((res) => {
      if (res && res[0]) {
        this._barInfo = {
          top: res[0].top,
          height: res[0].height
        }
      }
    })
  },

  // 点击索引项 -> 跳转到对应分组
  onIndexTap(e) {
    const date = e.currentTarget.dataset.date
    this._jumpToGroup(date)
  },

  // 触摸开始 + 移动（共用）
  onIndexTouchStart(e) {
    this._handleIndexTouch(e)
  },

  onIndexTouchMove(e) {
    this._handleIndexTouch(e)
  },

  // 触摸结束 -> 隐藏气泡、清除高亮
  onIndexTouchEnd() {
    this.setData({ activeIndexDate: '' })
    // 1.5秒后隐藏气泡
    if (this._bubbleTimer) clearTimeout(this._bubbleTimer)
    this._bubbleTimer = setTimeout(() => {
      this.setData({ showBubble: false })
    }, 1500)
  },

  // 根据触摸位置计算目标分组并跳转
  _handleIndexTouch(e) {
    const touch = e.touches[0]
    if (!touch) return

    const barInfo = this._barInfo
    if (!barInfo) {
      // 还未缓存，重新获取
      this._cacheIndexBarRect()
      return
    }

    const indexList = this.data.indexList
    if (!indexList || indexList.length === 0) return

    // 计算触摸位置在索引条中的比例
    const relativeY = touch.clientY - barInfo.top
    const ratio = relativeY / barInfo.height

    // 根据比例找到对应的索引项
    const index = Math.round(ratio * (indexList.length - 1))
    const clampedIndex = Math.max(0, Math.min(index, indexList.length - 1))

    const targetItem = indexList[clampedIndex]
    if (!targetItem) return

    // 节流：相同日期不重复跳转
    if (this.data.activeIndexDate !== targetItem.date) {
      this._jumpToGroup(targetItem.date)
    }
  },

  // 跳转到指定日期分组
  _jumpToGroup(date) {
    const targetId = this._getGroupId(date)

    // scroll-into-view 相同值需先清空再设
    if (this.data.scrollIntoView === targetId) {
      this.setData({ scrollIntoView: '' }, () => {
        this.setData({
          scrollIntoView: targetId,
          activeIndexDate: date
        })
      })
    } else {
      this.setData({
        scrollIntoView: targetId,
        activeIndexDate: date
      })
    }

    this.showDateBubble(date)
  },

  // 显示日期气泡
  showDateBubble(date) {
    if (this._bubbleTimer) clearTimeout(this._bubbleTimer)

    // 找到完整日期用于显示
    const group = this.data.photoGroups.find(g => g.date === date)
    const displayDate = group ? group.date : date

    this.setData({
      showBubble: true,
      bubbleDate: displayDate
    })
  },

  // 滚动时更新当前高亮的索引项
  onScroll(e) {
    // 节流：每 100ms 最多更新一次
    const now = Date.now()
    if (this._lastScrollTime && now - this._lastScrollTime < 100) return
    this._lastScrollTime = now

    // 获取当前 scrollTop 位置，找到可视区域顶部对应的分组
    const scrollTop = e.detail.scrollTop
    const query = wx.createSelectorQuery()

    // 找到第一个超过 scrollTop 的分组 header
    query.selectAll('.group-header').boundingClientRect()
    query.exec((res) => {
      if (!res || !res[0]) return
      const headers = res[0]
      // 找到第一个在可视区域上方的分组
      let currentDate = ''
      for (let i = headers.length - 1; i >= 0; i--) {
        if (headers[i].top <= 100) {  // 顶部偏移
          // 从 id 解析出日期
          const id = headers[i].id
          if (id === 'group-today') currentDate = '今天'
          else if (id === 'group-yesterday') currentDate = '昨天'
          else currentDate = id.replace('group-', '')
          break
        }
      }
      if (currentDate && currentDate !== this.data.activeIndexDate) {
        this.setData({ activeIndexDate: currentDate })
      }
    })
  },

  // ==================== 其他 ====================

  // 点击照片
  onPhotoTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // FAB 拍照
  onFabTap() {
    wx.switchTab({
      url: '/pages/camera/camera'
    })
  },

  // 搜索（暂未实现）
  onSearchTap() {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' })
  },

  // 缩略图加载失败
  onThumbError(e) {
    console.warn('缩略图加载失败', e)
  }
})
