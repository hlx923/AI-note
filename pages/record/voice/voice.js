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
    tempFilePath: '',
    mode: 'normal', // normal: 普通模式, meeting: 会议纪要模式
    showModeSelector: false,
    speakers: [], // 说话人列表
    showSpeakerModal: false,
    currentSpeaker: '',
    newSpeakerName: '',
    dialect: 'mandarin', // 方言选择: mandarin(普通话), cantonese(粤语), sichuan(四川话), etc.
    showDialectSelector: false,
    dialectList: [
      { code: 'mandarin', name: '普通话', desc: '标准普通话识别' },
      { code: 'cantonese', name: '粤语', desc: '广东话识别' },
      { code: 'sichuan', name: '四川话', desc: '四川方言识别' },
      { code: 'henan', name: '河南话', desc: '河南方言识别' },
      { code: 'dongbei', name: '东北话', desc: '东北方言识别' },
      { code: 'shanghainese', name: '上海话', desc: '上海方言识别' }
    ]
  },

  onLoad() {
    this.initRecorder()
    // 检查是否从会议纪要入口进入
    const mode = wx.getStorageSync('voiceMode') || 'normal'
    // 加载用户偏好的方言设置
    const dialect = wx.getStorageSync('preferredDialect') || 'mandarin'
    this.setData({ mode, dialect })
    wx.removeStorageSync('voiceMode')
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
    })

    // 录音停止
    recorderManager.onStop((res) => {
      console.log('录音停止', res)
      this.setData({
        tempFilePath: res.tempFilePath
      })
      this.stopTimer()
      // 调用语音识别
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

  // 暂停录音
  pauseRecord() {
    recorderManager.pause()
    this.setData({
      isPaused: true
    })
    this.pauseTimer()
  },

  // 继续录音
  resumeRecord() {
    recorderManager.resume()
    this.setData({
      isPaused: false
    })
    this.resumeTimer()
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
    showLoading('正在识别...')

    try {
      // 上传音频文件到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: `voice/${Date.now()}.mp3`,
        filePath: filePath
      })

      // 调用云函数进行语音识别，传入方言参数
      const result = await wx.cloud.callFunction({
        name: 'voiceRecognition',
        data: {
          fileID: uploadResult.fileID,
          dialect: this.data.dialect // 传入方言参数
        }
      })

      hideLoading()

      console.log('云函数返回结果:', result)

      if (result.result.success) {
        this.setData({
          recognizedText: result.result.text
        })
        showToast('识别完成', 'success')
      } else {
        console.error('识别失败原因:', result.result.error)
        showToast(`识别失败: ${result.result.error || '请手动输入'}`)
        this.setData({
          recognizedText: ''
        })
      }
    } catch (error) {
      console.error('语音识别错误', error)
      hideLoading()
      showToast('识别失败，请手动输入')
      this.setData({
        recognizedText: ''
      })
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
  },

  // 切换模式选择器
  toggleModeSelector() {
    this.setData({
      showModeSelector: !this.data.showModeSelector
    })
  },

  // 选择模式
  selectMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      mode,
      showModeSelector: false,
      recognizedText: '',
      speakers: mode === 'meeting' ? [] : this.data.speakers
    })
  },

  // 显示说话人弹窗
  showAddSpeaker() {
    this.setData({
      showSpeakerModal: true,
      newSpeakerName: ''
    })
  },

  // 隐藏说话人弹窗
  hideSpeakerModal() {
    this.setData({
      showSpeakerModal: false,
      newSpeakerName: ''
    })
  },

  // 说话人名称输入
  onSpeakerNameInput(e) {
    this.setData({
      newSpeakerName: e.detail.value
    })
  },

  // 添加说话人
  addSpeaker() {
    const name = this.data.newSpeakerName.trim()
    if (!name) {
      showToast('请输入说话人姓名')
      return
    }

    if (this.data.speakers.includes(name)) {
      showToast('该说话人已存在')
      return
    }

    this.setData({
      speakers: [...this.data.speakers, name],
      showSpeakerModal: false,
      newSpeakerName: ''
    })
    showToast('添加成功', 'success')
  },

  // 选择说话人
  selectSpeaker(e) {
    const speaker = e.currentTarget.dataset.speaker
    this.setData({
      currentSpeaker: speaker
    })
  },

  // 插入说话人标记
  insertSpeakerText() {
    if (!this.data.currentSpeaker) {
      showToast('请先选择说话人')
      return
    }

    const speakerTag = `\n【${this.data.currentSpeaker}】：`
    this.setData({
      recognizedText: this.data.recognizedText + speakerTag
    })
  },

  // 删除说话人
  deleteSpeaker(e) {
    const speaker = e.currentTarget.dataset.speaker
    const speakers = this.data.speakers.filter(s => s !== speaker)
    this.setData({
      speakers,
      currentSpeaker: this.data.currentSpeaker === speaker ? '' : this.data.currentSpeaker
    })
    showToast('已删除', 'success')
  },

  // 保存会议纪要
  async saveMeeting() {
    if (!this.data.recognizedText) {
      showToast('没有可保存的内容')
      return
    }

    const note = {
      title: `【会议纪要】${new Date().toLocaleDateString()}`,
      content: this.data.recognizedText,
      tag: '会议',
      keywords: ['会议', ...this.data.speakers],
      type: 'meeting',
      meetingData: {
        speakers: this.data.speakers,
        date: new Date().toISOString()
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

  // 切换方言选择器
  toggleDialectSelector() {
    this.setData({
      showDialectSelector: !this.data.showDialectSelector
    })
  },

  // 选择方言
  selectDialect(e) {
    const dialect = e.currentTarget.dataset.dialect
    this.setData({
      dialect,
      showDialectSelector: false
    })
    // 保存用户偏好
    wx.setStorageSync('preferredDialect', dialect)
    showToast('已切换方言', 'success')
  },

  // 获取方言名称
  getDialectName() {
    const dialectItem = this.data.dialectList.find(d => d.code === this.data.dialect)
    return dialectItem ? dialectItem.name : '普通话'
  }
})
