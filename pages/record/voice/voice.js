// pages/record/voice/voice.js
const StorageManager = require('../../../utils/storage.js')
const APIManager = require('../../../utils/api.js')
const { showToast, showLoading, hideLoading, showConfirm } = require('../../../utils/util.js')

const recorderManager = wx.getRecorderManager()

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
  },

  onUnload() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
    recorderManager.stop()
  },

  // 初始化录音管理器
  initRecorder() {
    // 录音开始
    recorderManager.onStart(() => {
      console.log('录音开始')
      this.startTimer()
    })

    // 录音暂停
    recorderManager.onPause(() => {
      console.log('录音暂停')
      this.pauseTimer()
    })

    // 录音继续
    recorderManager.onResume(() => {
      console.log('录音继续')
      this.resumeTimer()
    })

    // 录音停止
    recorderManager.onStop((res) => {
      console.log('录音停止', res)
      this.setData({
        tempFilePath: res.tempFilePath
      })
      this.stopTimer()
      this.convertVoiceToText(res.tempFilePath)
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
        recorderManager.start({
          duration: 60000,
          format: 'mp3',
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 48000
        })
        this.setData({
          isRecording: true,
          isPaused: false
        })
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

  // 暂停录音
  pauseRecord() {
    recorderManager.pause()
    this.setData({
      isPaused: true
    })
  },

  // 继续录音
  resumeRecord() {
    recorderManager.resume()
    this.setData({
      isPaused: false
    })
  },

  // 停止录音
  stopRecord() {
    recorderManager.stop()
    this.setData({
      isRecording: false,
      isPaused: false
    })
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

  // 语音转文字
  async convertVoiceToText(filePath) {
    showLoading('正在转写...')

    try {
      // 调用语音识别API（这里使用模拟数据，实际应用中需要接入真实的语音识别服务）
      const result = await APIManager.voiceToText(filePath)

      hideLoading()

      if (result.success) {
        this.setData({
          recognizedText: result.text
        })
        this.showOrganizePrompt()
      } else {
        showToast('转写失败，请重试')
      }
    } catch (error) {
      console.error('语音转文字错误', error)
      hideLoading()
      // 使用模拟数据
      this.setData({
        recognizedText: '这是一段模拟的语音转写文本。在实际应用中，这里会显示真实的语音识别结果。您可以在这里记录会议内容、课堂笔记或者日常想法。'
      })
      this.showOrganizePrompt()
    }
  },

  // 显示规整提示
  async showOrganizePrompt() {
    const confirm = await showConfirm('转写完成，是否进行AI规整？', '提示')
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
