// pages/record/handwrite/handwrite.js
const StorageManager = require('../../../utils/storage.js')
const APIManager = require('../../../utils/api.js')
const { showToast, showLoading, hideLoading, showConfirm } = require('../../../utils/util.js')

Page({
  data: {
    canvasWidth: 0,
    canvasHeight: 0,
    ctx: null,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    lineWidth: 3,
    lineColor: '#000000',
    colors: ['#000000', '#FF0000', '#0000FF', '#00AA00', '#FF6600'],
    lineWidths: [2, 3, 5, 8],
    recognizedText: '',
    hasDrawing: false
  },

  onLoad() {
    this.initCanvas()
  },

  // 初始化画布
  initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#handwriteCanvas').boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        const { width, height } = res[0]
        this.setData({
          canvasWidth: width,
          canvasHeight: height
        })

        // 创建canvas上下文
        const ctx = wx.createCanvasContext('handwriteCanvas', this)
        ctx.setLineCap('round')
        ctx.setLineJoin('round')
        ctx.setLineWidth(this.data.lineWidth)
        ctx.setStrokeStyle(this.data.lineColor)

        this.setData({ ctx })
      }
    })
  },

  // 触摸开始
  touchStart(e) {
    const { x, y } = e.touches[0]
    this.setData({
      isDrawing: true,
      lastX: x,
      lastY: y,
      hasDrawing: true
    })

    this.data.ctx.beginPath()
    this.data.ctx.moveTo(x, y)
  },

  // 触摸移动
  touchMove(e) {
    if (!this.data.isDrawing) return

    const { x, y } = e.touches[0]
    const ctx = this.data.ctx

    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.draw(true)

    this.setData({
      lastX: x,
      lastY: y
    })
  },

  // 触摸结束
  touchEnd() {
    this.setData({
      isDrawing: false
    })
  },

  // 选择颜色
  selectColor(e) {
    const color = e.currentTarget.dataset.color
    this.setData({ lineColor: color })
    this.data.ctx.setStrokeStyle(color)
  },

  // 选择笔迹粗细
  selectLineWidth(e) {
    const width = e.currentTarget.dataset.width
    this.setData({ lineWidth: width })
    this.data.ctx.setLineWidth(width)
  },

  // 清空画布
  async clearCanvas() {
    if (!this.data.hasDrawing) {
      return
    }

    const confirm = await showConfirm('确定清空画布吗？')
    if (confirm) {
      const ctx = this.data.ctx
      ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
      ctx.draw()
      this.setData({
        hasDrawing: false,
        recognizedText: ''
      })
    }
  },

  // 开始识别
  async startRecognize() {
    if (!this.data.hasDrawing) {
      showToast('请先手写内容')
      return
    }

    showLoading('正在识别...')

    try {
      // 将canvas转为图片
      wx.canvasToTempFilePath({
        canvasId: 'handwriteCanvas',
        success: async (res) => {
          // 调用手写识别API
          const result = await APIManager.handwritingOCR(res.tempFilePath)

          hideLoading()

          if (result.success && result.text) {
            this.setData({
              recognizedText: result.text
            })
            this.showOrganizePrompt()
          } else {
            // 使用模拟数据
            this.setData({
              recognizedText: '这是模拟的手写识别结果。\n\n在实际应用中，这里会显示从手写内容中识别出的文字。'
            })
            this.showOrganizePrompt()
          }
        },
        fail: (err) => {
          console.error('转换图片失败', err)
          hideLoading()
          showToast('识别失败，请重试')
        }
      }, this)
    } catch (error) {
      console.error('识别错误', error)
      hideLoading()
      showToast('识别失败')
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
          type: 'handwrite'
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
      tag: '生活',
      type: 'handwrite'
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

  // 修改识别文字
  onTextInput(e) {
    this.setData({
      recognizedText: e.detail.value
    })
  }
})
