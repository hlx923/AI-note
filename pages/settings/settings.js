// pages/settings/settings.js
const StorageManager = require('../../utils/storage.js')
const { exportNote } = require('../../utils/util.js')

Page({
  data: {
    userInfo: {},
    noteCount: 0,
    tags: [],
    cacheSize: '0KB',
    baiduConfigured: false,
    showTagModal: false,
    newTag: ''
  },

  onLoad() {
    this.loadSettings()
    this.loadUserInfo()
  },

  onShow() {
    this.loadSettings()
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    }
  },

  // 处理登录
  handleLogin() {
    // 如果已登录，不做处理
    if (this.data.userInfo.nickName) {
      return
    }

    // 使用新版API获取用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo
        this.setData({ userInfo })
        wx.setStorageSync('userInfo', userInfo)
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('获取用户信息失败', err)
        wx.showToast({
          title: '登录取消',
          icon: 'none'
        })
      }
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？退出后将清除所有账号信息。',
      confirmText: '确定退出',
      confirmColor: '#FF4444',
      success: (res) => {
        if (res.confirm) {
          // 清除用户信息
          wx.removeStorageSync('userInfo')
          this.setData({
            userInfo: {}
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 加载设置数据
  loadSettings() {
    const notes = StorageManager.getAllNotes()
    const tags = StorageManager.getAllTags()
    const apiConfig = wx.getStorageSync('apiConfig') || {}

    // 计算缓存大小
    const cacheSize = this.calculateCacheSize()

    this.setData({
      noteCount: notes.length,
      tags: tags,
      cacheSize: cacheSize,
      baiduConfigured: !!(apiConfig.baiduApiKey && apiConfig.baiduSecretKey)
    })
  },

  // 计算缓存大小
  calculateCacheSize() {
    try {
      const info = wx.getStorageInfoSync()
      const sizeKB = info.currentSize
      if (sizeKB < 1024) {
        return `${sizeKB}KB`
      } else {
        return `${(sizeKB / 1024).toFixed(2)}MB`
      }
    } catch (error) {
      return '0KB'
    }
  },

  // 标签管理
  manageTags() {
    this.setData({ showTagModal: true })
  },

  closeTagModal() {
    this.setData({ showTagModal: false, newTag: '' })
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  onTagInput(e) {
    this.setData({ newTag: e.detail.value })
  },

  addTag() {
    const tag = this.data.newTag.trim()
    if (!tag) {
      wx.showToast({
        title: '请输入标签名称',
        icon: 'none'
      })
      return
    }

    if (this.data.tags.includes(tag)) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none'
      })
      return
    }

    const tags = [...this.data.tags, tag]
    wx.setStorageSync('tags', tags)
    this.setData({
      tags: tags,
      newTag: ''
    })

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    })
  },

  deleteTag(e) {
    const tag = e.currentTarget.dataset.tag
    wx.showModal({
      title: '确认删除',
      content: `确定删除标签"${tag}"吗？`,
      success: (res) => {
        if (res.confirm) {
          const tags = this.data.tags.filter(t => t !== tag)
          wx.setStorageSync('tags', tags)
          this.setData({ tags: tags })
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
        }
      }
    })
  },

  // 导出所有笔记
  exportAllNotes() {
    wx.showLoading({ title: '导出中...' })

    try {
      const notes = StorageManager.getAllNotes()
      if (notes.length === 0) {
        wx.hideLoading()
        wx.showToast({
          title: '暂无笔记',
          icon: 'none'
        })
        return
      }

      let exportText = `AI笔记助手 - 数据导出\n导出时间：${new Date().toLocaleString()}\n共 ${notes.length} 条笔记\n\n`
      exportText += '='.repeat(50) + '\n\n'

      notes.forEach((note, index) => {
        exportText += `【笔记 ${index + 1}】\n`
        exportText += `标题：${note.title}\n`
        exportText += `标签：${note.tag}\n`
        exportText += `创建时间：${new Date(note.createTime).toLocaleString()}\n`
        exportText += `内容：\n${note.content}\n`
        if (note.keywords && note.keywords.length > 0) {
          exportText += `关键词：${note.keywords.join(', ')}\n`
        }
        if (note.todos && note.todos.length > 0) {
          exportText += `待办事项：\n${note.todos.map(t => `  - ${t}`).join('\n')}\n`
        }
        exportText += '\n' + '-'.repeat(50) + '\n\n'
      })

      // 保存到临时文件
      const fs = wx.getFileSystemManager()
      const fileName = `notes_export_${Date.now()}.txt`
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`

      fs.writeFileSync(filePath, exportText, 'utf8')

      wx.hideLoading()

      // 分享文件
      wx.shareFileMessage({
        filePath: filePath,
        fileName: fileName,
        success: () => {
          wx.showToast({
            title: '导出成功',
            icon: 'success'
          })
        },
        fail: (err) => {
          console.error('分享失败', err)
          wx.showModal({
            title: '导出成功',
            content: '文件已保存，但分享失败。您可以在文件管理中找到导出的文件。',
            showCancel: false
          })
        }
      })
    } catch (error) {
      console.error('导出失败', error)
      wx.hideLoading()
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      })
    }
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定清除缓存吗？这不会删除您的笔记数据。',
      success: (res) => {
        if (res.confirm) {
          try {
            // 清除搜索历史
            wx.removeStorageSync('searchHistory')
            // 清除最近浏览
            wx.removeStorageSync('recentViews')

            wx.showToast({
              title: '清除成功',
              icon: 'success'
            })

            this.loadSettings()
          } catch (error) {
            console.error('清除缓存失败', error)
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 清空所有数据
  clearAllData() {
    wx.showModal({
      title: '危险操作',
      content: '确定清空所有数据吗？此操作不可恢复！',
      confirmText: '确定清空',
      confirmColor: '#FF4444',
      success: (res) => {
        if (res.confirm) {
          wx.showModal({
            title: '二次确认',
            content: '真的要删除所有笔记吗？',
            confirmText: '确定删除',
            confirmColor: '#FF4444',
            success: (res2) => {
              if (res2.confirm) {
                try {
                  wx.clearStorageSync()
                  wx.showToast({
                    title: '已清空',
                    icon: 'success'
                  })
                  this.loadSettings()
                } catch (error) {
                  console.error('清空数据失败', error)
                  wx.showToast({
                    title: '操作失败',
                    icon: 'none'
                  })
                }
              }
            }
          })
        }
      }
    })
  },

  // 配置百度OCR
  configBaiduOCR() {
    const apiConfig = wx.getStorageSync('apiConfig') || {}

    wx.showModal({
      title: '百度OCR配置',
      content: '请在开发者工具中配置API Key和Secret Key',
      editable: true,
      placeholderText: '格式：apiKey,secretKey',
      success: (res) => {
        if (res.confirm && res.content) {
          const [apiKey, secretKey] = res.content.split(',').map(s => s.trim())
          if (apiKey && secretKey) {
            apiConfig.baiduApiKey = apiKey
            apiConfig.baiduSecretKey = secretKey
            wx.setStorageSync('apiConfig', apiConfig)
            this.setData({ baiduConfigured: true })
            wx.showToast({
              title: '配置成功',
              icon: 'success'
            })
          } else {
            wx.showToast({
              title: '格式错误',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 关于应用
  showAbout() {
    wx.showModal({
      title: 'AI笔记助手',
      content: '版本：v1.0.0\n\n一款轻量级的场景化笔记应用，支持语音、拍照、手写等多种输入方式，配合AI智能整理，让记录更简单。\n\n开发者：创新竞赛团队\n逆风的蝶出品',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 使用帮助
  showHelp() {
    wx.showModal({
      title: '使用帮助',
      content: '1. 即时录入：支持语音、拍照、手写三种方式\n\n2. AI整理：自动分类、提取关键词和待办\n\n3. 即时检索：支持文字和语音搜索\n\n4. 标签管理：自定义标签分类笔记\n\n5. 数据导出：可导出所有笔记为文本文件',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
