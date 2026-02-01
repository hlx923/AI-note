// pages/record/photo/photo.js
const StorageManager = require('../../../utils/storage.js')
const { showToast, showConfirm } = require('../../../utils/util.js')

Page({
  data: {
    photos: [],
    maxPhotos: 3,
    noteContent: ''
  },

  onLoad() {
    // 初始化
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

  // 输入备注
  onNoteInput(e) {
    this.setData({
      noteContent: e.detail.value
    })
  },

  // 保存笔记
  async saveNote() {
    if (this.data.photos.length === 0) {
      showToast('请先添加照片')
      return
    }

    if (!this.data.noteContent.trim()) {
      showToast('请输入备注内容')
      return
    }

    const note = {
      title: this.data.noteContent.substring(0, 20) + (this.data.noteContent.length > 20 ? '...' : ''),
      content: this.data.noteContent,
      tag: '图片',
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
  },

  // 重新选择
  async resetPhotos() {
    const confirm = await showConfirm('确定清空所有照片重新选择吗？')
    if (confirm) {
      this.setData({
        photos: [],
        noteContent: ''
      })
    }
  }
})
