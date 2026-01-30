// app.js
App({
  onLaunch() {
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true
      })
    }

    // 检查本地存储
    this.initLocalStorage()

    // 获取系统信息
    this.getSystemInfo()
  },

  // 初始化本地存储
  initLocalStorage() {
    const notes = wx.getStorageSync('notes')
    if (!notes) {
      wx.setStorageSync('notes', [])
    }

    const tags = wx.getStorageSync('tags')
    if (!tags) {
      wx.setStorageSync('tags', ['学习', '工作', '生活', '灵感'])
    }

    const recentViews = wx.getStorageSync('recentViews')
    if (!recentViews) {
      wx.setStorageSync('recentViews', [])
    }
  },

  // 获取系统信息
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res
        this.globalData.statusBarHeight = res.statusBarHeight
        this.globalData.navBarHeight = res.statusBarHeight + 44
      }
    })
  },

  globalData: {
    userInfo: null,
    systemInfo: null,
    statusBarHeight: 0,
    navBarHeight: 0,
    // API配置
    apiConfig: {
      // 百度OCR API
      baiduOCR: {
        apiKey: 'GZGnYAGwGfQQGvGZvAjGZvGZGZGZGZGZ',
        secretKey: 'GZGZGZGZGZGZGZGZGZGZGZGZGZGZGZGv'
      },
      // 语音转写API（可使用微信原生或第三方）
      voiceAPI: {
        appId: 'YOUR_VOICE_APP_ID'
      }
    }
  }
})
