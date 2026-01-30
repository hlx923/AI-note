// 云函数：语音识别
const cloud = require('wx-server-sdk')
const request = require('request')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 百度语音识别配置
const BAIDU_API_KEY = '33heSlTOAQ4MJlGAeNK9amxl'
const BAIDU_SECRET_KEY = 'hFqfz69kt6El2ivTEfzQ45W7bcfGYNyP'

// 获取百度Access Token
function getBaiduAccessToken() {
  return new Promise((resolve, reject) => {
    request({
      url: 'https://aip.baidubce.com/oauth/2.0/token',
      method: 'POST',
      form: {
        grant_type: 'client_credentials',
        client_id: BAIDU_API_KEY,
        client_secret: BAIDU_SECRET_KEY
      }
    }, (error, response, body) => {
      if (error) {
        reject(error)
      } else {
        const data = JSON.parse(body)
        resolve(data.access_token)
      }
    })
  })
}

// 语音识别
function recognizeVoice(audioBase64, token) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://vop.baidu.com/server_api?cuid=wx_miniprogram&token=${token}&dev_pid=1537`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        format: 'mp3',
        rate: 16000,
        channel: 1,
        token: token,
        cuid: 'wx_miniprogram',
        len: Buffer.from(audioBase64, 'base64').length,
        speech: audioBase64
      })
    }, (error, response, body) => {
      if (error) {
        reject(error)
      } else {
        const data = JSON.parse(body)
        resolve(data)
      }
    })
  })
}

exports.main = async (event, context) => {
  try {
    const { fileID } = event

    // 1. 从云存储下载音频文件
    const res = await cloud.downloadFile({
      fileID: fileID
    })

    const audioBuffer = res.fileContent
    const audioBase64 = audioBuffer.toString('base64')

    // 2. 获取百度Access Token
    const token = await getBaiduAccessToken()

    // 3. 调用百度语音识别API
    const result = await recognizeVoice(audioBase64, token)

    if (result.err_no === 0 && result.result && result.result.length > 0) {
      return {
        success: true,
        text: result.result[0]
      }
    } else {
      return {
        success: false,
        error: result.err_msg || '识别失败'
      }
    }
  } catch (error) {
    console.error('语音识别错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
