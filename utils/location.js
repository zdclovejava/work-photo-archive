/**
 * 地理位置工具
 * 获取当前位置，支持逆地址编码（需要网络），断网时降级显示GPS坐标
 */

/**
 * 检查并请求定位权限
 * @returns {Promise<boolean>} 是否有权限
 */
function requestLocationAuth() {
  return new Promise((resolve) => {
    wx.getSetting({
      success(res) {
        const auth = res.authSetting['scope.userLocation']
        if (auth === true) {
          resolve(true)
        } else if (auth === false) {
          // 用户之前拒绝过，引导去设置
          wx.showModal({
            title: '需要定位权限',
            content: '请在设置中开启定位权限，才能添加地点水印',
            confirmText: '去设置',
            success(modalRes) {
              if (modalRes.confirm) {
                wx.openSetting({
                  success(settingRes) {
                    resolve(settingRes.authSetting['scope.userLocation'] === true)
                  },
                  fail() { resolve(false) }
                })
              } else {
                resolve(false)
              }
            }
          })
        } else {
          // 首次请求
          wx.authorize({
            scope: 'scope.userLocation',
            success() { resolve(true) },
            fail() { resolve(false) }
          })
        }
      },
      fail() { resolve(false) }
    })
  })
}

/**
 * 获取当前位置
 * @returns {Promise<{ address: string, latitude: number, longitude: number }>}
 */
async function getLocation() {
  // 先检查权限
  const hasAuth = await requestLocationAuth()
  if (!hasAuth) {
    throw new Error('无法获取位置，请检查定位权限')
  }

  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success(res) {
        // 尝试逆地址编码
        reverseGeocode(res.latitude, res.longitude)
          .then(address => {
            resolve({
              address,
              latitude: res.latitude,
              longitude: res.longitude,
              accuracy: res.accuracy
            })
          })
          .catch(() => {
            // 逆地址编码失败，降级显示经纬度
            resolve({
              address: `${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}`,
              latitude: res.latitude,
              longitude: res.longitude,
              accuracy: res.accuracy
            })
          })
      },
      fail(err) {
        console.error('定位失败', err)
        reject(new Error('无法获取位置，请检查定位权限'))
      }
    })
  })
}

/**
 * 腾讯地图逆地址编码
 * 当前使用简单方案：直接返回经纬度
 * 如需详细地址，请接入腾讯位置服务 API（需申请 key）
 */
function reverseGeocode(latitude, longitude) {
  return new Promise((resolve) => {
    // 简单方案：直接返回经纬度（离线可用）
    // 如需详细地址，取消注释并填入你的腾讯地图 key
    /*
    wx.request({
      url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=YOUR_KEY`,
      success(res) {
        if (res.data && res.data.result) {
          const addr = res.data.result.address_component
          resolve(`${addr.province}${addr.city}${addr.district}`)
        } else {
          resolve(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
        }
      },
      fail() {
        resolve(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
      }
    })
    */
    resolve(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
  })
}

/**
 * 格式化地址显示（截断过长地址）
 */
function formatAddress(address, maxLen = 20) {
  if (!address) return '未开启定位'
  if (address.length <= maxLen) return address
  return address.substring(0, maxLen) + '...'
}

module.exports = {
  requestLocationAuth,
  getLocation,
  formatAddress
}
