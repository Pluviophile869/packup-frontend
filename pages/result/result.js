Page({
  data: {
    // 接收首页参数
    place: '',
    days: '',
    weatherIndex: 0,
    weatherList: ['晴天', '雨天', '寒冷', '炎热'],
    typeIndex: 0,
    typeList: ['休闲旅行', '户外徒步', '商务出行'],
    selectedActivities: [], // 选中的行程活动
    physiqueIndex: 0,
    physiqueList: ['无特殊情况', '怕热', '怕冷', '鼻炎/过敏', '易晕车/晕船'],
    secondaryColor: '#8EE4AF', // 薄荷绿（勾选框颜色）
    
    // 分类清单（初始空，页面加载时动态生成）
    listCategories: []
  },

  // 页面加载：接收参数+生成动态清单
  onLoad(options) {
    // 1. 接收首页传递的参数
    this.setData({
      place: options.place,
      days: options.days,
      weatherIndex: options.weatherIndex,
      typeIndex: options.typeIndex,
      selectedActivities: JSON.parse(options.selectedActivities || '[]'),
      physiqueIndex: options.physiqueIndex
    })

    // 2. 生成动态分类清单
    this.generateList();
  },

  // 核心：根据天气/活动/体质生成动态清单
  generateList() {
    const { weatherIndex, selectedActivities, physiqueIndex } = this.data;
    const weather = this.data.weatherList[weatherIndex];
    const physique = this.data.physiqueList[physiqueIndex];

    // 初始化分类清单
    let listCategories = [
      { title: '👔 衣物推荐', items: [] },
      { title: '🆔 必备证件', items: [] },
      { title: '💊 健康提醒', items: [] },
      { title: '🧰 实用物品', items: [] }
    ];

    // ========== 1. 衣物推荐（根据天气/体质/活动） ==========
    const clothes = listCategories[0].items;
    // 基础衣物
    clothes.push({ name: '换洗衣物（按天数准备）', checked: true });
    clothes.push({ name: '舒适内裤/袜子', checked: true });
    // 天气适配
    if (weather === '晴天') {
      clothes.push({ name: '防晒衣/冰袖', checked: true });
      clothes.push({ name: '遮阳帽/墨镜', checked: true });
    }
    if (weather === '雨天') {
      clothes.push({ name: '雨衣/折叠伞', checked: true });
      clothes.push({ name: '防水鞋套', checked: false });
    }
    if (weather === '寒冷') {
      clothes.push({ name: '羽绒服/厚外套', checked: true });
      clothes.push({ name: '围巾/手套', checked: true });
    }
    if (weather === '炎热') {
      clothes.push({ name: '透气T恤/短裤', checked: true });
      clothes.push({ name: '凉拖', checked: true });
    }
    // 体质适配
    if (physique === '怕热') clothes.push({ name: '冰丝背心', checked: true });
    if (physique === '怕冷') clothes.push({ name: '保暖内衣', checked: true });
    // 活动适配
    if (selectedActivities.includes('户外徒步')) clothes.push({ name: '登山鞋', checked: true });
    if (selectedActivities.includes('海边玩水')) clothes.push({ name: '泳衣/沙滩鞋', checked: true });
    if (selectedActivities.includes('商务会议')) clothes.push({ name: '正装/高跟鞋', checked: true });

    // ========== 2. 必备证件 ==========
    const certificates = listCategories[1].items;
    certificates.push({ name: '身份证/护照', checked: true });
    certificates.push({ name: '手机（含景区预约码截图）', checked: true });
    certificates.push({ name: '银行卡/少量现金', checked: true });
    if (selectedActivities.includes('博物馆/室内')) certificates.push({ name: '学生证（如有，可打折）', checked: false });

    // ========== 3. 健康提醒（根据体质） ==========
    const health = listCategories[2].items;
    health.push({ name: '创可贴/碘伏', checked: false });
    health.push({ name: '感冒药/退烧药', checked: false });
    if (physique === '鼻炎/过敏') health.push({ name: '氯雷他定/抗过敏药', checked: true });
    if (physique === '易晕车/晕船') health.push({ name: '晕车药/晕车贴', checked: true });
    if (selectedActivities.includes('户外徒步')) health.push({ name: '驱蚊液/止痒膏', checked: true });

    // ========== 4. 实用物品 ==========
    const tools = listCategories[3].items;
    tools.push({ name: '手机充电器/充电宝', checked: true });
    tools.push({ name: '洗漱用品（牙刷牙膏）', checked: true });
    tools.push({ name: '纸巾/湿巾', checked: true });
    tools.push({ name: '保温杯/矿泉水', checked: false });

    // 更新到页面
    this.setData({ listCategories });
  },

  // 保存为模板（存到本地缓存）
  saveAsTemplate() {
    const templateName = `${this.data.place}_${this.data.days}天`;
    wx.setStorageSync(`packup_template_${Date.now()}`, {
      name: templateName,
      list: this.data.listCategories
    });
    wx.showToast({
      title: '模板保存成功✅',
      icon: 'success',
      duration: 2000
    });
  },

  // 返回首页
  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  // 分享清单（小程序默认分享）
  onShareAppMessage() {
    return {
      title: `我的${this.data.place}旅行行李清单 | Packup`,
      path: `/pages/result/result?place=${this.data.place}&days=${this.data.days}`,
      imageUrl: ''
    };
  }
});