// pages/record/summary/summary.js
const StorageManager = require('../../../utils/storage.js')
const APIManager = require('../../../utils/api.js')
const { showToast, showLoading, hideLoading } = require('../../../utils/util.js')

Page({
  data: {
    inputText: '',
    summaryResult: null,
    textLength: 0,
    maxLength: 10000,
    isProcessing: false,
    summaryMode: 'brief', // brief: 简要总结, detailed: 详细总结, keypoints: 要点提取
    showModeSelector: false
  },

  onLoad() {
    // 检查剪贴板
    this.checkClipboard()
  },

  // 检查剪贴板内容
  async checkClipboard() {
    try {
      const res = await wx.getClipboardData()
      if (res.data && res.data.length > 50) {
        wx.showModal({
          title: '检测到剪贴板内容',
          content: '是否使用剪贴板中的文本？',
          confirmText: '使用',
          confirmColor: '#4A90E2',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.setData({
                inputText: res.data,
                textLength: res.data.length
              })
            }
          }
        })
      }
    } catch (error) {
      console.log('读取剪贴板失败', error)
    }
  },

  // 文本输入
  onTextInput(e) {
    const text = e.detail.value
    this.setData({
      inputText: text,
      textLength: text.length
    })
  },

  // 清空文本
  clearText() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有文本吗？',
      confirmColor: '#4A90E2',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            inputText: '',
            textLength: 0,
            summaryResult: null
          })
        }
      }
    })
  },

  // 切换模式选择器
  toggleModeSelector() {
    this.setData({
      showModeSelector: !this.data.showModeSelector
    })
  },

  // 选择总结模式
  selectMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      summaryMode: mode,
      showModeSelector: false
    })
  },

  // 获取模式名称
  getModeName() {
    const modeMap = {
      brief: '简要总结',
      detailed: '详细总结',
      keypoints: '要点提取'
    }
    return modeMap[this.data.summaryMode] || '简要总结'
  },

  // 开始总结
  async startSummary() {
    if (!this.data.inputText || this.data.inputText.trim().length < 50) {
      showToast('文本内容太短，至少需要50个字符')
      return
    }

    if (this.data.isProcessing) {
      return
    }

    this.setData({ isProcessing: true })
    showLoading('正在分析总结...')

    try {
      // 调用AI总结接口
      const result = await this.callSummaryAPI(this.data.inputText, this.data.summaryMode)

      hideLoading()
      this.setData({ isProcessing: false })

      if (result.success) {
        this.setData({
          summaryResult: {
            title: result.title,
            summary: result.summary,
            keyPoints: result.keyPoints || [],
            tags: result.tags || [],
            wordCount: this.data.inputText.length,
            summaryWordCount: result.summary.length
          }
        })
        showToast('总结完成', 'success')
      } else {
        showToast('总结失败，请重试')
      }
    } catch (error) {
      console.error('总结错误', error)
      hideLoading()
      this.setData({ isProcessing: false })
      showToast('总结失败，请重试')
    }
  },

  // 调用总结API
  async callSummaryAPI(text, mode) {
    try {
      // 调用云函数进行文本总结
      const result = await wx.cloud.callFunction({
        name: 'textSummary',
        data: {
          text: text,
          mode: mode
        }
      })

      console.log('云函数返回结果:', result)

      if (result.result && result.result.success) {
        return result.result
      } else {
        // 如果云函数失败，使用本地简单总结
        return this.localSummary(text, mode)
      }
    } catch (error) {
      console.error('调用云函数失败', error)
      // 降级到本地总结
      return this.localSummary(text, mode)
    }
  },

  // 本地简单总结（降级方案）
  localSummary(text, mode) {
    // 简单的本地总结逻辑
    const sentences = text.split(/[。！？\n]/).filter(s => s.trim().length > 0)
    const keyPoints = sentences.slice(0, 5).map((s, i) => `${i + 1}. ${s.trim()}`)

    let summary = ''
    if (mode === 'brief') {
      summary = sentences.slice(0, 3).join('。') + '。'
    } else if (mode === 'detailed') {
      summary = sentences.slice(0, 8).join('。') + '。'
    } else {
      summary = keyPoints.join('\n')
    }

    return {
      success: true,
      title: `【总结】${text.substring(0, 15)}...`,
      summary: summary,
      keyPoints: keyPoints,
      tags: ['总结', '长文']
    }
  },

  // 保存总结
  async saveSummary() {
    if (!this.data.summaryResult) {
      showToast('请先生成总结')
      return
    }

    const note = {
      title: this.data.summaryResult.title,
      content: `【原文】\n${this.data.inputText}\n\n【总结】\n${this.data.summaryResult.summary}\n\n【要点】\n${this.data.summaryResult.keyPoints.join('\n')}`,
      tag: '总结',
      keywords: this.data.summaryResult.tags,
      type: 'summary',
      summaryData: {
        originalText: this.data.inputText,
        summary: this.data.summaryResult.summary,
        keyPoints: this.data.summaryResult.keyPoints,
        mode: this.data.summaryMode,
        wordCount: this.data.summaryResult.wordCount,
        summaryWordCount: this.data.summaryResult.summaryWordCount
      }
    }

    const savedNote = StorageManager.saveNote(note)

    if (savedNote) {
      showToast('保存成功', 'success')
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/note/detail/detail?id=${savedNote.id}`
        })
      }, 1500)
    } else {
      showToast('保存失败')
    }
  },

  // 复制总结
  copySummary() {
    if (!this.data.summaryResult) {
      showToast('没有可复制的内容')
      return
    }

    wx.setClipboardData({
      data: this.data.summaryResult.summary,
      success: () => {
        showToast('已复制到剪贴板', 'success')
      }
    })
  },

  // 分享总结
  shareSummary() {
    if (!this.data.summaryResult) {
      showToast('请先生成总结')
      return
    }
    // 触发分享
    wx.showShareMenu({
      withShareTicket: true
    })
  },

  // 重新总结
  resetSummary() {
    this.setData({
      summaryResult: null
    })
  },

  // 分享
  onShareAppMessage() {
    if (this.data.summaryResult) {
      return {
        title: this.data.summaryResult.title,
        path: '/pages/index/index'
      }
    }
    return {
      title: 'AI笔记助手 - 长文总结',
      path: '/pages/index/index'
    }
  }
})
