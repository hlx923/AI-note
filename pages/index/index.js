// pages/index/index.js
const StorageManager = require('../../utils/storage.js')
const { formatTimeAgo } = require('../../utils/util.js')

Page({
  data: {
    recentNotes: [],
    totalNotes: 0,
    todayNotes: 0,
    totalTags: 0,
    showQuickRecord: false, // 快速录音弹窗
    isQuickRecording: false, // 是否正在快速录音
    quickRecordTime: 0 // 快速录音时长
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  // 加载数据
  loadData() {
    // 获取最近查看的笔记
    const recentNotes = StorageManager.getRecentViews().slice(0, 3).map(note => ({
      ...note,
      timeAgo: formatTimeAgo(note.updateTime || note.createTime)
    }))

    // 获取所有笔记
    const allNotes = StorageManager.getAllNotes()

    // 计算今日新增
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayNotes = allNotes.filter(note => note.createTime >= today.getTime()).length

    // 获取标签数量
    const totalTags = StorageManager.getAllTags().length

    this.setData({
      recentNotes,
      totalNotes: allNotes.length,
      todayNotes,
      totalTags
    })
  },

  // 跳转到语音速记
  goToVoiceRecord() {
    if (!this.checkLogin()) return
    wx.navigateTo({
      url: '/pages/record/voice/voice'
    })
  },

  // 跳转到拍照记笔记
  goToPhotoRecord() {
    if (!this.checkLogin()) return
    wx.navigateTo({
      url: '/pages/record/photo/photo'
    })
  },

  // 跳转到手写涂鸦
  goToHandwrite() {
    if (!this.checkLogin()) return
    wx.navigateTo({
      url: '/pages/record/handwrite/handwrite'
    })
  },

  // 跳转到长文总结
  goToSummary() {
    if (!this.checkLogin()) return
    wx.navigateTo({
      url: '/pages/record/summary/summary'
    })
  },

  // 跳转到文档增强
  goToDocument() {
    if (!this.checkLogin()) return
    wx.navigateTo({
      url: '/pages/record/document/document'
    })
  },

  // 检查登录状态
  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.userId) {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再创建笔记',
        confirmText: '去登录',
        confirmColor: '#4A90E2',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/settings/settings'
            })
          }
        }
      })
      return false
    }
    return true
  },

  // 跳转到笔记详情
  goToNoteDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/note/detail/detail?id=${id}`
    })
  },

  // 跳转到笔记列表
  goToNoteList() {
    wx.switchTab({
      url: '/pages/note/list/list'
    })
  },

  // 显示快速录音弹窗
  showQuickRecordModal() {
    if (!this.checkLogin()) return
    this.setData({
      showQuickRecord: true,
      isQuickRecording: false,
      quickRecordTime: 0
    })
  },

  // 隐藏快速录音弹窗
  hideQuickRecordModal() {
    if (this.isQuickRecording) {
      wx.showModal({
        title: '提示',
        content: '正在录音中，确定要退出吗？',
        success: (res) => {
          if (res.confirm) {
            this.stopQuickRecord()
            this.setData({ showQuickRecord: false })
          }
        }
      })
    } else {
      this.setData({ showQuickRecord: false })
    }
  },

  // 开始快速录音
  startQuickRecord() {
    const recorderManager = wx.getRecorderManager()

    wx.authorize({
      scope: 'scope.record',
      success: () => {
        recorderManager.start({
          duration: 60000,
          format: 'mp3'
        })

        this.setData({
          isQuickRecording: true,
          quickRecordTime: 0
        })

        // 开始计时
        this.quickRecordTimer = setInterval(() => {
          this.setData({
            quickRecordTime: this.data.quickRecordTime + 1
          })
        }, 1000)

        // 录音结束回调
        recorderManager.onStop((res) => {
          clearInterval(this.quickRecordTimer)
          this.handleQuickRecordComplete(res.tempFilePath)
        })
      },
      fail: () => {
        wx.showModal({
          title: '需要录音权限',
          content: '请在设置中开启录音权限',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  // 停止快速录音
  stopQuickRecord() {
    const recorderManager = wx.getRecorderManager()
    recorderManager.stop()
    clearInterval(this.quickRecordTimer)
    this.setData({
      isQuickRecording: false
    })
  },

  // 处理录音完成
  async handleQuickRecordComplete(tempFilePath) {
    wx.showLoading({ title: '正在识别...' })

    try {
      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: `voice/${Date.now()}.mp3`,
        filePath: tempFilePath
      })

      // 调用云函数识别
      const result = await wx.cloud.callFunction({
        name: 'voiceRecognition',
        data: {
          fileID: uploadResult.fileID
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        // 保存为灵感笔记
        const note = {
          title: `【灵感】${result.result.text.substring(0, 15)}...`,
          content: result.result.text,
          tag: '灵感',
          keywords: ['灵感', '快速记录'],
          type: 'quick-voice'
        }

        const savedNote = StorageManager.saveNote(note)

        if (savedNote) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          this.setData({ showQuickRecord: false })
          this.loadData()
        }
      } else {
        wx.showToast({
          title: '识别失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '录音失败',
        icon: 'none'
      })
    }
  },

  // 格式化时间显示
  formatQuickTime(seconds) {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  },

  // 分享
  onShareAppMessage() {
    return {
      title: 'AI笔记助手 - 轻量录入，智能规整',
      path: '/pages/index/index'
    }
  }
})
