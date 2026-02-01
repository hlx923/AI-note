// pages/record/template/template.js
const StorageManager = require('../../../utils/storage.js')

Page({
  data: {
    selectedTemplate: '', // 当前选择的模板类型
    formData: {
      title: '',
      // 学习笔记字段
      knowledge: '',
      mistakes: '',
      keyPoints: '',
      // 工作待办字段
      todoList: [''],
      doneList: '',
      deadline: '',
      // 生活清单字段
      shopping: '',
      travel: '',
      checkin: ''
    }
  },

  // 选择模板
  selectTemplate(e) {
    const type = e.currentTarget.dataset.type
    console.log('选择模板:', type)
    console.log('当前 selectedTemplate:', this.data.selectedTemplate)

    const newFormData = this.getDefaultFormData(type)
    console.log('新表单数据:', newFormData)

    this.setData({
      selectedTemplate: type,
      formData: newFormData
    }, () => {
      console.log('setData 完成')
      console.log('更新后的 selectedTemplate:', this.data.selectedTemplate)
      console.log('更新后的 formData:', this.data.formData)
    })
  },

  // 获取默认表单数据
  getDefaultFormData(type) {
    const baseData = { title: '' }

    switch(type) {
      case 'study':
        return { ...baseData, knowledge: '', mistakes: '', keyPoints: '' }
      case 'work':
        return { ...baseData, todoList: [''], doneList: '', deadline: '' }
      case 'life':
        return { ...baseData, shoppingList: [{name: '', quantity: ''}], travel: '', checkin: '' }
      default:
        return baseData
    }
  },

  // 取消模板
  cancelTemplate() {
    this.setData({
      selectedTemplate: '',
      formData: {}
    })
  },

  // 表单输入处理
  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    })
  },

  // 学习笔记输入
  onKnowledgeInput(e) {
    this.setData({
      'formData.knowledge': e.detail.value
    })
  },

  onMistakesInput(e) {
    this.setData({
      'formData.mistakes': e.detail.value
    })
  },

  onKeyPointsInput(e) {
    this.setData({
      'formData.keyPoints': e.detail.value
    })
  },

  // 工作待办输入
  onTodoInput(e) {
    const index = e.currentTarget.dataset.index
    const todoList = this.data.formData.todoList
    todoList[index] = e.detail.value
    this.setData({
      'formData.todoList': todoList
    })
  },

  addTodo() {
    const todoList = this.data.formData.todoList
    todoList.push('')
    this.setData({
      'formData.todoList': todoList
    })
  },

  deleteTodo(e) {
    const index = e.currentTarget.dataset.index
    const todoList = this.data.formData.todoList
    if (todoList.length > 1) {
      todoList.splice(index, 1)
      this.setData({
        'formData.todoList': todoList
      })
    }
  },

  onDoneInput(e) {
    this.setData({
      'formData.doneList': e.detail.value
    })
  },

  onDeadlineChange(e) {
    this.setData({
      'formData.deadline': e.detail.value
    })
  },

  // 生活清单输入
  onShoppingNameInput(e) {
    const index = e.currentTarget.dataset.index
    const shoppingList = this.data.formData.shoppingList
    shoppingList[index].name = e.detail.value
    this.setData({
      'formData.shoppingList': shoppingList
    })
  },

  onShoppingQuantityInput(e) {
    const index = e.currentTarget.dataset.index
    const shoppingList = this.data.formData.shoppingList
    shoppingList[index].quantity = e.detail.value
    this.setData({
      'formData.shoppingList': shoppingList
    })
  },

  addShoppingItem() {
    const shoppingList = this.data.formData.shoppingList
    shoppingList.push({name: '', quantity: ''})
    this.setData({
      'formData.shoppingList': shoppingList
    })
  },

  deleteShoppingItem(e) {
    const index = e.currentTarget.dataset.index
    const shoppingList = this.data.formData.shoppingList
    if (shoppingList.length > 1) {
      shoppingList.splice(index, 1)
      this.setData({
        'formData.shoppingList': shoppingList
      })
    }
  },

  onTravelInput(e) {
    this.setData({
      'formData.travel': e.detail.value
    })
  },

  onCheckinInput(e) {
    this.setData({
      'formData.checkin': e.detail.value
    })
  },

  // 保存笔记
  saveNote() {
    const { selectedTemplate, formData } = this.data

    // 验证标题
    if (!formData.title || formData.title.trim() === '') {
      wx.showToast({
        title: '请输入标题',
        icon: 'none'
      })
      return
    }

    // 根据模板类型生成内容和关键词
    let content = ''
    let keywords = []
    let tag = ''

    switch(selectedTemplate) {
      case 'study':
        tag = '学习笔记'
        keywords = ['学习', '知识点', '考点']
        content = this.formatStudyNote(formData)
        break
      case 'work':
        tag = '工作待办'
        keywords = ['工作', '待办', '任务']
        content = this.formatWorkNote(formData)
        break
      case 'life':
        tag = '生活清单'
        keywords = ['生活', '清单', '计划']
        content = this.formatLifeNote(formData)
        break
    }

    // 保存笔记
    const note = {
      title: formData.title,
      content: content,
      tag: tag,
      keywords: keywords,
      type: 'template',
      templateType: selectedTemplate,
      templateData: formData
    }

    const savedNote = StorageManager.saveNote(note)

    if (savedNote) {
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } else {
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 格式化学习笔记内容
  formatStudyNote(data) {
    let content = ''
    if (data.knowledge) {
      content += `【知识点】\n${data.knowledge}\n\n`
    }
    if (data.mistakes) {
      content += `【错题记录】\n${data.mistakes}\n\n`
    }
    if (data.keyPoints) {
      content += `【考点总结】\n${data.keyPoints}`
    }
    return content.trim()
  },

  // 格式化工作待办内容
  formatWorkNote(data) {
    let content = ''
    if (data.todoList && data.todoList.length > 0) {
      const todos = data.todoList.filter(item => item.trim() !== '')
      if (todos.length > 0) {
        content += `【待做事项】\n${todos.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n`
      }
    }
    if (data.doneList) {
      content += `【已完成】\n${data.doneList}\n\n`
    }
    if (data.deadline) {
      content += `【截止时间】\n${data.deadline}`
    }
    return content.trim()
  },

  // 格式化生活清单内容
  formatLifeNote(data) {
    let content = ''
    if (data.shoppingList && data.shoppingList.length > 0) {
      const items = data.shoppingList.filter(item => item.name.trim() !== '')
      if (items.length > 0) {
        content += `【购物清单】\n${items.map(item => `${item.name} × ${item.quantity || 1}`).join('\n')}\n\n`
      }
    }
    if (data.travel) {
      content += `【出行计划】\n${data.travel}\n\n`
    }
    if (data.checkin) {
      content += `【打卡记录】\n${data.checkin}`
    }
    return content.trim()
  }
})
