/**
 * ID 生成工具
 * 生成格式：时间戳_随机字符串，如 "1717636800000_abc12d"
 */

function generateId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}_${random}`
}

module.exports = {
  generateId
}
