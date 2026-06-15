/**
 * 水印合成工具
 * 使用 WXML Canvas + wx.canvasToTempFilePath 合成水印
 * 支持降级：Canvas 不可用时直接返回原图
 */

const app = getApp()

/**
 * 合成带水印的图片
 * @param {string} src - 原图临时路径
 * @param {object} options - 水印选项
 * @returns {Promise<string>} 合成后的临时文件路径
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
    // 获取图片信息
    wx.getImageInfo({
      src,
      success(imgInfo) {
        const { width, height } = imgInfo
        // 限制最大尺寸，避免Canvas内存溢出
        const MAX_SIZE = 4096
        let scale = 1
        if (width > MAX_SIZE || height > MAX_SIZE) {
          scale = MAX_SIZE / Math.max(width, height)
        }
        const canvasW = Math.round(width * scale)
        const canvasH = Math.round(height * scale)

        // 创建离屏 Canvas（基础库 2.16.1+）
        // 如果不支持，降级返回原图
        try {
          const canvas = wx.createOffscreenCanvas({ type: '2d', width: canvasW, height: canvasH })
          const ctx = canvas.getContext('2d')

          // 创建 Image 对象
          const img = canvas.createImage()
          img.onload = () => {
            // 绘制原图
            ctx.drawImage(img, 0, 0, canvasW, canvasH)

            // 绘制水印
            drawWatermarkOnCanvas(ctx, canvasW, canvasH, {
              timeWatermark, locationText, categoryName, customText, position, opacity
            })

            // 导出为临时文件
            try {
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
                  console.error('导出水印图片失败', err)
                  resolve(src) // 降级返回原图
                }
              })
            } catch (err) {
              console.error('canvasToTempFilePath 异常', err)
              resolve(src)
            }
          }
          img.onerror = (err) => {
            console.error('Canvas 加载图片失败', err)
            resolve(src)
          }
          img.src = src
        } catch (err) {
          console.error('createOffscreenCanvas 不支持，降级返回原图', err)
          resolve(src)
        }
      },
      fail(err) {
        console.error('获取图片信息失败', err)
        resolve(src)
      }
    })
  })
}

/**
 * 在 Canvas 上绘制水印
 */
function drawWatermarkOnCanvas(ctx, width, height, options) {
  const { timeWatermark, locationText, categoryName, customText, position, opacity } = options

  const padding = Math.max(16, width * 0.02)
  const lineHeight = Math.max(22, height * 0.025)

  // 位置配置
  const posConfig = {
    leftBottom:  { align: 'left',  bottom: true  },
    rightBottom: { align: 'right', bottom: true  },
    leftTop:     { align: 'left',  bottom: false },
    rightTop:    { align: 'right', bottom: false }
  }
  const pos = posConfig[position] || posConfig.leftBottom

  // 收集水印行
  const lines = []

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

  // 计算水印区域大小
  let maxWidth = 0
  lines.forEach(line => {
    ctx.font = `${line.fontSize}px sans-serif`
    const textWidth = ctx.measureText ? ctx.measureText(line.text).width : line.text.length * line.fontSize * 0.6
    if (textWidth > maxWidth) maxWidth = textWidth
  })

  const watermarkWidth = maxWidth + padding * 2
  const watermarkHeight = lines.length * lineHeight + padding

  // 计算起始位置
  let bgX = pos.align === 'right' ? width - watermarkWidth - padding : padding
  let bgY = pos.bottom ? height - watermarkHeight - padding : padding

  // 绘制半透明背景
  ctx.fillStyle = `rgba(0,0,0,${(opacity / 100) * 0.5})`
  roundRect(ctx, bgX, bgY, watermarkWidth, watermarkHeight, 6)
  ctx.fill()

  // 逐行绘制水印文字
  let currentY = bgY + padding * 0.8 + lineHeight * 0.4
  lines.forEach(line => {
    // 绘制分类标签背景
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

// 绘制圆角矩形
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 格式化时间
function formatTime(date) {
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
