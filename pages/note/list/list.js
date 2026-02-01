// pages/note/list/list.js
const StorageManager = require('../../../utils/storage.js')
const { formatTimeAgo } = require('../../../utils/util.js')

Page({
  data: {
    notes: [],
    tags: [],
    selectedTag: '',
    timeRange: '',
    showFilter: false,
    showCreate: false,
    showMoreArrow: false, // 是否显示溢出箭头
    overflowTags: [], // 溢出标签列表
    showOverflowMenu: false
  },


  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  // 加载数据
  loadData() {
    let tags = StorageManager.getAllTags()

    // 确保 '待办' 标签始终显示在标签列表前面（紧跟“全部”之后）
    if (!tags.includes('待办')) {
      tags.unshift('待办')
    } else {
      // 如果存在但不在首位，也把它移到首位以提升可见性
      const idx = tags.indexOf('待办')
      if (idx > 0) {
        tags.splice(idx, 1)
        tags.unshift('待办')
      }
    }

    const notes = this.filterNotes()

    this.setData({
      tags,
      notes
    }, () => {
      // 数据渲染完毕后测量标签是否溢出
      setTimeout(() => { this.measureTags() }, 60)
    })
  },

  // 筛选笔记
  filterNotes() {
    // 特殊处理：'待办' 标签展示有未完成任务的笔记
    if (this.data.selectedTag === '待办') {
      const all = StorageManager.getAllNotes()
      const filtered = all.filter(note => {
        if (note.workData && Array.isArray(note.workData.tasks)) {
          return note.workData.tasks.some(t => t.statusIndex === 0)
        }
        return false
      })

      return filtered.map(note => ({
        ...note,
        timeAgo: formatTimeAgo(note.updateTime || note.createTime)
      }))
    }

    const filters = {
      tag: this.data.selectedTag,
      timeRange: this.data.timeRange
    }

    const notes = StorageManager.searchNotes('', filters)

    // 添加时间显示
    return notes.map(note => ({
      ...note,
      timeAgo: formatTimeAgo(note.updateTime || note.createTime)
    }))
  },

  // 选择标签
  selectTag(e) {
    const tag = e.currentTarget.dataset.tag
    this.setData({ selectedTag: tag, showOverflowMenu: false })
    this.loadData()
  },

  // 显示筛选菜单
  showFilterMenu() {
    this.setData({ showFilter: true })
  },

  // 隐藏筛选菜单
  hideFilterMenu() {
    this.setData({ showFilter: false })
  },

  // 选择时间范围
  selectTimeRange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ timeRange: range })
  },

  // 重置筛选
  resetFilter() {
    this.setData({
      selectedTag: '',
      timeRange: '',
      showFilter: false
    })
    this.loadData()
  },

  // 应用筛选
  applyFilter() {
    this.setData({ showFilter: false })
    this.loadData()
  },

  // 显示创建菜单
  showCreateMenu() {
    this.setData({ showCreate: true })
  },

  // 溢出菜单相关
  measureTags() {
    const query = wx.createSelectorQuery().in(this)
    query.select('.filter-bar').boundingClientRect()
    query.select('.filter-icon').boundingClientRect()
    query.select('.tag-list').boundingClientRect()
    query.selectAll('.tag-item').boundingClientRect()
    query.exec((rects) => {
      const [filterBarRect, filterIconRect, tagListRect, tagItems] = rects
      if (!filterBarRect || !tagItems || tagItems.length === 0) return

      // 可用宽度 = 整个过滤栏宽 - 筛选按钮宽 - 一些边距
      const filterIconWidth = (filterIconRect && filterIconRect.width) || 60
      const availableWidth = filterBarRect.width - filterIconWidth - 48

      // 首个 tag-item 是“全部”，其余对应 tags 数组
      let consumed = (tagItems[0] && tagItems[0].width) ? tagItems[0].width + 8 : 0
      let fitCount = 0
      for (let i = 1; i < tagItems.length; i++) {
        const w = tagItems[i].width + 8
        if (consumed + w > availableWidth) break
        consumed += w
        fitCount++
      }

      const overflowTags = this.data.tags.slice(fitCount)
      this.setData({
        showMoreArrow: overflowTags.length > 0,
        overflowTags: overflowTags
      })
    })
  },

  toggleOverflowMenu() {
    this.setData({ showOverflowMenu: !this.data.showOverflowMenu })
  },

  closeOverflowMenu() {
    this.setData({ showOverflowMenu: false })
  },

  selectOverflowTag(e) {
    const tag = e.currentTarget.dataset.tag
    this.setData({ selectedTag: tag, showOverflowMenu: false })
    this.loadData()
  },

  // 隐藏创建菜单
  hideCreateMenu() {
    this.setData({ showCreate: false })
  },

  // 阻止冒泡
  stopPropagation() {},

  // 跳转到详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/note/detail/detail?id=${id}`
    })
  },

  // 跳转到语音速记
  goToVoiceRecord() {
    if (!this.checkLogin()) return
    this.hideCreateMenu()
    wx.navigateTo({
      url: '/pages/record/voice/voice'
    })
  },

  // 跳转到拍照记笔记
  goToPhotoRecord() {
    if (!this.checkLogin()) return
    this.hideCreateMenu()
    wx.navigateTo({
      url: '/pages/record/photo/photo'
    })
  },

  // 跳转到手写涂鸦
  goToHandwrite() {
    if (!this.checkLogin()) return
    this.hideCreateMenu()
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
  }
})
