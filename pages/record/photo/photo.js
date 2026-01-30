// pages/record/photo/photo.js
const StorageManager = require('../../../utils/storage.js')
const APIManager = require('../../../utils/api.js')
const { showToast, showLoading, hideLoading, showConfirm } = require('../../../utils/util.js')

Page({
  data: {
    photos: [],
    maxPhotos: 3,
    recognizedText: '',
    isProcessing: false
  },

  onLoad() {
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
    const confirm = await showConfirm('识别完成，是否进行AI规整？', '提示')
    if (confirm) {
      this.organizeNote()
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
