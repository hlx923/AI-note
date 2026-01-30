// pages/record/photo/photo.js
const StorageManager = require('../../../utils/storage.js')
const APIManager = require('../../../utils/api.js')
const { showToast, showLoading, hideLoading, showConfirm } = require('../../../utils/util.js')

Page({
  data: {
    photos: [],
    maxPhotos: 3,
    recognizedText: '',
    isProcessing: false,
    mode: 'normal', // normal: 普通模式, mistake: 错题本模式
    showModeSelector: false,
    questionData: null // 错题数据: {question, answer, analysis, subject}
  },

  onLoad() {
    // 检查是否从错题本入口进入
    const mode = wx.getStorageSync('photoMode') || 'normal'
    this.setData({ mode })
    wx.removeStorageSync('photoMode')
  },

  // 切换模式
  toggleModeSelector() {
    this.setData({ showModeSelector: !this.data.showModeSelector })
  },

  // 选择模式
  selectMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      mode,
      showModeSelector: false,
      photos: [],
      recognizedText: '',
      questionData: null
    })
    wx.showToast({
      title: mode === 'mistake' ? '已切换到错题本模式' : '已切换到普通模式',
      icon: 'success'
    })
  },

  // 拍照
  takePhoto() {
    if (this.data.photos.length >= this.data.maxPhotos) {
      showToast(`最多支持${this.data.maxPhotos}张照片`)
      return
    }

    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        wx.chooseMedia({
          count: this.data.maxPhotos - this.data.photos.length,
          mediaType: ['image'],
          sourceType: ['camera'],
          sizeType: ['compressed'],
          success: (res) => {
            const photos = [...this.data.photos, ...res.tempFiles.map(file => file.tempFilePath)]
            this.setData({ photos })
          }
        })
      },
      fail: () => {
        wx.showModal({
          title: '需要相机权限',
          content: '请在设置中开启相机权限',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  // 从相册选择
  chooseFromAlbum() {
    if (this.data.photos.length >= this.data.maxPhotos) {
      showToast(`最多支持${this.data.maxPhotos}张照片`)
      return
    }

    wx.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => {
        wx.chooseMedia({
          count: this.data.maxPhotos - this.data.photos.length,
          mediaType: ['image'],
          sourceType: ['album'],
          sizeType: ['compressed'],
          success: (res) => {
            const photos = [...this.data.photos, ...res.tempFiles.map(file => file.tempFilePath)]
            this.setData({ photos })
          }
        })
      },
      fail: () => {
        // 即使没有授权也可以选择照片
        wx.chooseMedia({
          count: this.data.maxPhotos - this.data.photos.length,
          mediaType: ['image'],
          sourceType: ['album'],
          sizeType: ['compressed'],
          success: (res) => {
            const photos = [...this.data.photos, ...res.tempFiles.map(file => file.tempFilePath)]
            this.setData({ photos })
          }
        })
      }
    })
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.photos[index],
      urls: this.data.photos
    })
  },

  // 删除图片
  deletePhoto(e) {
    const index = e.currentTarget.dataset.index
    const photos = this.data.photos.filter((_, i) => i !== index)
    this.setData({ photos })
  },

  // 开始识别
  async startRecognize() {
    if (this.data.photos.length === 0) {
      showToast('请先拍照或选择图片')
      return
    }

    this.setData({ isProcessing: true })
    showLoading('正在识别...')

    try {
      let allText = ''

      // 逐张识别
      for (let i = 0; i < this.data.photos.length; i++) {
        const result = await APIManager.baiduOCR(this.data.photos[i])

        if (result.success) {
          allText += result.text + '\n\n'
        } else {
          console.error('OCR识别失败', result.error)
        }
      }

      hideLoading()
      this.setData({
        isProcessing: false,
        recognizedText: allText.trim() || '未识别到文字内容'
      })

      if (allText.trim()) {
        this.showOrganizePrompt()
      } else {
        showToast('未识别到文字内容')
      }
    } catch (error) {
      console.error('识别错误', error)
      hideLoading()
      this.setData({ isProcessing: false })

      // 使用模拟数据
      this.setData({
        recognizedText: '这是模拟的OCR识别结果。\n\n在实际应用中，这里会显示从图片中识别出的文字内容。\n\n支持识别课件、白板、书籍等各类文字图片。'
      })
      this.showOrganizePrompt()
    }
  },

  // 显示规整提示
  async showOrganizePrompt() {
    if (this.data.mode === 'mistake') {
      // 错题本模式,直接进行AI分析
      this.analyzeMistake()
    } else {
      // 普通模式
      const confirm = await showConfirm('识别完成，是否进行AI规整？', '提示')
      if (confirm) {
        this.organizeNote()
      }
    }
  },

  // 分析错题
  async analyzeMistake() {
    showLoading('正在分析错题...')

    try {
      // 调用AI分析错题结构
      const result = await APIManager.analyzeMistake(this.data.recognizedText)
      hideLoading()

      if (result.success) {
        this.setData({
          questionData: {
            question: result.question || this.data.recognizedText,
            answer: result.answer || '',
            analysis: result.analysis || '',
            subject: result.subject || '其他'
          }
        })

        // 显示错题编辑界面
        wx.showToast({
          title: '分析完成',
          icon: 'success'
        })
      } else {
        // 分析失败,使用默认结构
        this.setData({
          questionData: {
            question: this.data.recognizedText,
            answer: '',
            analysis: '',
            subject: '其他'
          }
        })
      }
    } catch (error) {
      console.error('分析错题失败', error)
      hideLoading()

      // 使用默认结构
      this.setData({
        questionData: {
          question: this.data.recognizedText,
          answer: '',
          analysis: '',
          subject: '其他'
        }
      })
    }
  },

  // 更新错题字段
  updateQuestionField(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value || e.currentTarget.dataset.value
    this.setData({
      [`questionData.${field}`]: value
    })
  },

  // 保存错题
  async saveMistake() {
    const { questionData, photos } = this.data

    if (!questionData || !questionData.question.trim()) {
      showToast('请输入题目内容')
      return
    }

    const note = {
      title: `【错题】${questionData.subject} - ${questionData.question.substring(0, 15)}...`,
      content: `题目：\n${questionData.question}\n\n答案：\n${questionData.answer}\n\n解析：\n${questionData.analysis}`,
      tag: '错题本',
      keywords: [questionData.subject, '错题'],
      type: 'mistake',
      images: photos,
      mistakeData: questionData
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

  // AI规整笔记
  async organizeNote() {
    if (!this.data.recognizedText) {
      showToast('没有可规整的内容')
      return
    }

    showLoading('正在规整...')

    try {
      const result = await APIManager.analyzeText(this.data.recognizedText)
      hideLoading()

      if (result.success) {
        // 保存笔记
        const note = {
          title: result.title,
          content: this.data.recognizedText,
          tag: result.tag,
          keywords: result.keywords,
          todos: result.todos,
          type: 'photo',
          images: this.data.photos
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
      } else {
        showToast('规整失败')
      }
    } catch (error) {
      console.error('规整错误', error)
      hideLoading()
      showToast('规整失败')
    }
  },

  // 手动保存
  async manualSave() {
    if (!this.data.recognizedText) {
      showToast('没有可保存的内容')
      return
    }

    const note = {
      title: this.data.recognizedText.substring(0, 20) + '...',
      content: this.data.recognizedText,
      tag: '学习',
      type: 'photo',
      images: this.data.photos
    }

    const savedNote = StorageManager.saveNote(note)

    if (savedNote) {
      showToast('保存成功', 'success')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } else {
      showToast('保存失败')
    }
  },

  // 重新拍照
  async resetPhotos() {
    const confirm = await showConfirm('确定清空所有照片重新拍摄吗？')
    if (confirm) {
      this.setData({
        photos: [],
        recognizedText: ''
      })
    }
  }
})
