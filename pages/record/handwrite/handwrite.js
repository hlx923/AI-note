// pages/record/handwrite/handwrite.js
const StorageManager = require('../../../utils/storage.js')
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
    colors: ['#000000', '#FF0000', '#0000FF', '#00AA00', '#FF6600', '#FFFF00', '#FF00FF', '#00FFFF'],
    lineWidths: [2, 3, 5, 8],
    inspirationText: '',
    hasDrawing: false,
    drawingHistory: []
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
    // 保存当前画布状态用于撤销
    this.saveDrawingState()
  },

  // 保存绘画状态
  saveDrawingState() {
    wx.canvasToTempFilePath({
      canvasId: 'handwriteCanvas',
      success: (res) => {
        const history = this.data.drawingHistory
        history.push(res.tempFilePath)
        // 只保留最近10个状态
        if (history.length > 10) {
          history.shift()
        }
        this.setData({ drawingHistory: history })
      }
    }, this)
  },

  // 撤销绘画
  undoDrawing() {
    const history = this.data.drawingHistory
    if (history.length === 0) {
      showToast('没有可撤销的操作')
      return
    }

    // 移除最后一个状态
    history.pop()
    this.setData({ drawingHistory: history })

    const ctx = this.data.ctx
    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)

    if (history.length > 0) {
      // 恢复到上一个状态
      const lastState = history[history.length - 1]
      ctx.drawImage(lastState, 0, 0, this.data.canvasWidth, this.data.canvasHeight)
      ctx.draw()
    } else {
      ctx.draw()
      this.setData({ hasDrawing: false })
    }
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
        inspirationText: '',
        drawingHistory: []
      })
    }
  },

  // 输入灵感描述
  onInspirationInput(e) {
    this.setData({
      inspirationText: e.detail.value
    })
  },

  // 保存灵感
  async saveInspiration() {
    if (!this.data.hasDrawing) {
      showToast('请先绘画')
      return
    }

    if (!this.data.inspirationText.trim()) {
      showToast('请输入灵感描述')
      return
    }

    showLoading('正在保存...')

    try {
      // 将canvas转为图片
      wx.canvasToTempFilePath({
        canvasId: 'handwriteCanvas',
        success: (res) => {
          // 保存笔记
          const note = {
            title: this.data.inspirationText.substring(0, 20) + (this.data.inspirationText.length > 20 ? '...' : ''),
            content: this.data.inspirationText,
            tag: '灵感',
            type: 'drawing',
            images: [res.tempFilePath]
          }

          const savedNote = StorageManager.saveNote(note)
          hideLoading()

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
        fail: (err) => {
          console.error('保存图片失败', err)
          hideLoading()
          showToast('保存失败，请重试')
        }
      }, this)
    } catch (error) {
      console.error('保存错误', error)
      hideLoading()
      showToast('保存失败')
    }
  }
})
