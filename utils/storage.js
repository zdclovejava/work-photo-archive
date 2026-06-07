/**
 * 瀛樺偍宸ュ叿
 * 绠＄悊鐓х墖鍏冩暟鎹紙wx.Storage锛夊拰缂╃暐鍥撅紙鏂囦欢绯荤粺锛? */

const KEYS = {
  PHOTOS_INDEX: 'photos_index',
  CATEGORIES: 'categories',
  SETTINGS: 'settings'
}

const THUMB_DIR = `${wx.env.USER_DATA_PATH}/thumbs/`

// ==================== 鐓х墖鍏冩暟鎹?====================

// 璇诲彇鐓х墖鍒楄〃
function getPhotos() {
  try {
    return wx.getStorageSync(KEYS.PHOTOS_INDEX) || []
  } catch (e) {
    console.error('璇诲彇鐓х墖鍒楄〃澶辫触', e)
    return []
  }
}

// 杩藉姞鏂扮収鐗?function addPhoto(photo) {
  const photos = getPhotos()
  photos.unshift(photo) // 鏈€鏂扮殑鏀炬渶鍓?  try {
    wx.setStorageSync(KEYS.PHOTOS_INDEX, photos)
    return true
  } catch (e) {
    console.error('淇濆瓨鐓х墖鍏冩暟鎹け璐?, e)
    return false
  }
}

// 鎸夊垎绫荤瓫閫夌収鐗?function getPhotosByCategory(categoryId) {
  const photos = getPhotos()
  if (!categoryId || categoryId === 'all') return photos
  return photos.filter(p => p.categoryId === categoryId)
}

// 鎸夋棩鏈熷垎缁勶紙鐢ㄤ簬鐓х墖搴撳睍绀猴級
function getPhotosGrouped(categoryId) {
  const photos = getPhotosByCategory(categoryId)
  const groups = {}

  photos.forEach(photo => {
    const date = formatDate(photo.createdAt)
    if (!groups[date]) {
      groups[date] = { date, timestamp: photo.createdAt, photos: [] }
    }
    groups[date].photos.push(photo)
  })

  // 鎸夋棩鏈熼檷搴忔帓鍒?  return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp)
}

// 鍒犻櫎鐓х墖锛堝垹闄ょ缉鐣ュ浘 + 鍏冩暟鎹紱绯荤粺鐩稿唽涓殑鍘熷浘闇€鐢ㄦ埛鎵嬪姩鍒犻櫎锛?function deletePhoto(photoId) {
  const fs = wx.getFileSystemManager()
  const photos = getPhotos()
  const target = photos.find(p => p.id === photoId)

  if (target) {
    // 鍒犻櫎缂╃暐鍥?    if (target.thumbnailPath) {
      try { fs.unlinkSync(target.thumbnailPath) } catch (e) {}
    }
    // 鍒犻櫎鍏冩暟鎹?    const newList = photos.filter(p => p.id !== photoId)
    try {
      wx.setStorageSync(KEYS.PHOTOS_INDEX, newList)
      return true
    } catch (e) {
      console.error('鍒犻櫎鐓х墖澶辫触', e)
      return false
    }
  }
  return false
}

// 鏇存柊鐓х墖澶囨敞
function updatePhotoNote(photoId, note) {
  const photos = getPhotos()
  const target = photos.find(p => p.id === photoId)
  if (target) {
    target.note = note
    try {
      wx.setStorageSync(KEYS.PHOTOS_INDEX, photos)
      return true
    } catch (e) {
      console.error('鏇存柊澶囨敞澶辫触', e)
      return false
    }
  }
  return false
}

// ==================== 缂╃暐鍥剧鐞?====================

// 纭繚缂╃暐鍥剧洰褰曞瓨鍦?function ensureThumbDir() {
  const fs = wx.getFileSystemManager()
  try {
    fs.accessSync(THUMB_DIR)
  } catch (e) {
    try { fs.mkdirSync(THUMB_DIR, true) } catch (e2) {}
  }
}

// 鐢熸垚骞朵繚瀛樼缉鐣ュ浘锛堢敤浜庡垪琛ㄥ睍绀猴級
function saveThumbnail(tempFilePath, photoId) {
  ensureThumbDir()
  const fs = wx.getFileSystemManager()
  const thumbPath = `${THUMB_DIR}${photoId}_thumb.jpg`

  return new Promise((resolve) => {
    wx.compressImage({
      src: tempFilePath,
      quality: 30,
      success(res) {
        try {
          fs.copyFileSync(res.tempFilePath, thumbPath)
          resolve(thumbPath)
        } catch (e) {
          console.error('淇濆瓨缂╃暐鍥惧け璐?, e)
          resolve('')
        }
      },
      fail() {
        resolve('')
      }
    })
  })
}

// 鑾峰彇缂╃暐鍥惧瓨鍌ㄥ崰鐢?function getThumbStorageSize() {
  const fs = wx.getFileSystemManager()
  try {
    const files = fs.readdirSync(THUMB_DIR)
    let total = 0
    files.forEach(file => {
      try {
        const stat = fs.statSync(THUMB_DIR + file)
        total += stat.size
      } catch (e) {}
    })
    return total
  } catch (e) {
    return 0
  }
}

// 娓呯悊鎸囧畾澶╂暟鍓嶇殑缂╃暐鍥?function cleanOldThumbnails(daysAgo = 30) {
  const fs = wx.getFileSystemManager()
  const photos = getPhotos()
  const cutoff = Date.now() - daysAgo * 24 * 60 * 60 * 1000

  // 鎵惧嚭闇€瑕佷繚鐣欑殑缂╃暐鍥撅紙鏈€杩慛澶╁唴鐨勭収鐗囷級
  const keepIds = new Set(
    photos.filter(p => p.createdAt > cutoff).map(p => p.id)
  )

  try {
    const files = fs.readdirSync(THUMB_DIR)
    let cleaned = 0
    files.forEach(file => {
      // 浠庢枃浠跺悕鎻愬彇 photoId锛堟牸寮忥細[id]_thumb.jpg锛?      const match = file.match(/^(.+?)_thumb\.jpg$/)
      if (match && !keepIds.has(match[1])) {
        try {
          fs.unlinkSync(THUMB_DIR + file)
          cleaned++
        } catch (e) {}
      }
    })
    return cleaned
  } catch (e) {
    return 0
  }
}

// ==================== 鍒嗙被绠＄悊 ====================

function getCategories() {
  const app = getApp()
  return app.globalData.settings.categories || []
}

function addCategory(name, color) {
  const app = getApp()
  const id = 'cat_' + Date.now()
  app.globalData.settings.categories.push({ id, name, color })
  app.saveSettings()
  return id
}

function removeCategory(categoryId) {
  const app = getApp()
  app.globalData.settings.categories =
    app.globalData.settings.categories.filter(c => c.id !== categoryId)
  app.saveSettings()
}

// ==================== 宸ュ叿鍑芥暟 ====================

function formatDate(timestamp) {
  const d = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const isToday = d.toDateString() === today.toDateString()
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return '浠婂ぉ'
  if (isYesterday) return '鏄ㄥぉ'

  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function formatStorageSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

module.exports = {
  KEYS,
  getPhotos,
  addPhoto,
  getPhotosByCategory,
  getPhotosGrouped,
  deletePhoto,
  updatePhotoNote,
  saveThumbnail,
  getThumbStorageSize,
  cleanOldThumbnails,
  getCategories,
  addCategory,
  removeCategory,
  formatDate,
  formatStorageSize
}
