// pages/note/detail/detail.js
const StorageManager = require('../../../utils/storage.js')
const { formatTime, showToast, showLoading, hideLoading, showConfirm, exportNoteAsText, saveFile } = require('../../../utils/util.js')

Page({
  data: {
    noteId: '',
    note: null,
    isLocked: false,
    password: '',
    isEditing: false,
    editContent: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ noteId: options.id })
      this.loadNote()
    }
  },

  onShow() {
    if (this.data.noteId && !this.data.isEditing) {
      this.loadNote()
    }
  },

  // 加载笔记
  loadNote() {
    const note = StorageManager.getNoteById(this.data.noteId)

    if (!note) {
      showToast('笔记不存在')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    // 检查是否锁定
    if (note.isLocked && !this.data.isLocked) {
      this.showPasswordDialog()
      return
    }

    // 添加到最近查看
    StorageManager.addToRecentViews(this.data.noteId)

    this.setData({ note })
  },

  // 显示密码输入框
  showPasswordDialog() {
    wx.showModal({
      title: '输入密码',
      editable: true,
      placeholderText: '请输入密码',
      success: (res) => {
        if (res.confirm) {
          const password = res.content
          const unlocked = StorageManager.unlockNote(this.data.noteId, password)

          if (unlocked) {
            this.setData({ isLocked: true })
            this.loadNote()
          } else {
            showToast('密码错误')
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          }
        } else {
          wx.navigateBack()
        }
      }
    })
  },

  // 编辑笔记
  startEdit() {
    this.setData({
      isEditing: true,
      editContent: this.data.note.content
    })
  },

  // 取消编辑
  cancelEdit() {
    this.setData({
      isEditing: false,
      editContent: ''
    })
  },

  // 保存编辑
  async saveEdit() {
    const note = {
      ...this.data.note,
      content: this.data.editContent
    }

    const savedNote = StorageManager.saveNote(note)

    if (savedNote) {
      showToast('保存成功', 'success')
      this.setData({
        isEditing: false,
        note: savedNote
      })
    } else {
      showToast('保存失败')
    }
  },

  // 内容输入
  onContentInput(e) {
    this.setData({
      editContent: e.detail.value
    })
  },

  // 删除笔记
  async deleteNote() {
    const confirm = await showConfirm('确定删除这条笔记吗？', '删除确认')

    if (confirm) {
      const success = StorageManager.deleteNote(this.data.noteId)

      if (success) {
        showToast('删除成功', 'success')
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        showToast('删除失败')
      }
    }
  },

  // 锁定笔记
  async lockNote() {
    if (this.data.note.isLocked) {
      showToast('笔记已锁定')
      return
    }

    wx.showModal({
      title: '设置密码',
      editable: true,
      placeholderText: '请输入密码（4-8位）',
      success: (res) => {
        if (res.confirm) {
          const password = res.content

          if (password.length < 4 || password.length > 8) {
            showToast('密码长度为4-8位')
            return
          }

          const success = StorageManager.lockNote(this.data.noteId, password)

          if (success) {
            showToast('锁定成功', 'success')
            this.loadNote()
          } else {
            showToast('锁定失败')
          }
        }
      }
    })
  },

  // 导出笔记
  async exportNote() {
    showLoading('正在导出...')

    try {
      const content = exportNoteAsText(this.data.note)
      const fileName = `${this.data.note.title}_${Date.now()}.txt`
      const filePath = await saveFile(content, fileName)

      hideLoading()

      wx.showModal({
        title: '导出成功',
        content: '是否打开文件？',
        success: (res) => {
          if (res.confirm) {
            wx.openDocument({
              filePath,
              showMenu: true
            })
          }
        }
      })
    } catch (error) {
      console.error('导出失败', error)
      hideLoading()
      showToast('导出失败')
    }
  },

  // 复制内容
  copyContent() {
    wx.setClipboardData({
      data: this.data.note.content,
      success: () => {
        showToast('已复制到剪贴板', 'success')
      }
    })
  },

  // 分享笔记
  onShareAppMessage() {
    return {
      title: this.data.note.title,
      path: `/pages/note/detail/detail?id=${this.data.noteId}`
    }
  },

  // 转发到微信
  shareToWeChat() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })

    showToast('点击右上角分享', 'none')
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.note.images[index],
      urls: this.data.note.images
    })
  }
})
