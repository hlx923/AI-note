// pages/index/index.js
const StorageManager = require('../../utils/storage.js')
const { formatTimeAgo } = require('../../utils/util.js')

Page({
  data: {
    recentNotes: [],
    totalNotes: 0,
    todayNotes: 0,
    totalTags: 0
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

  // 分享
  onShareAppMessage() {
    return {
      title: 'AI笔记助手 - 轻量录入，智能规整',
      path: '/pages/index/index'
    }
  }
})
