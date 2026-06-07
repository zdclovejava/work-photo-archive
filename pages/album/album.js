const storage = require('../../utils/storage')

Page({
  data: {
    categories: [],
    activeFilter: 'all',  // 褰撳墠绛涢€夊垎绫?    photoGroups: [],       // 鎸夋棩鏈熷垎缁勭殑鐓х墖
    // 鏃ユ湡绱㈠紩鐩稿叧
    indexList: [],          // 绱㈠紩鍒楄〃 [{ date, label }]
    scrollIntoView: '',     // scroll-into-view 鐩爣 id
    showBubble: false,      // 鏄惁鏄剧ず鏃ユ湡姘旀场
    bubbleDate: '',         // 姘旀场涓樉绀虹殑鏃ユ湡
    activeIndexDate: '',    // 褰撳墠楂樹寒鐨勭储寮曟棩鏈?  },

  onLoad() {
    this.updateData()
  },

  onShow() {
    this.updateData()
  },

  onReady() {
    // 缂撳瓨绱㈠紩鏉′綅缃俊鎭紙鐢ㄤ簬鎷栨嫿璁＄畻锛?    this._cacheIndexBarRect()
  },

  // ==================== 鏁版嵁鏇存柊 ====================

  // 鏇存柊鏁版嵁
  updateData() {
    const categories = storage.getCategories()
    const photoGroups = storage.getPhotosGrouped(this.data.activeFilter)

    // 涓烘瘡涓収鐗囨坊鍔犲垎绫婚鑹?+ 鐢熸垚鍒嗙粍 id
    const categoryMap = {}
    categories.forEach(c => { categoryMap[c.id] = c })

    photoGroups.forEach(group => {
      // 鐢熸垚瀹夊叏鐨?groupId锛堜笉鍚腑鏂囷紝鐢ㄤ簬 scroll-into-view锛?      if (!group.groupId) {
        group.groupId = this._getGroupId(group.date)
      }
      group.photos.forEach(photo => {
        const cat = categoryMap[photo.categoryId]
        photo.categoryColor = cat ? cat.color : '#07C160'
        photo.categoryName = cat ? cat.name : ''
      })
    })

    // 璁＄畻鏃ユ湡绱㈠紩鍒楄〃
    const indexList = photoGroups.map(group => ({
      date: group.date,
      label: this._getIndexLabel(group.date)
    }))

    this.setData({
      categories,
      photoGroups,
      indexList,
      // 閲嶇疆绱㈠紩鐘舵€?      activeIndexDate: '',
      showBubble: false
    })
  },

  // 鐢熸垚鍒嗙粍 id锛堜笉鍚腑鏂囷紝鐢ㄤ簬 scroll-into-view锛?  _getGroupId(dateStr) {
    if (dateStr === '浠婂ぉ') return 'group-today'
    if (dateStr === '鏄ㄥぉ') return 'group-yesterday'
    // '2026-06-05' -> 'group-2026-06-05'锛堝畨鍏級
    return 'group-' + dateStr
  },

  // 鐢熸垚绱㈠紩鏉℃樉绀烘枃瀛?  _getIndexLabel(dateStr) {
    if (dateStr === '浠婂ぉ') return '浠?
    if (dateStr === '鏄ㄥぉ') return '鏄?
    // '2026-06-05' -> '6/5'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const m = parseInt(parts[1])
      const d = parseInt(parts[2])
      return m + '/' + d
    }
    return dateStr
  },

  // ==================== 鍒嗙被绛涢€?====================

  // 鍒嗙被绛涢€?  onFilterTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ activeFilter: id })
    this.updateData()
  },

  // ==================== 鏃ユ湡绱㈠紩鏉?====================

  // 缂撳瓨绱㈠紩鏉?boundingClientRect
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

  // 鐐瑰嚮绱㈠紩椤?-> 璺宠浆鍒板搴斿垎缁?  onIndexTap(e) {
    const date = e.currentTarget.dataset.date
    this._jumpToGroup(date)
  },

  // 瑙︽懜寮€濮?+ 绉诲姩锛堝叡鐢級
  onIndexTouchStart(e) {
    this._handleIndexTouch(e)
  },

  onIndexTouchMove(e) {
    this._handleIndexTouch(e)
  },

  // 瑙︽懜缁撴潫 -> 闅愯棌姘旀场銆佹竻闄ら珮浜?  onIndexTouchEnd() {
    this.setData({ activeIndexDate: '' })
    // 1.5绉掑悗闅愯棌姘旀场
    if (this._bubbleTimer) clearTimeout(this._bubbleTimer)
    this._bubbleTimer = setTimeout(() => {
      this.setData({ showBubble: false })
    }, 1500)
  },

  // 鏍规嵁瑙︽懜浣嶇疆璁＄畻鐩爣鍒嗙粍骞惰烦杞?  _handleIndexTouch(e) {
    const touch = e.touches[0]
    if (!touch) return

    const barInfo = this._barInfo
    if (!barInfo) {
      // 杩樻湭缂撳瓨锛岄噸鏂拌幏鍙?      this._cacheIndexBarRect()
      return
    }

    const indexList = this.data.indexList
    if (!indexList || indexList.length === 0) return

    // 璁＄畻瑙︽懜浣嶇疆鍦ㄧ储寮曟潯涓殑姣斾緥
    const relativeY = touch.clientY - barInfo.top
    const ratio = relativeY / barInfo.height

    // 鏍规嵁姣斾緥鎵惧埌瀵瑰簲鐨勭储寮曢」
    const index = Math.round(ratio * (indexList.length - 1))
    const clampedIndex = Math.max(0, Math.min(index, indexList.length - 1))

    const targetItem = indexList[clampedIndex]
    if (!targetItem) return

    // 鑺傛祦锛氱浉鍚屾棩鏈熶笉閲嶅璺宠浆
    if (this.data.activeIndexDate !== targetItem.date) {
      this._jumpToGroup(targetItem.date)
    }
  },

  // 璺宠浆鍒版寚瀹氭棩鏈熷垎缁?  _jumpToGroup(date) {
    const targetId = this._getGroupId(date)

    // scroll-into-view 鐩稿悓鍊奸渶鍏堟竻绌哄啀璁?    if (this.data.scrollIntoView === targetId) {
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

  // 鏄剧ず鏃ユ湡姘旀场
  showDateBubble(date) {
    if (this._bubbleTimer) clearTimeout(this._bubbleTimer)

    // 鎵惧埌瀹屾暣鏃ユ湡鐢ㄤ簬鏄剧ず
    const group = this.data.photoGroups.find(g => g.date === date)
    const displayDate = group ? group.date : date

    this.setData({
      showBubble: true,
      bubbleDate: displayDate
    })
  },

  // 婊氬姩鏃舵洿鏂板綋鍓嶉珮浜殑绱㈠紩椤?  onScroll(e) {
    // 鑺傛祦锛氭瘡 100ms 鏈€澶氭洿鏂颁竴娆?    const now = Date.now()
    if (this._lastScrollTime && now - this._lastScrollTime < 100) return
    this._lastScrollTime = now

    // 鑾峰彇褰撳墠 scrollTop 浣嶇疆锛屾壘鍒板彲瑙嗗尯鍩熼《閮ㄥ搴旂殑鍒嗙粍
    const scrollTop = e.detail.scrollTop
    const query = wx.createSelectorQuery()

    // 鎵惧埌绗竴涓秴杩?scrollTop 鐨勫垎缁?header
    query.selectAll('.group-header').boundingClientRect()
    query.exec((res) => {
      if (!res || !res[0]) return
      const headers = res[0]
      // 鎵惧埌绗竴涓湪鍙鍖哄煙涓婃柟鐨勫垎缁?      let currentDate = ''
      for (let i = headers.length - 1; i >= 0; i--) {
        if (headers[i].top <= 100) {  // 椤堕儴鍋忕Щ
          // 浠?id 瑙ｆ瀽鍑烘棩鏈?          const id = headers[i].id
          if (id === 'group-today') currentDate = '浠婂ぉ'
          else if (id === 'group-yesterday') currentDate = '鏄ㄥぉ'
          else currentDate = id.replace('group-', '')
          break
        }
      }
      if (currentDate && currentDate !== this.data.activeIndexDate) {
        this.setData({ activeIndexDate: currentDate })
      }
    })
  },

  // ==================== 鍏朵粬 ====================

  // 鐐瑰嚮鐓х墖
  onPhotoTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // FAB 鎷嶇収
  onFabTap() {
    wx.switchTab({
      url: '/pages/camera/camera'
    })
  },

  // 鎼滅储锛堟殏鏈疄鐜帮級
  onSearchTap() {
    wx.showToast({ title: '鎼滅储鍔熻兘寮€鍙戜腑', icon: 'none' })
  },

  // 缂╃暐鍥惧姞杞藉け璐?  onThumbError(e) {
    console.warn('缂╃暐鍥惧姞杞藉け璐?, e)
  }
})
