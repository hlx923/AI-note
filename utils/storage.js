// utils/storage.js - 本地存储管理
class StorageManager {
  // 保存笔记
  static saveNote(note) {
    try {
      const notes = this.getAllNotes()
      note.id = note.id || this.generateId()
      note.createTime = note.createTime || Date.now()
      note.updateTime = Date.now()

      const index = notes.findIndex(n => n.id === note.id)
      if (index > -1) {
        notes[index] = note
      } else {
        notes.unshift(note)
      }

      wx.setStorageSync('notes', notes)
      return note
    } catch (error) {
      console.error('保存笔记失败:', error)
      return null
    }
  }

  // 获取所有笔记
  static getAllNotes() {
    try {
      return wx.getStorageSync('notes') || []
    } catch (error) {
      console.error('获取笔记失败:', error)
      return []
    }
  }

  // 根据ID获取笔记
  static getNoteById(id) {
    const notes = this.getAllNotes()
    return notes.find(note => note.id === id)
  }

  // 删除笔记
  static deleteNote(id) {
    try {
      const notes = this.getAllNotes()
      const filteredNotes = notes.filter(note => note.id !== id)
      wx.setStorageSync('notes', filteredNotes)
      return true
    } catch (error) {
      console.error('删除笔记失败:', error)
      return false
    }
  }

  // 搜索笔记
  static searchNotes(keyword, filters = {}) {
    const notes = this.getAllNotes()
    let results = notes

    // 关键词搜索
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      results = results.filter(note => {
        return (note.title && note.title.toLowerCase().includes(lowerKeyword)) ||
               (note.content && note.content.toLowerCase().includes(lowerKeyword)) ||
               (note.keywords && note.keywords.some(k => k.toLowerCase().includes(lowerKeyword)))
      })
    }

    // 标签筛选
    if (filters.tag) {
      results = results.filter(note => note.tag === filters.tag)
    }

    // 时间筛选
    if (filters.timeRange) {
      const now = Date.now()
      const ranges = {
        '7days': 7 * 24 * 60 * 60 * 1000,
        '30days': 30 * 24 * 60 * 60 * 1000,
        '90days': 90 * 24 * 60 * 60 * 1000
      }
      const range = ranges[filters.timeRange]
      if (range) {
        results = results.filter(note => (now - note.createTime) <= range)
      }
    }

    return results
  }

  // 添加到最近查看
  static addToRecentViews(noteId) {
    try {
      let recentViews = wx.getStorageSync('recentViews') || []
      recentViews = recentViews.filter(id => id !== noteId)
      recentViews.unshift(noteId)

      // 只保留最近10条
      if (recentViews.length > 10) {
        recentViews = recentViews.slice(0, 10)
      }

      wx.setStorageSync('recentViews', recentViews)
    } catch (error) {
      console.error('添加最近查看失败:', error)
    }
  }

  // 获取最近查看的笔记
  static getRecentViews() {
    try {
      const recentViewIds = wx.getStorageSync('recentViews') || []
      const notes = this.getAllNotes()
      return recentViewIds
        .map(id => notes.find(note => note.id === id))
        .filter(note => note !== undefined)
    } catch (error) {
      console.error('获取最近查看失败:', error)
      return []
    }
  }

  // 生成唯一ID
  static generateId() {
    return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 获取所有标签
  static getAllTags() {
    try {
      return wx.getStorageSync('tags') || ['学习', '工作', '生活', '灵感']
    } catch (error) {
      return ['学习', '工作', '生活', '灵感']
    }
  }

  // 添加自定义标签
  static addTag(tag) {
    try {
      const tags = this.getAllTags()
      if (!tags.includes(tag)) {
        tags.push(tag)
        wx.setStorageSync('tags', tags)
      }
      return tags
    } catch (error) {
      console.error('添加标签失败:', error)
      return this.getAllTags()
    }
  }

  // 锁定笔记
  static lockNote(noteId, password) {
    try {
      const note = this.getNoteById(noteId)
      if (note) {
        note.isLocked = true
        note.password = password
        this.saveNote(note)
        return true
      }
      return false
    } catch (error) {
      console.error('锁定笔记失败:', error)
      return false
    }
  }

  // 解锁笔记
  static unlockNote(noteId, password) {
    try {
      const note = this.getNoteById(noteId)
      if (note && note.isLocked && note.password === password) {
        return true
      }
      return false
    } catch (error) {
      console.error('解锁笔记失败:', error)
      return false
    }
  }
}

module.exports = StorageManager
