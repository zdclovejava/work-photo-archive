/**
 * 鍦扮悊浣嶇疆宸ュ叿
 * 鑾峰彇褰撳墠浣嶇疆锛屾敮鎸侀€嗗湴鍧€缂栫爜锛堥渶瑕佺綉缁滐級锛屾柇缃戞椂闄嶇骇鏄剧ずGPS鍧愭爣
 */

/**
 * 妫€鏌ュ苟璇锋眰瀹氫綅鏉冮檺
 * @returns {Promise<boolean>} 鏄惁鏈夋潈闄? */
function requestLocationAuth() {
  return new Promise((resolve) => {
    wx.getSetting({
      success(res) {
        const auth = res.authSetting['scope.userLocation']
        if (auth === true) {
          resolve(true)
        } else if (auth === false) {
          // 鐢ㄦ埛涔嬪墠鎷掔粷杩囷紝寮曞鍘昏缃?          wx.showModal({
            title: '闇€瑕佸畾浣嶆潈闄?,
            content: '璇峰湪璁剧疆涓紑鍚畾浣嶆潈闄愶紝鎵嶈兘娣诲姞鍦扮偣姘村嵃',
            confirmText: '鍘昏缃?,
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
          // 棣栨璇锋眰
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
 * 鑾峰彇褰撳墠浣嶇疆
 * @returns {Promise<{ address: string, latitude: number, longitude: number }>}
 */
async function getLocation() {
  // 鍏堟鏌ユ潈闄?  const hasAuth = await requestLocationAuth()
  if (!hasAuth) {
    throw new Error('鏃犳硶鑾峰彇浣嶇疆锛岃妫€鏌ュ畾浣嶆潈闄?)
  }

  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success(res) {
        // 灏濊瘯閫嗗湴鍧€缂栫爜
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
            // 閫嗗湴鍧€缂栫爜澶辫触锛岄檷绾ф樉绀虹粡绾害
            resolve({
              address: `${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}`,
              latitude: res.latitude,
              longitude: res.longitude,
              accuracy: res.accuracy
            })
          })
      },
      fail(err) {
        console.error('瀹氫綅澶辫触', err)
        reject(new Error('鏃犳硶鑾峰彇浣嶇疆锛岃妫€鏌ュ畾浣嶆潈闄?))
      }
    })
  })
}

/**
 * 鑵捐鍦板浘閫嗗湴鍧€缂栫爜
 * 褰撳墠浣跨敤绠€鍗曟柟妗堬細鐩存帴杩斿洖缁忕含搴? * 濡傞渶璇︾粏鍦板潃锛岃鎺ュ叆鑵捐浣嶇疆鏈嶅姟 API锛堥渶鐢宠 key锛? */
function reverseGeocode(latitude, longitude) {
  return new Promise((resolve) => {
    // 绠€鍗曟柟妗堬細鐩存帴杩斿洖缁忕含搴︼紙绂荤嚎鍙敤锛?    // 濡傞渶璇︾粏鍦板潃锛屽彇娑堟敞閲婂苟濉叆浣犵殑鑵捐鍦板浘 key
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
 * 鏍煎紡鍖栧湴鍧€鏄剧ず锛堟埅鏂繃闀垮湴鍧€锛? */
function formatAddress(address, maxLen = 20) {
  if (!address) return '鏈紑鍚畾浣?
  if (address.length <= maxLen) return address
  return address.substring(0, maxLen) + '...'
}

module.exports = {
  requestLocationAuth,
  getLocation,
  formatAddress
}
