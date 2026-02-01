// pages/index/index.js
const StorageManager = require('../../utils/storage.js')
const { formatTimeAgo } = require('../../utils/util.js')

Page({
  data: {
    recentNotes: [],
    totalNotes: 0,
    todayNotes: 0,
    totalTags: 0,
    showQuickRecord: false, // 快速待办弹窗
    quickTodoContent: '', // 待办内容
    quickRecordTime: '', // 记录时间
    quickTodoTag: '待办' // 待办标签
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

  // 跳转到模板笔记
  goToTemplate() {
    if (!this.checkLogin()) return
    wx.navigateTo({
      url: '/pages/record/template/template'
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

  // 显示快速待办弹窗
  showQuickRecordModal() {
    if (!this.checkLogin()) return

    // 获取当前时间
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    const timeStr = `${year}-${month}-${day} ${hour}:${minute}`

    this.setData({
      showQuickRecord: true,
      quickTodoContent: '',
      quickRecordTime: timeStr,
      quickTodoTag: '待办'
    })
  },

  // 隐藏快速待办弹窗
  hideQuickRecordModal() {
    this.setData({
      showQuickRecord: false,
      quickTodoContent: ''
    })
  },

  // 阻止事件冒泡的空方法
  doNothing() {
    // 用于阻止弹窗内容区域的点击事件冒泡到背景层
  },

  // 待办内容输入
  onQuickTodoInput(e) {
    this.setData({
      quickTodoContent: e.detail.value
    })
  },

  // 选择待办标签
  selectQuickTodoTag(e) {
    const tag = e.currentTarget.dataset.tag
    this.setData({
      quickTodoTag: tag
    })
  },

  // 保存快速待办
  saveQuickTodo() {
    if (!this.data.quickTodoContent || this.data.quickTodoContent.trim() === '') {
      wx.showToast({
        title: '请输入待办事项',
        icon: 'none'
      })
      return
    }

    // 保存笔记
    const note = {
      title: this.data.quickTodoContent.substring(0, 20) + (this.data.quickTodoContent.length > 20 ? '...' : ''),
      content: this.data.quickTodoContent,
      tag: this.data.quickTodoTag,
      keywords: [this.data.quickTodoTag, '任务'],
      type: 'todo'
    }

    const savedNote = StorageManager.saveNote(note)

    if (savedNote) {
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
      this.setData({ showQuickRecord: false })
      this.loadData()
    } else {
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: 'AI笔记助手 - 轻量录入，智能规整',
      path: '/pages/index/index'
    }
  }
})
