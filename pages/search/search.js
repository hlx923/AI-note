// pages/search/search.js
const StorageManager = require('../../utils/storage.js')
const { formatTimeAgo, debounce } = require('../../utils/util.js')

const recorderManager = wx.getRecorderManager()

Page({
  data: {
    keyword: '',
    searchResults: [],
    isSearching: false,
    isRecording: false,
    showHistory: true,
    searchHistory: [],
    hotKeywords: ['会议', '学习', '待办', '课件', '项目']
  },

  onLoad() {
    this.loadSearchHistory()
    this.initVoiceRecorder()
  },

  onShow() {
    if (!this.data.keyword) {
      this.setData({ showHistory: true })
    }
  },

  // 加载搜索历史
  loadSearchHistory() {
    try {
      const history = wx.getStorageSync('searchHistory') || []
      this.setData({ searchHistory: history.slice(0, 10) })
    } catch (error) {
      console.error('加载搜索历史失败', error)
    }
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    try {
      let history = wx.getStorageSync('searchHistory') || []
      history = history.filter(item => item !== keyword)
      history.unshift(keyword)
      history = history.slice(0, 10)
      wx.setStorageSync('searchHistory', history)
      this.setData({ searchHistory: history })
    } catch (error) {
      console.error('保存搜索历史失败', error)
    }
  },

  // 清空搜索历史
  clearSearchHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定清空所有搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('searchHistory')
          this.setData({ searchHistory: [] })
        }
      }
    })
  },

  // 输入搜索关键词
  onInput: debounce(function(e) {
    const keyword = e.detail.value
    this.setData({ keyword })

    if (keyword.trim()) {
      this.performSearch(keyword)
    } else {
      this.setData({
        searchResults: [],
        showHistory: true
      })
    }
  }, 300),

  // 执行搜索
  performSearch(keyword) {
    this.setData({ isSearching: true, showHistory: false })

    const results = StorageManager.searchNotes(keyword)

    // 添加高亮和时间显示
    const processedResults = results.map(note => ({
      ...note,
      timeAgo: formatTimeAgo(note.updateTime || note.createTime),
      highlightedTitle: this.highlightKeyword(note.title, keyword),
      highlightedContent: this.highlightKeyword(note.content, keyword)
    }))

    this.setData({
      searchResults: processedResults,
      isSearching: false
    })

    // 保存搜索历史
    if (keyword.trim()) {
      this.saveSearchHistory(keyword.trim())
    }
  },

  // 高亮关键词
  highlightKeyword(text, keyword) {
    if (!text || !keyword) return text
    const regex = new RegExp(`(${keyword})`, 'gi')
    return text.replace(regex, '<span class="highlight">$1</span>')
  },

  // 点击搜索
  onSearch() {
    if (this.data.keyword.trim()) {
      this.performSearch(this.data.keyword.trim())
    }
  },

  // 清空输入
  clearInput() {
    this.setData({
      keyword: '',
      searchResults: [],
      showHistory: true
    })
  },

  // 点击历史记录
  selectHistory(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ keyword })
    this.performSearch(keyword)
  },

  // 点击热门关键词
  selectHotKeyword(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ keyword })
    this.performSearch(keyword)
  },

  // 初始化语音识别
  initVoiceRecorder() {
    recorderManager.onStop((res) => {
      this.convertVoiceToText(res.tempFilePath)
    })

    recorderManager.onError((err) => {
      console.error('录音错误', err)
      wx.showToast({
        title: '录音失败',
        icon: 'none'
      })
      this.setData({ isRecording: false })
    })
  },

  // 开始语音搜索
  startVoiceSearch() {
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        recorderManager.start({
          duration: 10000,
          format: 'mp3'
        })
        this.setData({ isRecording: true })
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

  // 停止语音搜索
  stopVoiceSearch() {
    if (this.data.isRecording) {
      recorderManager.stop()
    }
  },

  // 语音转文字
  async convertVoiceToText(filePath) {
    wx.showLoading({ title: '识别中...' })

    try {
      // 由于云开发环境暂时不可用，暂时禁用语音识别功能
      // 用户可以直接使用文字搜索
      setTimeout(() => {
        wx.hideLoading()
        this.setData({ isRecording: false })
        wx.showToast({
          title: '语音识别暂不可用，请使用文字搜索',
          icon: 'none',
          duration: 2000
        })
      }, 500)
    } catch (error) {
      console.error('语音识别失败', error)
      wx.hideLoading()
      this.setData({ isRecording: false })
      wx.showToast({
        title: '识别失败',
        icon: 'none'
      })
    }
  },

  // 跳转到详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/note/detail/detail?id=${id}`
    })
  }
})
