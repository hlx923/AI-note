// pages/record/voice/voice.js
const StorageManager = require('../../../utils/storage.js')

Page({
  data: {
    todoContent: '',
    recordTime: ''
  },

  onLoad() {
    // 初始化记录时间
    this.setData({
      recordTime: this.getCurrentTime()
    })
  },

  // 获取当前时间
  getCurrentTime() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  // 待办事项输入
  onTodoInput(e) {
    this.setData({
      todoContent: e.detail.value
    })
  },

  // 保存待办
  saveTodo() {
    if (!this.data.todoContent || this.data.todoContent.trim() === '') {
      wx.showToast({
        title: '请输入待办事项',
        icon: 'none'
      })
      return
    }

    // 保存笔记
    const note = {
      title: this.data.todoContent.substring(0, 20) + (this.data.todoContent.length > 20 ? '...' : ''),
      content: this.data.todoContent,
      tag: '待办',
      keywords: ['待办', '任务'],
      type: 'todo'
    }

    const savedNote = StorageManager.saveNote(note)

    if (savedNote) {
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } else {
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  }
})
