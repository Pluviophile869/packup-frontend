Page({
  // 页面初始数据
  data: {
    place: '',       // 旅行地点
    days: '',        // 旅行天数
    weatherIndex: 0, // 天气选择索引
    weatherList: ['晴天', '雨天', '寒冷', '炎热'], // 天气选项
    typeIndex: 0,    // 旅行类型索引
    typeList: ['休闲旅行', '户外徒步', '商务出行'], // 旅行类型选项
    activities: ['城市观光', '户外徒步', '海边玩水', '博物馆/室内', '商务会议'], // 行程活动选项
    selectedActivities: [], // 选中的活动
    physiqueIndex: 0, // 体质选择索引
    physiqueList: ['无特殊情况', '怕热', '怕冷', '鼻炎/过敏', '易晕车/晕船'] // 体质选项
  },

  // 输入旅行地点
  setPlace(e) {
    this.setData({
      place: e.detail.value
    })
  },

  // 输入旅行天数
  setDays(e) {
    this.setData({
      days: e.detail.value
    })
  },

  // 选择天气
  setWeather(e) {
    this.setData({
      weatherIndex: e.detail.value
    })
  },

  // 选择旅行类型
  setType(e) {
    this.setData({
      typeIndex: e.detail.value
    })
  },

  // 行程活动多选事件
  onActivityChange(e) {
    this.setData({
      selectedActivities: e.detail.value
    })
  },

  // 选择体质事件
  setPhysique(e) {
    this.setData({
      physiqueIndex: e.detail.value
    })
  },

  // 生成清单（跳转结果页）
  getList() {
    // 简单校验：地点和天数不能为空
    if (!this.data.place || !this.data.days) {
      wx.showToast({
        title: '请填写地点和天数',
        icon: 'none',
        duration: 2000
      })
      return;
    }

    // 跳转到结果页，并传递所有参数
    wx.navigateTo({
      url: `/pages/result/result?place=${this.data.place}&days=${this.data.days}&weatherIndex=${this.data.weatherIndex}&typeIndex=${this.data.typeIndex}&selectedActivities=${JSON.stringify(this.data.selectedActivities)}&physiqueIndex=${this.data.physiqueIndex}`
    })
  }
})