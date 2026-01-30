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
    showCreate: false
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
    const tags = StorageManager.getAllTags()
    const notes = this.filterNotes()

    this.setData({
      tags,
      notes
    })
  },

  // 筛选笔记
  filterNotes() {
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
    this.setData({ selectedTag: tag })
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
    this.hideCreateMenu()
    wx.navigateTo({
      url: '/pages/record/voice/voice'
    })
  },

  // 跳转到拍照记笔记
  goToPhotoRecord() {
    this.hideCreateMenu()
    wx.navigateTo({
      url: '/pages/record/photo/photo'
    })
  },

  // 跳转到手写涂鸦
  goToHandwrite() {
    this.hideCreateMenu()
    wx.navigateTo({
      url: '/pages/record/handwrite/handwrite'
    })
  }
})
