// pages/record/voice/voice.js
const StorageManager = require('../../../utils/storage.js')
const APIManager = require('../../../utils/api.js')
const { showToast, showLoading, hideLoading, showConfirm } = require('../../../utils/util.js')

const recorderManager = wx.getRecorderManager()
const plugin = requirePlugin("WechatSI")
const manager = plugin.getRecordRecognitionManager()

Page({
  data: {
    isRecording: false,
    isPaused: false,
    recordTime: 0,
    recognizedText: '',
    timer: null,
    tempFilePath: ''
  },

  onLoad() {
    this.initRecorder()
    this.initRecognition()
  },

  onUnload() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
    recorderManager.stop()
    manager.stop()
  },

  // 初始化语音识别
  initRecognition() {
    // 识别开始
    manager.onStart = () => {
      console.log('语音识别开始')
    }

    // 识别结束
    manager.onStop = (res) => {
      console.log('语音识别结束', res)
    }

    // 识别结果
    manager.onRecognize = (res) => {
      console.log('识别中:', res.result)
      // 实时显示识别结果
      this.setData({
        recognizedText: res.result
      })
    }

    // 识别错误
    manager.onError = (err) => {
      console.error('识别错误', err)
      showToast('识别失败，请重试')
    }
  },

  // 初始化录音管理器（保留用于兼容性）
  initRecorder() {
    // 录音停止
    recorderManager.onStop((res) => {
      console.log('录音停止', res)
      this.setData({
        tempFilePath: res.tempFilePath
      })
    })

    // 录音错误
    recorderManager.onError((err) => {
      console.error('录音错误', err)
      showToast('录音失败，请重试')
      this.resetRecorder()
    })
  },

  // 开始录音
  startRecord() {
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        // 使用微信同声传译插件进行实时语音识别
        manager.start({
          lang: 'zh_CN', // 中文识别
          duration: 60000 // 最长60秒
        })

        this.setData({
          isRecording: true,
          isPaused: false,
          recognizedText: ''
        })
        this.startTimer()
      },
      fail: () => {
        wx.showModal({
          title: '需要录音权限',
          content: '请在设置中开启录音权限',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  // 暂停录音（微信同声传译插件不支持暂停，改为停止）
  pauseRecord() {
    showToast('语音识别不支持暂停，请直接完成录音')
  },

  // 继续录音（不支持）
  resumeRecord() {
    showToast('语音识别不支持暂停，请重新开始录音')
  },

  // 停止录音
  stopRecord() {
    manager.stop()
    this.setData({
      isRecording: false,
      isPaused: false,
      tempFilePath: 'completed' // 标记录音完成
    })
    this.stopTimer()

    // 检查是否有识别结果
    if (this.data.recognizedText) {
      showToast('识别完成', 'success')
    } else {
      showToast('未识别到内容，请手动输入', 'none')
    }
  },

  // 删除当前录音
  async deleteRecord() {
    const confirm = await showConfirm('确定删除当前录音吗？')
    if (confirm) {
      this.resetRecorder()
      showToast('已删除', 'success')
    }
  },

  // 重置录音器
  resetRecorder() {
    this.stopTimer()
    manager.stop()
    this.setData({
      isRecording: false,
      isPaused: false,
      recordTime: 0,
      recognizedText: '',
      tempFilePath: ''
    })
  },

  // 开始计时
  startTimer() {
    this.data.timer = setInterval(() => {
      this.setData({
        recordTime: this.data.recordTime + 1
      })
    }, 1000)
  },

  // 暂停计时
  pauseTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
      this.data.timer = null
    }
  },

  // 继续计时
  resumeTimer() {
    this.startTimer()
  },

  // 停止计时
  stopTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
      this.data.timer = null
    }
  },

  // 文本输入事件
  onTextInput(e) {
    this.setData({
      recognizedText: e.detail.value
    })
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
          type: 'voice'
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
      type: 'voice'
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

  // 格式化时间显示
  formatTime(seconds) {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }
})
