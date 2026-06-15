/**
 * 存储工具
 * 管理照片元数据（wx.Storage）和缩略图（文件系统）
 */

const KEYS = {
  PHOTOS_INDEX: 'photos_index',
  CATEGORIES: 'categories',
  SETTINGS: 'settings'
}

const THUMB_DIR = `${wx.env.USER_DATA_PATH}/thumbs/`

// ==================== 照片元数据 ====================

// 读取照片列表
function getPhotos() {
  try {
    return wx.getStorageSync(KEYS.PHOTOS_INDEX) || []
  } catch (e) {
    console.error('读取照片列表失败', e)
    return []
  }
}

// 追加新照片
function addPhoto(photo) {
  const photos = getPhotos()
  photos.unshift(photo) // 最新的放最前
  try {
    wx.setStorageSync(KEYS.PHOTOS_INDEX, photos)
    return true
  } catch (e) {
    console.error('保存照片元数据失败', e)
    return false
  }
}

// 按分类筛选照片
function getPhotosByCategory(categoryId) {
  const photos = getPhotos()
  if (!categoryId || categoryId === 'all') return photos
  return photos.filter(p => p.categoryId === categoryId)
}

// 按日期分组（用于照片库展示）
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

  // 按日期降序排列
  return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp)
}

// 删除照片（删除缩略图 + 元数据；系统相册中的原图需用户手动删除）
function deletePhoto(photoId) {
  const fs = wx.getFileSystemManager()
  const photos = getPhotos()
  const target = photos.find(p => p.id === photoId)

  if (target) {
    // 删除缩略图
    if (target.thumbnailPath) {
      try { fs.unlinkSync(target.thumbnailPath) } catch (e) {}
    }
    // 删除元数据
    const newList = photos.filter(p => p.id !== photoId)
    try {
      wx.setStorageSync(KEYS.PHOTOS_INDEX, newList)
      return true
    } catch (e) {
      console.error('删除照片失败', e)
      return false
    }
  }
  return false
}

// 更新照片备注
function updatePhotoNote(photoId, note) {
  const photos = getPhotos()
  const target = photos.find(p => p.id === photoId)
  if (target) {
    target.note = note
    try {
      wx.setStorageSync(KEYS.PHOTOS_INDEX, photos)
      return true
    } catch (e) {
      console.error('更新备注失败', e)
      return false
    }
  }
  return false
}

// ==================== 缩略图管理 ====================

// 确保缩略图目录存在
function ensureThumbDir() {
  const fs = wx.getFileSystemManager()
  try {
    fs.accessSync(THUMB_DIR)
  } catch (e) {
    try { fs.mkdirSync(THUMB_DIR, true) } catch (e2) {}
  }
}

// 生成并保存缩略图（用于列表展示）
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
          console.error('保存缩略图失败', e)
          resolve('')
        }
      },
      fail() {
        resolve('')
      }
    })
  })
}

// 获取缩略图存储占用
function getThumbStorageSize() {
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

// 清理指定天数前的缩略图
function cleanOldThumbnails(daysAgo = 30) {
  const fs = wx.getFileSystemManager()
  const photos = getPhotos()
  const cutoff = Date.now() - daysAgo * 24 * 60 * 60 * 1000

  // 找出需要保留的缩略图（最近N天内的照片）
  const keepIds = new Set(
    photos.filter(p => p.createdAt > cutoff).map(p => p.id)
  )

  try {
    const files = fs.readdirSync(THUMB_DIR)
    let cleaned = 0
    files.forEach(file => {
      // 从文件名提取 photoId（格式：[id]_thumb.jpg）
      const match = file.match(/^(.+?)_thumb\.jpg$/)
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

// ==================== 分类管理 ====================

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

// ==================== 工具函数 ====================

function formatDate(timestamp) {
  const d = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const isToday = d.toDateString() === today.toDateString()
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return '今天'
  if (isYesterday) return '昨天'

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
