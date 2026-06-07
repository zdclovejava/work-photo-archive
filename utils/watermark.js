/**
 * 姘村嵃鍚堟垚宸ュ叿
 * 浣跨敤 WXML Canvas + wx.canvasToTempFilePath 鍚堟垚姘村嵃
 * 鏀寔闄嶇骇锛欳anvas 涓嶅彲鐢ㄦ椂鐩存帴杩斿洖鍘熷浘
 */

const app = getApp()

/**
 * 鍚堟垚甯︽按鍗扮殑鍥剧墖
 * @param {string} src - 鍘熷浘涓存椂璺緞
 * @param {object} options - 姘村嵃閫夐」
 * @returns {Promise<string>} 鍚堟垚鍚庣殑涓存椂鏂囦欢璺緞
 */
function applyWatermark(src, options = {}) {
  const {
    timeWatermark = true,
    locationText = null,
    categoryName = null,
    customText = null,
    position = 'leftBottom',
    opacity = 70
  } = options

  return new Promise((resolve) => {
    // 鑾峰彇鍥剧墖淇℃伅
    wx.getImageInfo({
      src,
      success(imgInfo) {
        const { width, height } = imgInfo
        // 闄愬埗鏈€澶у昂瀵革紝閬垮厤Canvas鍐呭瓨婧㈠嚭
        const MAX_SIZE = 4096
        let scale = 1
        if (width > MAX_SIZE || height > MAX_SIZE) {
          scale = MAX_SIZE / Math.max(width, height)
        }
        const canvasW = Math.round(width * scale)
        const canvasH = Math.round(height * scale)

        // 鍒涘缓绂诲睆 Canvas锛堝熀纭€搴?2.16.1+锛?        // 濡傛灉涓嶆敮鎸侊紝闄嶇骇杩斿洖鍘熷浘
        try {
          const canvas = wx.createOffscreenCanvas({ type: '2d', width: canvasW, height: canvasH })
          const ctx = canvas.getContext('2d')

          // 鍒涘缓 Image 瀵硅薄
          const img = canvas.createImage()
          img.onload = () => {
            // 缁樺埗鍘熷浘
            ctx.drawImage(img, 0, 0, canvasW, canvasH)

            // 缁樺埗姘村嵃
            drawWatermarkOnCanvas(ctx, canvasW, canvasH, {
              timeWatermark, locationText, categoryName, customText, position, opacity
            })

            // 瀵煎嚭涓轰复鏃舵枃浠?            try {
              wx.canvasToTempFilePath({
                canvas,
                x: 0, y: 0,
                width: canvasW, height: canvasH,
                destWidth: canvasW, destHeight: canvasH,
                fileType: 'jpg',
                quality: 0.9,
                success(res) {
                  resolve(res.tempFilePath)
                },
                fail(err) {
                  console.error('瀵煎嚭姘村嵃鍥剧墖澶辫触', err)
                  resolve(src) // 闄嶇骇杩斿洖鍘熷浘
                }
              })
            } catch (err) {
              console.error('canvasToTempFilePath 寮傚父', err)
              resolve(src)
            }
          }
          img.onerror = (err) => {
            console.error('Canvas 鍔犺浇鍥剧墖澶辫触', err)
            resolve(src)
          }
          img.src = src
        } catch (err) {
          console.error('createOffscreenCanvas 涓嶆敮鎸侊紝闄嶇骇杩斿洖鍘熷浘', err)
          resolve(src)
        }
      },
      fail(err) {
        console.error('鑾峰彇鍥剧墖淇℃伅澶辫触', err)
        resolve(src)
      }
    })
  })
}

/**
 * 鍦?Canvas 涓婄粯鍒舵按鍗? */
function drawWatermarkOnCanvas(ctx, width, height, options) {
  const { timeWatermark, locationText, categoryName, customText, position, opacity } = options

  const padding = Math.max(16, width * 0.02)
  const lineHeight = Math.max(22, height * 0.025)

  // 浣嶇疆閰嶇疆
  const posConfig = {
    leftBottom:  { align: 'left',  bottom: true  },
    rightBottom: { align: 'right', bottom: true  },
    leftTop:     { align: 'left',  bottom: false },
    rightTop:    { align: 'right', bottom: false }
  }
  const pos = posConfig[position] || posConfig.leftBottom

  // 鏀堕泦姘村嵃琛?  const lines = []

  if (timeWatermark) {
    lines.push({
      text: formatTime(new Date()),
      fontSize: Math.max(12, height * 0.014),
      color: 'rgba(255,255,255,0.95)',
      bgColor: null
    })
  }

  if (locationText) {
    lines.push({
      text: locationText,
      fontSize: Math.max(11, height * 0.013),
      color: 'rgba(255,255,255,0.9)',
      bgColor: null
    })
  }

  if (categoryName) {
    lines.push({
      text: categoryName,
      fontSize: Math.max(10, height * 0.011),
      color: '#fff',
      bgColor: 'rgba(7,193,96,0.85)'
    })
  }

  if (customText) {
    lines.push({
      text: customText,
      fontSize: Math.max(11, height * 0.013),
      color: 'rgba(255,255,255,0.85)',
      bgColor: null
    })
  }

  if (lines.length === 0) return

  // 璁＄畻姘村嵃鍖哄煙澶у皬
  let maxWidth = 0
  lines.forEach(line => {
    ctx.font = `${line.fontSize}px sans-serif`
    const textWidth = ctx.measureText ? ctx.measureText(line.text).width : line.text.length * line.fontSize * 0.6
    if (textWidth > maxWidth) maxWidth = textWidth
  })

  const watermarkWidth = maxWidth + padding * 2
  const watermarkHeight = lines.length * lineHeight + padding

  // 璁＄畻璧峰浣嶇疆
  let bgX = pos.align === 'right' ? width - watermarkWidth - padding : padding
  let bgY = pos.bottom ? height - watermarkHeight - padding : padding

  // 缁樺埗鍗婇€忔槑鑳屾櫙
  ctx.fillStyle = `rgba(0,0,0,${(opacity / 100) * 0.5})`
  roundRect(ctx, bgX, bgY, watermarkWidth, watermarkHeight, 6)
  ctx.fill()

  // 閫愯缁樺埗姘村嵃鏂囧瓧
  let currentY = bgY + padding * 0.8 + lineHeight * 0.4
  lines.forEach(line => {
    // 缁樺埗鍒嗙被鏍囩鑳屾櫙
    if (line.bgColor) {
      ctx.font = `500 ${line.fontSize}px sans-serif`
      const tagWidth = (ctx.measureText ? ctx.measureText(line.text).width : line.text.length * line.fontSize * 0.6) + 12
      const tagX = pos.align === 'right' ? bgX + watermarkWidth - tagWidth - padding * 0.5 : bgX + padding * 0.5
      ctx.fillStyle = line.bgColor
      roundRect(ctx, tagX, currentY - line.fontSize * 0.6, tagWidth, line.fontSize * 1.5, 3)
      ctx.fill()
    }

    ctx.fillStyle = line.color
    ctx.font = line.bgColor ? `500 ${line.fontSize}px sans-serif` : `${line.fontSize}px sans-serif`
    ctx.textAlign = pos.align === 'right' ? 'right' : 'left'
    const textX = pos.align === 'right' ? bgX + watermarkWidth - padding * 0.5 : bgX + padding * 0.5
    ctx.fillText(line.text, textX, currentY)
    currentY += lineHeight
  })
}

// 缁樺埗鍦嗚鐭╁舰
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 鏍煎紡鍖栨椂闂?function formatTime(date) {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  const h = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

module.exports = {
  applyWatermark
}
