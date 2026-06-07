/**
 * ID 鐢熸垚宸ュ叿
 * 鐢熸垚鏍煎紡锛氭椂闂存埑_闅忔満瀛楃涓诧紝濡?"1717636800000_abc12d"
 */

function generateId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}_${random}`
}

module.exports = {
  generateId
}
