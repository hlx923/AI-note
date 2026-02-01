// utils/storage.js - 本地存储管理
class StorageManager {
  // 获取当前用户ID
  static getCurrentUserId() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      return userInfo && userInfo.userId ? userInfo.userId : null
    } catch (error) {
      console.error('获取用户ID失败:', error)
      return null
    }
  }

  // 生成用户专属的存储key
  static getUserKey(baseKey) {
    const userId = this.getCurrentUserId()
    if (!userId) {
      // 如果没有登录,使用默认key(兼容旧数据)
      return baseKey
    }
    return `${baseKey}_${userId}`
  }

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

      const notesKey = this.getUserKey('notes')
      wx.setStorageSync(notesKey, notes)
      return note
    } catch (error) {
      console.error('保存笔记失败:', error)
      return null
    }
  }

  // 获取所有笔记
  static getAllNotes() {
    try {
      const notesKey = this.getUserKey('notes')
      return wx.getStorageSync(notesKey) || []
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
      const notesKey = this.getUserKey('notes')
      wx.setStorageSync(notesKey, filteredNotes)
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
      const recentViewsKey = this.getUserKey('recentViews')
      let recentViews = wx.getStorageSync(recentViewsKey) || []
      recentViews = recentViews.filter(id => id !== noteId)
      recentViews.unshift(noteId)

      // 只保留最近10条
      if (recentViews.length > 10) {
        recentViews = recentViews.slice(0, 10)
      }

      wx.setStorageSync(recentViewsKey, recentViews)
    } catch (error) {
      console.error('添加最近查看失败:', error)
    }
  }

  // 获取最近查看的笔记
  static getRecentViews() {
    try {
      const recentViewsKey = this.getUserKey('recentViews')
      const recentViewIds = wx.getStorageSync(recentViewsKey) || []
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
      const tagsKey = this.getUserKey('tags')
      return wx.getStorageSync(tagsKey) || ['待办', '学习', '工作', '生活', '灵感']
    } catch (error) {
      return ['待办', '学习', '工作', '生活', '灵感']
    }
  }

  // 添加自定义标签
  static addTag(tag) {
    try {
      const tags = this.getAllTags()
      if (!tags.includes(tag)) {
        tags.push(tag)
        const tagsKey = this.getUserKey('tags')
        wx.setStorageSync(tagsKey, tags)
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

  // 获取关联笔记推荐
  static getRelatedNotes(noteId, limit = 5) {
    try {
      const currentNote = this.getNoteById(noteId)
      if (!currentNote) return []

      const allNotes = this.getAllNotes().filter(note => note.id !== noteId)

      // 计算相关性得分
      const scoredNotes = allNotes.map(note => {
        let score = 0

        // 1. 相同标签 +10分
        if (note.tag === currentNote.tag) {
          score += 10
        }

        // 2. 关键词匹配 每个匹配 +5分
        if (currentNote.keywords && note.keywords) {
          const matchedKeywords = currentNote.keywords.filter(k =>
            note.keywords.includes(k)
          )
          score += matchedKeywords.length * 5
        }

        // 3. 标题相似度 (简单的词语匹配)
        if (currentNote.title && note.title) {
          const currentWords = this.extractWords(currentNote.title)
          const noteWords = this.extractWords(note.title)
          const matchedWords = currentWords.filter(w => noteWords.includes(w))
          score += matchedWords.length * 3
        }

        // 4. 内容相似度 (关键词提取和匹配)
        if (currentNote.content && note.content) {
          const currentContentWords = this.extractKeywordsFromContent(currentNote.content)
          const noteContentWords = this.extractKeywordsFromContent(note.content)
          const matchedContentWords = currentContentWords.filter(w =>
            noteContentWords.includes(w)
          )
          score += matchedContentWords.length * 2
        }

        // 5. 时间接近度 (同一天创建 +3分, 同一周 +1分)
        const timeDiff = Math.abs(currentNote.createTime - note.createTime)
        const dayDiff = timeDiff / (1000 * 60 * 60 * 24)
        if (dayDiff < 1) {
          score += 3
        } else if (dayDiff < 7) {
          score += 1
        }

        return { note, score }
      })

      // 按得分排序并返回前N个
      return scoredNotes
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.note)
    } catch (error) {
      console.error('获取关联笔记失败:', error)
      return []
    }
  }

  // 提取词语 (简单分词)
  static extractWords(text) {
    if (!text) return []
    // 移除标点符号，按空格和中文分词
    return text
      .replace(/[，。！？、；：""''（）《》【】\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 2)
  }

  // 从内容中提取关键词
  static extractKeywordsFromContent(content) {
    if (!content) return []

    // 简单的关键词提取：取出现频率较高的词
    const words = this.extractWords(content)
    const wordCount = {}

    words.forEach(word => {
      if (word.length >= 2) {
        wordCount[word] = (wordCount[word] || 0) + 1
      }
    })

    // 返回出现次数>=2的词
    return Object.keys(wordCount)
      .filter(word => wordCount[word] >= 2)
      .slice(0, 10)
  }
}

module.exports = StorageManager
