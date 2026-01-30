// utils/api.js - API接口封装
const app = getApp()

class APIManager {
  // 百度OCR文字识别
  static async baiduOCR(imagePath) {
    try {
      // 1. 获取access_token
      const token = await this.getBaiduAccessToken()

      // 2. 将图片转为base64
      const base64Image = await this.imageToBase64(imagePath)

      // 3. 调用OCR接口
      return new Promise((resolve, reject) => {
        wx.request({
          url: `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`,
          method: 'POST',
          header: {
            'content-type': 'application/x-www-form-urlencoded'
          },
          data: {
            image: base64Image,
            detect_direction: 'true',
            language_type: 'CHN_ENG'
          },
          success: (res) => {
            if (res.data.words_result) {
              const text = res.data.words_result.map(item => item.words).join('\n')
              resolve({ success: true, text })
            } else {
              reject(new Error('OCR识别失败'))
            }
          },
          fail: reject
        })
      })
    } catch (error) {
      console.error('OCR识别错误:', error)
      return { success: false, error: error.message }
    }
  }

  // 获取百度Access Token
  static async getBaiduAccessToken() {
    const config = app.globalData.apiConfig.baiduOCR

    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://aip.baidubce.com/oauth/2.0/token',
        method: 'POST',
        data: {
          grant_type: 'client_credentials',
          client_id: config.apiKey,
          client_secret: config.secretKey
        },
        success: (res) => {
          if (res.data.access_token) {
            resolve(res.data.access_token)
          } else {
            reject(new Error('获取token失败'))
          }
        },
        fail: reject
      })
    })
  }

  // 图片转Base64
  static imageToBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => resolve(res.data),
        fail: reject
      })
    })
  }

  // 微信原生语音识别（返回空文本，让用户手动输入）
  static async voiceToText(tempFilePath) {
    try {
      // 微信小程序的语音识别需要使用插件或云函数
      // 这里返回空文本，让用户手动输入录音内容
      console.log('语音文件路径:', tempFilePath)

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 500))

      // 返回空文本，提示用户手动输入
      return {
        success: true,
        text: ''
      }
    } catch (error) {
      console.error('语音转文字错误:', error)
      return {
        success: true,
        text: ''
      }
    }
  }

  // AI文本分析（使用简单的本地算法，可替换为云函数）
  static async analyzeText(text) {
    try {
      // 1. 提取关键词（简单实现：提取高频词）
      const keywords = this.extractKeywords(text)

      // 2. 生成标题（取前20个字）
      const title = this.generateTitle(text)

      // 3. 智能分类
      const tag = this.classifyText(text)

      // 4. 提取待办事项
      const todos = this.extractTodos(text)

      return {
        success: true,
        keywords,
        title,
        tag,
        todos
      }
    } catch (error) {
      console.error('文本分析错误:', error)
      return { success: false, error: error.message }
    }
  }

  // 提取关键词
  static extractKeywords(text) {
    // 简单实现：分词后统计频率
    const words = text.match(/[\u4e00-\u9fa5]{2,}/g) || []
    const wordCount = {}

    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })

    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(item => item[0])
  }

  // 生成标题
  static generateTitle(text) {
    const firstLine = text.split('\n')[0]
    return firstLine.length > 20 ? firstLine.substring(0, 20) + '...' : firstLine
  }

  // 文本分类
  static classifyText(text) {
    const categories = {
      '学习': ['课程', '学习', '作业', '考试', '复习', '笔记', '教材', '课件'],
      '工作': ['会议', '项目', '任务', '汇报', '客户', '合同', '方案', '计划'],
      '生活': ['购物', '健康', '运动', '饮食', '旅行', '家庭', '朋友'],
      '灵感': ['想法', '创意', '灵感', '点子', '思考', '感悟']
    }

    for (const [tag, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return tag
      }
    }

    return '生活'
  }

  // 提取待办事项
  static extractTodos(text) {
    const todoPatterns = [
      /(?:需要|要|待办|TODO|todo)[:：]?\s*(.+)/gi,
      /\d+[、.]\s*(.+)/g
    ]

    const todos = []
    todoPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match[1] && match[1].trim()) {
          todos.push(match[1].trim())
        }
      }
    })

    return todos
  }

  // 手写识别（使用百度手写文字识别）
  static async handwritingOCR(imagePath) {
    try {
      const token = await this.getBaiduAccessToken()
      const base64Image = await this.imageToBase64(imagePath)

      return new Promise((resolve, reject) => {
        wx.request({
          url: `https://aip.baidubce.com/rest/2.0/ocr/v1/handwriting?access_token=${token}`,
          method: 'POST',
          header: {
            'content-type': 'application/x-www-form-urlencoded'
          },
          data: {
            image: base64Image
          },
          success: (res) => {
            if (res.data.words_result) {
              const text = res.data.words_result.map(item => item.words).join('\n')
              resolve({ success: true, text })
            } else {
              reject(new Error('手写识别失败'))
            }
          },
          fail: reject
        })
      })
    } catch (error) {
      console.error('手写识别错误:', error)
      return { success: false, error: error.message }
    }
  }
}

module.exports = APIManager
