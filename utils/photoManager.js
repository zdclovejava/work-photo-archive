/**
 * 鐓х墖绠＄悊宸ュ叿
 * 澶勭悊鎷嶇収銆佷繚瀛樺埌鐩稿唽銆佺缉鐣ュ浘鐢熸垚
 */

const storage = require('./storage')
const idGenerator = require('./idGenerator')

/**
 * 鎷嶇収鎴栭€夋嫨鐩稿唽鍥剧墖
 * @param {'camera' | 'album'} sourceType
 * @returns {Promise<string>} 涓存椂鏂囦欢璺緞
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
          reject(new Error('鏈€夋嫨鍥剧墖'))
        }
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

/**
 * 妫€鏌ュ苟璇锋眰淇濆瓨鍒扮浉鍐岀殑鏉冮檺
 * @returns {Promise<boolean>} 鏄惁鏈夋潈闄? */
function requestAlbumAuth() {
  return new Promise((resolve) => {
    wx.getSetting({
      success(res) {
        const auth = res.authSetting['scope.writePhotosAlbum']
        if (auth === true) {
          resolve(true)
        } else if (auth === false) {
          // 鐢ㄦ埛涔嬪墠鎷掔粷杩囷紝寮曞鍘昏缃〉寮€鍚?          wx.showModal({
            title: '闇€瑕佺浉鍐屾潈闄?,
            content: '璇峰湪璁剧疆涓紑鍚?淇濆瓨鍒扮浉鍐?鏉冮檺锛屾墠鑳戒繚瀛樼収鐗?,
            confirmText: '鍘昏缃?,
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
          // 棣栨璇锋眰
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
 * 淇濆瓨甯︽按鍗扮殑鐓х墖鍒扮郴缁熺浉鍐? * @param {string} watermarkedTempPath - 甯︽按鍗板浘鐗囩殑涓存椂璺緞
 * @returns {Promise<boolean>} 鏄惁淇濆瓨鎴愬姛
 */
async function saveToAlbum(watermarkedTempPath) {
  // 鍏堣姹傛潈闄?  const hasAuth = await requestAlbumAuth()
  if (!hasAuth) {
    wx.showToast({ title: '闇€瑕佺浉鍐屾潈闄愭墠鑳戒繚瀛?, icon: 'none' })
    return false
  }

  return new Promise((resolve) => {
    wx.saveImageToPhotosAlbum({
      filePath: watermarkedTempPath,
      success() {
        resolve(true)
      },
      fail(err) {
        console.error('淇濆瓨鍒扮浉鍐屽け璐?, err)
        resolve(false)
      }
    })
  })
}

/**
 * 瀹屾暣淇濆瓨娴佺▼锛? * 1. 鑾峰彇涓存椂鍥剧墖璺緞
 * 2. 鍚堟垚姘村嵃
 * 3. 淇濆瓨鍒扮郴缁熺浉鍐? * 4. 鐢熸垚缂╃暐鍥? * 5. 淇濆瓨鍏冩暟鎹? * @param {string} tempPath - 鍘熷浘涓存椂璺緞
 * @param {object} photoData - 鐓х墖鏁版嵁
 * @returns {Promise<object>} 淇濆瓨缁撴灉
 */
async function savePhoto(tempPath, photoData) {
  const { categoryId, watermark, note = '' } = photoData
  const photoId = idGenerator.generateId()

  // 鑾峰彇鍒嗙被鍚嶇О
  const categories = storage.getCategories()
  const category = categories.find(c => c.id === categoryId)
  const categoryName = category ? category.name : ''

  // 鑾峰彇浣嶇疆淇℃伅锛堝鏋滃紑鍚簡鍦扮偣姘村嵃锛?  let locationText = null
  if (watermark.location) {
    try {
      const location = require('./location')
      const loc = await location.getLocation()
      locationText = loc.address
    } catch (e) {
      locationText = '鏈紑鍚畾浣?
    }
  }

  // 鍚堟垚姘村嵃
  const watermarkedPath = await require('./watermark').applyWatermark(tempPath, {
    timeWatermark: watermark.time !== false,
    locationText,
    categoryName: watermark.showCategory ? categoryName : null,
    customText: watermark.customText || null,
    position: getApp().globalData.settings.watermarkPosition || 'leftBottom',
    opacity: getApp().globalData.settings.watermarkOpacity || 70
  })

  // 淇濆瓨鍒扮郴缁熺浉鍐?  const savedToAlbum = await saveToAlbum(watermarkedPath)

  if (!savedToAlbum) {
    console.warn('淇濆瓨鍒扮郴缁熺浉鍐屽け璐ワ紝浣嗗厓鏁版嵁浠嶄細淇濆瓨')
  }

  // 鐢熸垚缂╃暐鍥?  const thumbnailPath = await storage.saveThumbnail(watermarkedPath, photoId)

  // 淇濆瓨鍏冩暟鎹?  const photo = {
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
    title: savedToAlbum ? '宸蹭繚瀛樺埌鐩稿唽' : '宸蹭繚瀛橈紙鐩稿唽鏉冮檺鏈紑鍚級',
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
