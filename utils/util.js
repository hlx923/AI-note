// utils/util.js - 工具函数
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 格式化时间戳为友好显示
const formatTimeAgo = (timestamp) => {
  const now = Date.now()
  const diff = now - timestamp

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const month = 30 * day

  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < week) {
    return `${Math.floor(diff / day)}天前`
  } else if (diff < month) {
    return `${Math.floor(diff / week)}周前`
  } else {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${formatNumber(date.getMonth() + 1)}-${formatNumber(date.getDate())}`
  }
}

// 防抖函数
const debounce = (fn, delay = 300) => {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// 节流函数
const throttle = (fn, delay = 300) => {
  let lastTime = 0
  return function(...args) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      fn.apply(this, args)
      lastTime = now
    }
  }
}

// 显示Toast
const showToast = (title, icon = 'none', duration = 2000) => {
  wx.showToast({
    title,
    icon,
    duration
  })
}

// 显示Loading
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  })
}

// 隐藏Loading
const hideLoading = () => {
  wx.hideLoading()
}

// 确认对话框
const showConfirm = (content, title = '提示') => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm)
      }
    })
  })
}

// 导出笔记为文本
const exportNoteAsText = (note) => {
  let content = `标题: ${note.title}\n`
  content += `标签: ${note.tag}\n`
  content += `创建时间: ${formatTime(new Date(note.createTime))}\n`
  content += `\n内容:\n${note.content}\n`

  if (note.keywords && note.keywords.length > 0) {
    content += `\n关键词: ${note.keywords.join(', ')}\n`
  }

  if (note.todos && note.todos.length > 0) {
    content += `\n待办事项:\n`
    note.todos.forEach((todo, index) => {
      content += `${index + 1}. ${todo}\n`
    })
  }

  return content
}

// 保存文件到本地
const saveFile = (content, fileName) => {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`

    fs.writeFile({
      filePath,
      data: content,
      encoding: 'utf8',
      success: () => {
        resolve(filePath)
      },
      fail: reject
    })
  })
}

// 分享笔记
const shareNote = (note) => {
  return {
    title: note.title,
    path: `/pages/note/detail/detail?id=${note.id}`,
    imageUrl: note.imageUrl || ''
  }
}

module.exports = {
  formatTime,
  formatTimeAgo,
  debounce,
  throttle,
  showToast,
  showLoading,
  hideLoading,
  showConfirm,
  exportNoteAsText,
  saveFile,
  shareNote
}
