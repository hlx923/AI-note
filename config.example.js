// config.example.js - 配置文件示例
// 使用说明：
// 1. 复制此文件并重命名为 config.js
// 2. 填入你自己的真实配置信息
// 3. config.js 已被 .gitignore 忽略，不会被提交到 Git

module.exports = {
  // 微信小程序配置
  wechat: {
    // 小程序 AppID（在微信公众平台获取）
    appId: 'YOUR_WECHAT_APPID',

    // 云开发环境 ID（在微信云开发控制台获取）
    cloudEnvId: 'YOUR_CLOUD_ENV_ID'
  },

  // 百度 OCR API 配置（可选，如需使用 OCR 功能）
  baiduOCR: {
    // API Key（在百度智能云控制台获取）
    apiKey: 'YOUR_BAIDU_API_KEY',

    // Secret Key（在百度智能云控制台获取）
    secretKey: 'YOUR_BAIDU_SECRET_KEY'
  },

  // 语音识别 API 配置（可选，如需使用语音功能）
  voiceAPI: {
    // 应用 ID（根据使用的语音服务提供商获取）
    appId: 'YOUR_VOICE_APP_ID',

    // API Key（如需要）
    apiKey: 'YOUR_VOICE_API_KEY',

    // Secret Key（如需要）
    secretKey: 'YOUR_VOICE_SECRET_KEY'
  },

  // 其他第三方服务配置（根据需要添加）
  other: {
    // 示例：AI 文本分析服务
    aiService: {
      apiKey: 'YOUR_AI_SERVICE_KEY',
      endpoint: 'https://api.example.com'
    }
  }
}
