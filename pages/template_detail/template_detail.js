// pages/template_detail/template_detail.js
// 导入接口
import {
  getTripById,
  getPackingItemsByTrip,
  saveTripAsTemplate,
  applyTemplate,
  getAllTemplates,
  createTemplate
} from '../../api/user';

Page({
  data: {
    template: {},
    listCategories: [],
    totalItems: 0,
    isLoading: false,
    templateId: null,
    tripId: null,
    isFromServer: false, // 标记数据是否来自服务器
    templateInfo: null,   // 模板信息
    tripInfo: null,        // 行程信息
    
    // 添加和result页相同的辅助数据
    weatherList: ['晴天', '雨天', '寒冷', '炎热'],
    typeList: ['休闲旅行', '户外徒步', '商务出行'],
    physiqueList: ['无特殊情况', '怕热', '怕冷', '鼻炎/过敏', '易晕车/晕船'],
    
    // 分类显示名称映射
    categoryDisplayNames: {},
    availableCategories: []
  },

  onLoad(options) {
    console.log('模板详情页接收到的参数：', options);
    
    // 获取传递过来的参数
    const templateId = options.id;
    const tripId = options.tripId; // 可能直接传入行程ID
    
    // 使用setData正确设置数据
    const dataToSet = {};
    if (templateId) dataToSet.templateId = templateId;
    if (tripId) dataToSet.tripId = tripId;
    
    this.setData(dataToSet, () => {
      console.log('设置的templateId：', this.data.templateId);
      console.log('设置的tripId：', this.data.tripId);
      
      if (tripId) {
        // 如果有行程ID，从服务器加载行程详情（使用和result页一样的方式）
        this.loadTripDetail(tripId);
      } else if (templateId) {
        // 如果有模板ID，加载模板详情
        this.loadTemplateDetail(templateId);
      } else {
        console.error('未接收到任何ID');
        wx.showToast({
          title: '参数错误',
          icon: 'none',
          complete: () => {
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          }
        });
      }
    });
  },

  /**
   * 加载行程详情 - 修改为和result页一样的方式
   * @param {number} tripId - 行程ID
   */
  async loadTripDetail(tripId) {
    this.setData({ isLoading: true });
    
    try {
      console.log('========== 开始加载行程数据 ==========');
      console.log('【1. 请求的tripId】:', tripId);
      
      // 获取行程详情
      console.log('【2. 开始请求行程接口】');
      const tripRes = await getTripById(tripId);
      console.log('【3. 行程接口返回】:', tripRes);
      
      // 处理行程数据
      let trip = null;
      if (tripRes && tripRes.data) {
        trip = tripRes.data;
      } else if (tripRes && tripRes.success && tripRes.data) {
        trip = tripRes.data;
      } else {
        trip = tripRes;
      }
      
      if (trip) {
        console.log('【4. 处理后的行程】:', trip);
        this.setData({
          tripInfo: trip
        });
      }
      
      // 获取打包物品列表 - 和result页完全一样的处理逻辑
      console.log('【5. 开始请求物品接口】');
      const itemsRes = await getPackingItemsByTrip(tripId);
      console.log('【6. 物品接口原始返回】:', itemsRes);

      // --- 和result页完全一样的数据处理逻辑 ---
      let items = [];
      if (itemsRes) {
        // 情况1: {success: true, data: [...]}
        if (itemsRes.success === true && itemsRes.data && Array.isArray(itemsRes.data)) {
          items = itemsRes.data;
          console.log('【7.1 识别为 success.data 格式】, 物品数量:', items.length);
        } 
        // 情况2: 直接返回数组
        else if (Array.isArray(itemsRes)) {
          items = itemsRes;
          console.log('【7.2 识别为 直接数组 格式】, 物品数量:', items.length);
        }
        // 情况3: 返回对象包含 data 字段且 data 是数组
        else if (itemsRes.data && Array.isArray(itemsRes.data)) {
          items = itemsRes.data;
          console.log('【7.3 识别为 data 数组 格式】, 物品数量:', items.length);
        }
        // 情况4: 返回对象包含 records 字段且 records 是数组
        else if (itemsRes.records && Array.isArray(itemsRes.records)) {
          items = itemsRes.records;
          console.log('【7.4 识别为 records 数组 格式】, 物品数量:', items.length);
        }
        else {
          console.log('【7.5 未识别的格式，尝试将整个返回视为物品列表】');
          items = Array.isArray(itemsRes) ? itemsRes : [];
        }
      } else {
        console.log('【7.6 itemsRes 为空】');
        items = [];
      }
      // ---------------------------------------------

      console.log('【8. 最终物品数组】:', items);
      console.log('【9. 物品数量】:', items.length);
      
      // 从物品中提取分类 - 使用和result页相同的辅助函数
      const categories = this.extractCategoriesFromItems(items);
      console.log('【10. 提取的分类】:', categories);
      
      const categoryDisplayNames = this.generateCategoryDisplayNames(categories);
      console.log('【11. 分类显示名称映射】:', categoryDisplayNames);
      
      // 转换物品为分类格式 - 使用和result页相同的辅助函数
      console.log('【12. 开始转换物品为分类格式】');
      const listCategories = this.convertItemsToCategories(items, categoryDisplayNames);
      console.log('【13. 转换后的分类数据】:', listCategories.map(cat => ({
        title: cat.title,
        originalCategory: cat.originalCategory,
        count: cat.items.length
      })));
      
      // 计算总物品数
      const totalItems = this.calculateTotalItems(listCategories);
      console.log('【14. 总物品数】:', totalItems);
      
      // 构建模板对象
      const template = this.buildTemplateFromTrip(trip, items, tripId);
      
      console.log('========== 数据加载完成 ==========');
      
      this.setData({
        template: template,
        listCategories: listCategories,
        totalItems: totalItems,
        availableCategories: categories,
        categoryDisplayNames: categoryDisplayNames,
        isLoading: false,
        isFromServer: true
      });
      
    } catch (error) {
      console.log('========== 错误信息 ==========');
      console.error('【错误】加载行程详情失败:', error);
      console.error('【错误信息】', error.message);
      
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    }
  },

  /**
   * 从物品中提取所有唯一的分类 - 和result页完全一样
   */
  extractCategoriesFromItems(items) {
    console.log('【extractCategoriesFromItems】输入:', items);
    
    const categorySet = new Set();
    
    if (items && Array.isArray(items)) {
      items.forEach(item => {
        if (item && item.category) {
          categorySet.add(item.category);
          console.log('添加分类:', item.category);
        }
      });
    }
    
    // 确保至少有一个"其他物品"分类
    if (!categorySet.has('其他物品')) {
      categorySet.add('其他物品');
    }
    
    // 如果没有提取到任何分类，返回默认分类
    if (categorySet.size === 0 || (categorySet.size === 1 && categorySet.has('其他物品'))) {
      console.log('使用默认分类');
      return ['重要文件', '电子产品', '衣物', '个人护理', '药品', '防护用品', '财务', '其他物品'];
    }
    
    const result = Array.from(categorySet).sort();
    console.log('【extractCategoriesFromItems】输出:', result);
    return result;
  },

  /**
   * 生成分类显示名称映射 - 和result页完全一样
   */
  generateCategoryDisplayNames(categories) {
    const displayNameMap = {};
    
    const defaultDisplayNames = {
      '重要文件': '📄 重要证件',
      '电子产品': '📱 电子设备',
      '衣物': '👔 衣物推荐',
      '个人护理': '🧴 洗漱用品',
      '药品': '💊 健康提醒',
      '防护用品': '🛡️ 防护用品',
      '财务': '💰 财务用品',
      '其他物品': '📦 其他物品',
      '行李用品': '🧳 行李用品',
      '洗漱用品': '🧴 洗漱用品',
      '电子设备': '📱 电子设备',
      '衣物鞋包': '👔 衣物推荐',
      '洗漱护肤': '🧴 洗漱用品',
      '药品健康': '💊 健康提醒',
      '医疗用品': '💊 健康提醒',
      '重要物品': '📄 重要证件'
    };
    
    categories.forEach(category => {
      displayNameMap[category] = defaultDisplayNames[category] || `📌 ${category}`;
    });
    
    return displayNameMap;
  },

  /**
   * 将后端物品转换为前端分类格式 - 和result页完全一样
   */
  convertItemsToCategories(items, categoryDisplayNames) {
    console.log('【convertItemsToCategories】输入items数量:', items?.length);
    
    if (!items || !Array.isArray(items)) {
      console.log('items不是数组，返回空数组');
      return [];
    }
    
    const categoriesObj = {};
    
    items.forEach((item, index) => {
      const category = item.category || '其他物品';
      
      if (!categoriesObj[category]) {
        categoriesObj[category] = {
          title: (categoryDisplayNames && categoryDisplayNames[category]) || `📌 ${category}`,
          originalCategory: category,
          items: []
        };
      }
      
      // 处理 is_packed 字段（兼容两种字段名）- 预览时默认false
      let isPacked = false;
      if (item.is_packed !== undefined) {
        isPacked = item.is_packed === 1 || item.is_packed === true;
      } else if (item.isPacked !== undefined) {
        isPacked = item.isPacked === 1 || item.isPacked === true;
      }
      
      categoriesObj[category].items.push({
        id: item.id,
        name: item.name,
        checked: false, // 预览页统一不显示选中状态
        quantity: item.quantity || 1,
        notes: item.notes || '',
        originalCategory: category
      });
    });
    
    // 转换为数组并按分类名称排序
    const result = Object.values(categoriesObj).sort((a, b) => {
      if (a.originalCategory === '其他物品') return 1;
      if (b.originalCategory === '其他物品') return -1;
      return a.originalCategory.localeCompare(b.originalCategory);
    });
    
    return result;
  },

  /**
   * 从trip对象构建模板
   * @param {Object} trip - 行程对象
   * @param {Array} items - 物品列表
   * @param {number} tripId - 行程ID
   * @returns {Object} 模板对象
   */
  buildTemplateFromTrip(trip, items, tripId) {
    // 获取目的地名称
    let destination = '';
    if (trip.cityName) {
      destination = trip.cityName;
    } else if (trip.destinations && Array.isArray(trip.destinations) && trip.destinations.length > 0) {
      destination = trip.destinations
        .map(d => d.cityName || d.city || d.name)
        .filter(name => name)
        .join('、');
    } else if (trip.destination) {
      destination = trip.destination;
    } else if (trip.place) {
      destination = trip.place;
    }

    // 获取天数
    let days = '';
    if (trip.days) {
      days = trip.days;
    } else if (trip.travelDays) {
      days = trip.travelDays;
    } else if (trip.startDate && trip.endDate) {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      const diffTime = Math.abs(end - start);
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // 获取行程类型
    let type = '';
    if (trip.type) {
      type = trip.type;
    } else if (trip.tripType) {
      type = trip.tripType;
    }

    // 构建模板对象
    return {
      // 基本信息
      id: tripId,
      tripId: tripId,
      
      // 行程名称
      name: trip.tripName || 
            trip.name || 
            `${destination || '未知'}之旅`,
      
      // 描述/备注
      description: trip.activities || 
                   trip.notes || 
                   trip.description || '',
      
      // 目的地
      destination: destination,
      
      // 天数
      days: days,
      
      // 行程类型
      type: type,
      
      // 日期信息
      startDate: trip.startDate || '',
      endDate: trip.endDate || '',
      
      // 物品列表 - 存储原始物品数组
      items: items || [],
      
      // 时间戳
      createTime: trip.createTime || 
                  trip.createdTime || 
                  new Date().toISOString(),
      
      // 标记来源
      fromServer: true,
      
      // 额外信息
      weather: trip.weather || '',
      physique: trip.physique || '',
      activities: trip.activities || '',
      
      // 完整的目的地信息
      destinations: trip.destinations || [],
      
      // 用户ID
      userId: trip.userId
    };
  },

  /**
   * 从template接口获取模板详情
   * @param {number} templateId - 模板ID
   */
  async loadTemplateDetail(templateId) {
    this.setData({ isLoading: true });
    
    try {
      console.log('开始加载模板详情，templateId:', templateId);
      
      // 1. 从服务器获取模板列表（如果没有单独的获取模板详情接口）
      const templatesRes = await getAllTemplates();
      console.log('模板列表返回：', templatesRes);
      
      // 处理返回数据格式
      let templates = [];
      if (Array.isArray(templatesRes)) {
        templates = templatesRes;
      } else if (templatesRes && templatesRes.data) {
        templates = templatesRes.data;
      } else if (templatesRes && templatesRes.records) {
        templates = templatesRes.records;
      }
      
      // 查找匹配的模板
      const template = templates.find(t => 
        t.id == templateId || 
        t.templateId == templateId || 
        t.tripId == templateId
      );
      
      if (template) {
        console.log('找到模板：', template);
        
        // 保存模板信息
        this.setData({ templateInfo: template });
        
        // 如果有关联的行程ID，优先加载行程详情（使用统一的数据处理方式）
        if (template.tripId) {
          try {
            await this.loadTripDetail(template.tripId);
            return; // loadTripDetail 会处理数据，这里直接返回
          } catch (error) {
            console.log('加载关联行程失败，使用模板物品信息');
          }
        }
        
        // 否则使用模板中的物品信息
        this.processTemplateData(template);
        
      } else {
        // 如果服务器没有找到，尝试从本地加载
        console.log('服务器未找到模板，尝试从本地加载');
        this.loadTemplateFromLocal(templateId);
      }
      
    } catch (error) {
      console.error('从服务器加载模板失败：', error);
      // 失败后从本地加载
      this.loadTemplateFromLocal(templateId);
    }
  },

  /**
   * 处理模板数据 - 物品信息从template获取
   * @param {Object} template - 模板对象
   */
  processTemplateData(template) {
    console.log('处理模板数据：', template);
    
    // 获取模板中的物品列表
    let items = template.items || [];
    
    // 从物品中提取分类 - 使用和result页相同的辅助函数
    const categories = this.extractCategoriesFromItems(items);
    console.log('提取的分类:', categories);
    
    const categoryDisplayNames = this.generateCategoryDisplayNames(categories);
    console.log('分类显示名称映射:', categoryDisplayNames);
    
    // 转换物品为分类格式 - 使用和result页相同的辅助函数
    const listCategories = this.convertItemsToCategories(items, categoryDisplayNames);
    const totalItems = this.calculateTotalItems(listCategories);
    
    // 构建显示的模板对象
    const displayTemplate = {
      id: template.id,
      templateId: template.id,
      name: template.templateName || template.name || '未命名模板',
      description: template.description || '',
      destination: template.destination || '',
      days: template.days || '',
      type: template.type || '',
      items: items,
      createTime: template.createTime || template.createdTime,
      fromServer: true
    };
    
    this.setData({
      template: displayTemplate,
      listCategories: listCategories,
      totalItems: totalItems,
      availableCategories: categories,
      categoryDisplayNames: categoryDisplayNames,
      isLoading: false,
      isFromServer: true
    });
    
    console.log('处理后的模板：', displayTemplate);
    console.log('转换后的分类：', listCategories);
  },

  /**
   * 从本地加载模板 - 物品信息从template获取
   * @param {number} templateId - 模板ID
   */
  loadTemplateFromLocal(templateId) {
    try {
      // 获取当前用户ID
      const userInfo = wx.getStorageSync('userInfo');
      const userId = userInfo?.id || 'anonymous';
      
      // 尝试从用户特定的存储中获取
      const storageKey = `templates_${userId}`;
      let templates = wx.getStorageSync(storageKey) || [];
      
      // 如果找不到，尝试从全局模板存储中获取
      if (templates.length === 0) {
        templates = wx.getStorageSync('templates') || [];
      }
      
      const template = templates.find(t => 
        t.id == templateId || 
        t.templateId == templateId || 
        t.tripId == templateId
      );
      
      if (template) {
        console.log('从本地找到模板：', template);
        
        // 保存模板信息
        this.setData({ templateInfo: template });
        
        // 获取模板中的物品列表
        let items = template.items || [];
        
        // 从物品中提取分类 - 使用和result页相同的辅助函数
        const categories = this.extractCategoriesFromItems(items);
        console.log('提取的分类:', categories);
        
        const categoryDisplayNames = this.generateCategoryDisplayNames(categories);
        console.log('分类显示名称映射:', categoryDisplayNames);
        
        // 转换物品为分类格式 - 使用和result页相同的辅助函数
        const listCategories = this.convertItemsToCategories(items, categoryDisplayNames);
        const totalItems = this.calculateTotalItems(listCategories);
        
        // 构建显示的模板对象
        const displayTemplate = {
          id: template.id,
          templateId: template.id,
          name: template.templateName || template.name || '未命名模板',
          description: template.description || '',
          destination: template.destination || '',
          days: template.days || '',
          type: template.type || '',
          items: items,
          createTime: template.createTime || template.createdTime,
          fromServer: false,
          local: true
        };
        
        this.setData({
          template: displayTemplate,
          listCategories: listCategories,
          totalItems: totalItems,
          availableCategories: categories,
          categoryDisplayNames: categoryDisplayNames,
          isLoading: false,
          isFromServer: false
        });
        
        console.log('加载的本地模板:', displayTemplate);
        console.log('转换后的分类:', listCategories);
      } else {
        console.error('未找到模板，ID：', templateId);
        wx.showToast({
          title: '模板不存在',
          icon: 'none',
          complete: () => {
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          }
        });
        this.setData({ isLoading: false });
      }
    } catch (error) {
      console.error('加载本地模板失败：', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    }
  },

  /**
   * 计算总物品数
   * @param {Array} categories - 分类后的物品列表
   * @returns {number} 总物品数
   */
  calculateTotalItems(categories) {
    let total = 0;
    categories.forEach(category => {
      total += category.items.length;
    });
    return total;
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  /**
   * 使用模板 - 跳转到list页面并填充数据
   */
  useTemplate() {
    const template = this.data.template;
    const tripInfo = this.data.tripInfo;
    const listCategories = this.data.listCategories;
    const isFromServer = this.data.isFromServer;
    
    console.log('使用模板:', template);
    console.log('行程信息:', tripInfo);
    console.log('分类数据:', listCategories);
    
    // 优先使用行程信息中的字段，如果没有再使用模板中的字段
    const place = (tripInfo?.cityName) || 
                  (tripInfo?.destinations?.[0]?.cityName) || 
                  template.destination || 
                  '';
    
    const days = (tripInfo?.days) || 
                 (tripInfo?.travelDays) || 
                 template.days || 
                 '';
    
    const startDate = (tripInfo?.startDate) || 
                      template.startDate || 
                      '';
    
    const weather = (tripInfo?.weather) || 
                    template.weather || 
                    '';
    
    const type = (tripInfo?.type) || 
                 (tripInfo?.tripType) || 
                 template.type || 
                 '';
    
    const activities = (tripInfo?.activities) || 
                       template.activities || 
                       template.description || 
                       '';
    
    const physique = (tripInfo?.physique) || 
                     template.physique || 
                     '';
    
    // 存储模板数据到本地存储，供list页面使用
    wx.setStorageSync('template_categories', listCategories);
    
    // 存储模板参数
    const templateParams = {
      place: place,
      days: days,
      date: startDate,
      weather: weather,
      type: type,
      activities: activities,
      physique: physique,
      tripId: template.tripId || this.data.tripId || null
    };
    
    wx.setStorageSync('template_params', templateParams);
    
    // 获取类型索引
    let typeIndex = 0;
    if (type) {
      const typeList = ['休闲旅行', '户外徒步', '商务出行'];
      typeIndex = typeList.indexOf(type);
      if (typeIndex === -1) typeIndex = 0;
    }
    
    // 获取天气索引
    let weatherIndex = 0;
    if (weather) {
      const weatherList = ['晴天', '雨天', '寒冷', '炎热'];
      weatherIndex = weatherList.indexOf(weather);
      if (weatherIndex === -1) weatherIndex = 0;
    }
    
    // 获取体质索引
    let physiqueIndex = 0;
    if (physique) {
      const physiqueList = ['无特殊情况', '怕热', '怕冷', '鼻炎/过敏', '易晕车/晕船'];
      physiqueIndex = physiqueList.indexOf(physique);
      if (physiqueIndex === -1) physiqueIndex = 0;
    }
    
    // 跳转到list页面，并传递参数
    wx.navigateTo({
      url: `/pages/list/list?place=${encodeURIComponent(place)}&days=${days}&date=${encodeURIComponent(startDate)}&weatherIndex=${weatherIndex}&typeIndex=${typeIndex}&activities=${encodeURIComponent(activities)}&physiqueIndex=${physiqueIndex}&tripId=${template.tripId || this.data.tripId || ''}&useTemplate=1`,
      success: () => {
        console.log('跳转到list页面成功');
      },
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 保存为模板
   */
  async saveAsTemplate() {
    if (!this.data.tripId && !this.data.tripInfo) {
      wx.showToast({
        title: '无法保存',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '保存为模板',
      content: '确定要将此行程保存为模板吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '保存中...' });
            
            const tripInfo = this.data.tripInfo || this.data.template;
            const tripId = this.data.tripId || tripInfo?.id;
            
            // 获取目的地
            let destination = '';
            if (tripInfo?.cityName) {
              destination = tripInfo.cityName;
            } else if (tripInfo?.destinations?.[0]?.cityName) {
              destination = tripInfo.destinations[0].cityName;
            } else if (tripInfo?.destination) {
              destination = tripInfo.destination;
            }
            
            // 获取物品列表
            const items = [];
            this.data.listCategories.forEach(category => {
              category.items.forEach(item => {
                items.push({
                  name: item.name,
                  category: item.originalCategory || category.originalCategory,
                  quantity: item.quantity || 1,
                  notes: item.notes || ''
                });
              });
            });
            
            const templateData = {
              templateName: tripInfo.tripName || `${destination}模板`,
              description: tripInfo.activities || tripInfo.description || '',
              items: items,
              tags: [tripInfo.type || tripInfo.tripType].filter(Boolean),
              tripSummary: {
                place: destination,
                days: tripInfo.days || '',
                type: tripInfo.type || tripInfo.tripType || '',
                weather: tripInfo.weather || '',
                activities: tripInfo.activities || '',
                physique: tripInfo.physique || '',
                tripId: tripId
              }
            };
            
            const result = await createTemplate(templateData);
            
            wx.hideLoading();
            
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
            
          } catch (error) {
            wx.hideLoading();
            console.error('保存模板失败：', error);
            wx.showToast({
              title: error.message || '保存失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 预览物品详情
   */
  onItemTap(e) {
    const { category, index } = e.currentTarget.dataset;
    const item = this.data.listCategories[category].items[index];
    
    wx.showModal({
      title: '物品详情',
      content: item.name + (item.notes ? `\n备注：${item.notes}` : ''),
      confirmText: '知道了',
      showCancel: false
    });
  },

  /**
   * 删除模板（仅本地）
   */
  deleteTemplate() {
    const template = this.data.template;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个模板吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            // 获取当前用户ID
            const userInfo = wx.getStorageSync('userInfo');
            const userId = userInfo?.id || 'anonymous';
            
            // 从用户特定的存储中删除
            const storageKey = `templates_${userId}`;
            let templates = wx.getStorageSync(storageKey) || [];
            
            const newTemplates = templates.filter(t => 
              t.id !== template.id && 
              t.templateId !== template.id &&
              t.tripId !== template.tripId
            );
            
            wx.setStorageSync(storageKey, newTemplates);
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
            
          } catch (error) {
            console.error('删除模板失败：', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 分享模板
   */
  onShareAppMessage() {
    const template = this.data.template;
    const isFromServer = this.data.isFromServer;
    const tripId = this.data.tripId || template.tripId;
    
    return {
      title: `${template.name || '旅行清单'} | Packup模板`,
      path: tripId 
        ? `/pages/template_detail/template_detail?tripId=${tripId}` 
        : `/pages/template_detail/template_detail?id=${template.id}`,
      imageUrl: ''
    };
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    if (this.data.tripId) {
      this.loadTripDetail(this.data.tripId);
    } else if (this.data.templateId) {
      this.loadTemplateDetail(this.data.templateId);
    }
    wx.stopPullDownRefresh();
  }
});