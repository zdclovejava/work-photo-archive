/**
 * 照片管理工具
 * 处理拍照、保存到相册、缩略图生成
 */

const storage = require('./storage')
const idGenerator = require('./idGenerator')

/**
 * 拍照或选择相册图片
 * @param {'camera' | 'album'} sourceType
 * @returns {Promise<string>} 临时文件路径
 */
function chooseImage(sourceType = 'camera') {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: [sourceType],
      camera: 'back',
      success(res) {
        if (res.tempFiles && res.tempFiles.length > 0) {
          resolve(res.tempFiles[0].tempFilePath)
        } else {
          reject(new Error('未选择图片'))
        }
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

/**
 * 检查并请求保存到相册的权限
 * @returns {Promise<boolean>} 是否有权限
 */
function requestAlbumAuth() {
  return new Promise((resolve) => {
    wx.getSetting({
      success(res) {
        const auth = res.authSetting['scope.writePhotosAlbum']
        if (auth === true) {
          resolve(true)
        } else if (auth === false) {
          // 用户之前拒绝过，引导去设置页开启
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中开启"保存到相册"权限，才能保存照片',
            confirmText: '去设置',
            success(modalRes) {
              if (modalRes.confirm) {
                wx.openSetting({
                  success(settingRes) {
                    resolve(settingRes.authSetting['scope.writePhotosAlbum'] === true)
                  },
                  fail() {
                    resolve(false)
                  }
                })
              } else {
                resolve(false)
              }
            }
          })
        } else {
          // 首次请求
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
              success() {
                resolve(true)
              },
              fail() {
                resolve(false)
              }
          })
        }
      },
      fail() {
        resolve(false)
      }
    })
  })
}

/**
 * 保存带水印的照片到系统相册
 * @param {string} watermarkedTempPath - 带水印图片的临时路径
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveToAlbum(watermarkedTempPath) {
  // 先请求权限
  const hasAuth = await requestAlbumAuth()
  if (!hasAuth) {
    wx.showToast({ title: '需要相册权限才能保存', icon: 'none' })
    return false
  }

  return new Promise((resolve) => {
    wx.saveImageToPhotosAlbum({
      filePath: watermarkedTempPath,
      success() {
        resolve(true)
      },
      fail(err) {
        console.error('保存到相册失败', err)
        resolve(false)
      }
    })
  })
}

/**
 * 完整保存流程：
 * 1. 获取临时图片路径
 * 2. 合成水印
 * 3. 保存到系统相册
 * 4. 生成缩略图
 * 5. 保存元数据
 * @param {string} tempPath - 原图临时路径
 * @param {object} photoData - 照片数据
 * @returns {Promise<object>} 保存结果
 */
async function savePhoto(tempPath, photoData) {
  const { categoryId, watermark, note = '' } = photoData
  const photoId = idGenerator.generateId()

  // 获取分类名称
  const categories = storage.getCategories()
  const category = categories.find(c => c.id === categoryId)
  const categoryName = category ? category.name : ''

  // 获取位置信息（如果开启了地点水印）
  let locationText = null
  if (watermark.location) {
    try {
      const location = require('./location')
      const loc = await location.getLocation()
      locationText = loc.address
    } catch (e) {
      locationText = '未开启定位'
    }
  }

  // 合成水印
  const watermarkedPath = await require('./watermark').applyWatermark(tempPath, {
    timeWatermark: watermark.time !== false,
    locationText,
    categoryName: watermark.showCategory ? categoryName : null,
    customText: watermark.customText || null,
    position: getApp().globalData.settings.watermarkPosition || 'leftBottom',
    opacity: getApp().globalData.settings.watermarkOpacity || 70
  })

  // 保存到系统相册
  const savedToAlbum = await saveToAlbum(watermarkedPath)

  if (!savedToAlbum) {
    console.warn('保存到系统相册失败，但元数据仍会保存')
  }

  // 生成缩略图
  const thumbnailPath = await storage.saveThumbnail(watermarkedPath, photoId)

  // 保存元数据
  const photo = {
    id: photoId,
    thumbnailPath,
    categoryId,
    createdAt: Date.now(),
    savedToAlbum,
    watermark: {
      time: watermark.time !== false ? formatTime(new Date()) : null,
      location: locationText,
      customText: watermark.customText || null,
      showCategory: watermark.showCategory || false
    },
    note
  }

  storage.addPhoto(photo)

  wx.showToast({
    title: savedToAlbum ? '已保存到相册' : '已保存（相册权限未开启）',
    icon: savedToAlbum ? 'success' : 'none',
    duration: 1500
  })

  return photo
}

function formatTime(date) {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  const h = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

module.exports = {
  chooseImage,
  requestAlbumAuth,
  saveToAlbum,
  savePhoto
}
