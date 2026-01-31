// pages/record/document/document.js
const StorageManager = require('../../../utils/storage.js')
const APIManager = require('../../../utils/api.js')
const { showToast, showLoading, hideLoading } = require('../../../utils/util.js')

Page({
  data: {
    selectedFile: null,
    fileName: '',
    fileSize: 0,
    fileType: '',
    extractedText: '',
    enhancedResult: null,
    isProcessing: false,
    supportedTypes: [
      { type: 'pdf', name: 'PDF文档', icon: '📄' },
      { type: 'doc', name: 'Word文档', icon: '📝' },
      { type: 'txt', name: '文本文件', icon: '📃' },
      { type: 'image', name: '图片文档', icon: '🖼️' }
    ]
  },

  onLoad() {
    // 页面加载
  },

  // 选择文件
  async chooseFile() {
    try {
      // 微信小程序选择文件
      const res = await wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['pdf', 'doc', 'docx', 'txt']
      })

      if (res.tempFiles && res.tempFiles.length > 0) {
        const file = res.tempFiles[0]

        // 检查文件大小（限制10MB）
        if (file.size > 10 * 1024 * 1024) {
          showToast('文件大小不能超过10MB')
          return
        }

        this.setData({
          selectedFile: file,
          fileName: file.name,
          fileSize: file.size,
          fileType: this.getFileType(file.name),
          extractedText: '',
          enhancedResult: null
        })

        showToast('文件选择成功', 'success')
      }
    } catch (error) {
      console.error('选择文件失败', error)
      if (error.errMsg && error.errMsg.includes('cancel')) {
        // 用户取消选择
        return
      }
      showToast('选择文件失败')
    }
  },

  // 选择图片文档
  async chooseImage() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera']
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        this.setData({
          selectedFile: {
            path: res.tempFilePaths[0],
            size: 0
          },
          fileName: '图片文档',
          fileType: 'image',
          extractedText: '',
          enhancedResult: null
        })

        showToast('图片选择成功', 'success')
      }
    } catch (error) {
      console.error('选择图片失败', error)
      showToast('选择图片失败')
    }
  },

  // 获取文件类型
  getFileType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase()
    if (ext === 'pdf') return 'pdf'
    if (ext === 'doc' || ext === 'docx') return 'doc'
    if (ext === 'txt') return 'txt'
    return 'unknown'
  },

  // 处理文档
  async processDocument() {
    if (!this.data.selectedFile) {
      showToast('请先选择文件')
      return
    }

    this.setData({ isProcessing: true })
    showLoading('正在处理文档...')

    try {
      // 上传文件到云存储
      const cloudPath = `documents/${Date.now()}_${this.data.fileName}`
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: this.data.selectedFile.path || this.data.selectedFile.tempFilePath
      })

      console.log('文件上传成功', uploadResult)

      // 调用云函数处理文档
      const result = await wx.cloud.callFunction({
        name: 'documentEnhance',
        data: {
          fileID: uploadResult.fileID,
          fileType: this.data.fileType,
          fileName: this.data.fileName
        }
      })

      hideLoading()

      console.log('文档处理结果', result)

      if (result.result.success) {
        this.setData({
          extractedText: result.result.text,
          enhancedResult: result.result.enhanced,
          isProcessing: false
        })
        showToast('处理完成', 'success')
      } else {
        this.setData({ isProcessing: false })
        showToast(`处理失败: ${result.result.error || '请重试'}`)
      }
    } catch (error) {
      console.error('文档处理错误', error)
      hideLoading()
      this.setData({ isProcessing: false })
      showToast('处理失败，请重试')
    }
  },

  // 保存增强笔记
  async saveEnhancedNote() {
    if (!this.data.enhancedResult) {
      showToast('没有可保存的内容')
      return
    }

    const enhanced = this.data.enhancedResult

    const note = {
      title: enhanced.title || `【文档】${this.data.fileName}`,
      content: this.formatEnhancedContent(enhanced),
      tag: enhanced.category || '学习',
      keywords: enhanced.keywords || [],
      type: 'document',
      documentData: {
        fileName: this.data.fileName,
        fileType: this.data.fileType,
        summary: enhanced.summary,
        keyPoints: enhanced.keyPoints,
        questions: enhanced.questions
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

  // 格式化增强内容
  formatEnhancedContent(enhanced) {
    let content = `📄 文档名称：${this.data.fileName}\n\n`

    if (enhanced.summary) {
      content += `📝 内容摘要：\n${enhanced.summary}\n\n`
    }

    if (enhanced.keyPoints && enhanced.keyPoints.length > 0) {
      content += `💡 核心要点：\n`
      enhanced.keyPoints.forEach((point, index) => {
        content += `${index + 1}. ${point}\n`
      })
      content += '\n'
    }

    if (enhanced.questions && enhanced.questions.length > 0) {
      content += `❓ 思考问题：\n`
      enhanced.questions.forEach((question, index) => {
        content += `${index + 1}. ${question}\n`
      })
      content += '\n'
    }

    if (this.data.extractedText) {
      content += `📖 原文内容：\n${this.data.extractedText}`
    }

    return content
  },

  // 重新选择文件
  resetFile() {
    this.setData({
      selectedFile: null,
      fileName: '',
      fileSize: 0,
      fileType: '',
      extractedText: '',
      enhancedResult: null
    })
  },

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '未知'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
  }
})
