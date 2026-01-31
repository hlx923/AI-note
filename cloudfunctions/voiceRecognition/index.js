// 云函数：语音识别
const cloud = require('wx-server-sdk')
const https = require('https')
const querystring = require('querystring')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 百度语音识别配置
const BAIDU_API_KEY = '33heSlTOAQ4MJlGAeNK9amxl'
const BAIDU_SECRET_KEY = 'hFqfz69kt6El2ivTEfzQ45W7bcfGYNyP'

// 获取百度Access Token
function getBaiduAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: BAIDU_API_KEY,
      client_secret: BAIDU_SECRET_KEY
    })

    const options = {
      hostname: 'aip.baidubce.com',
      path: '/oauth/2.0/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.access_token) {
            resolve(result.access_token)
          } else {
            reject(new Error('获取access_token失败: ' + data))
          }
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

// 语音识别
function recognizeVoice(audioBase64, token, dialect = 'mandarin') {
  return new Promise((resolve, reject) => {
    // 根据方言选择对应的dev_pid
    const dialectMap = {
      'mandarin': 1537,    // 普通话(支持简单的英文识别)
      'cantonese': 1637,   // 粤语
      'sichuan': 1837,     // 四川话
      'henan': 1936,       // 河南话
      'dongbei': 1946,     // 东北话
      'shanghainese': 1837 // 上海话（暂用四川话模型）
    }

    const devPid = dialectMap[dialect] || 1537

    const audioBuffer = Buffer.from(audioBase64, 'base64')
    const postData = JSON.stringify({
      format: 'mp3',
      rate: 16000,
      channel: 1,
      token: token,
      cuid: 'wx_miniprogram',
      dev_pid: devPid,
      len: audioBuffer.length,
      speech: audioBase64
    })

    const options = {
      hostname: 'vop.baidu.com',
      path: '/server_api',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

exports.main = async (event, context) => {
  try {
    const { fileID, dialect = 'mandarin' } = event

    console.log('开始语音识别，方言:', dialect)

    // 1. 从云存储下载音频文件
    const res = await cloud.downloadFile({
      fileID: fileID
    })

    const audioBuffer = res.fileContent
    const audioBase64 = audioBuffer.toString('base64')

    console.log('音频文件大小:', audioBuffer.length, 'bytes')

    // 2. 获取百度Access Token
    const token = await getBaiduAccessToken()
    console.log('获取access_token成功')

    // 3. 调用百度语音识别API
    const result = await recognizeVoice(audioBase64, token, dialect)
    console.log('百度API返回:', result)

    if (result.err_no === 0 && result.result && result.result.length > 0) {
      return {
        success: true,
        text: result.result[0]
      }
    } else {
      return {
        success: false,
        error: result.err_msg || '识别失败',
        errorCode: result.err_no
      }
    }
  } catch (error) {
    console.error('语音识别错误:', error)
    return {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }
}
