// pages/result/result.js
import {
  getPackingItemsByTrip,
  createPackingItem,
  updatePackingItem,
  deletePackingItem,
  createTemplate,
  applyTemplateToTrip,
  getTripById,
  createTrip,
  updateTrip
} from '../../api/user';

Page({
  data: {
    // 接收首页参数
    place: '',
    date: '',
    days: '',
    weatherIndex: 0,
    weatherList: ['晴天', '雨天', '寒冷', '炎热'],
    typeIndex: 0,
    typeList: ['休闲旅行', '户外徒步', '商务出行'],
    activities: '',
    physiqueIndex: 0,
    physiqueList: ['无特殊情况', '怕热', '怕冷', '鼻炎/过敏', '易晕车/晕船'],
    tripId: null,
    secondaryColor: '#8EE4AF',
    
    // 分类清单
    listCategories: [],
    totalItems: 0,
    
    // 所有可用的分类
    availableCategories: [],
    
    // 分类显示名称映射
    categoryDisplayNames: {},
    
    // 编辑状态控制
    editingItem: null,
    editingCategory: null,
    tempValue: '',
    tempOldValue: '',
    
    // 新增物品状态
    newItemCategory: null,
    newItemValue: '',

    // 加载状态
    isLoading: false,
    isSaving: false,
    
    // 行程信息
    tripInfo: null
  },

  // 页面加载
  onLoad(options) {
    console.log('========== 页面加载 ==========');
    console.log('【接收参数】', options);
    
    const safeDecode = (str) => {
      if (!str || str === 'undefined' || str === 'null') return '';
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    };
    
    const tripId = options.tripId ? parseInt(options.tripId) : null;
    console.log('【解析后的tripId】', tripId);
    
    this.setData({
      place: safeDecode(options.place),
      date: safeDecode(options.date),
      days: options.days || '',
      weatherIndex: parseInt(options.weatherIndex) || 0,
      typeIndex: parseInt(options.typeIndex) || 0,
      physiqueIndex: parseInt(options.physiqueIndex) || 0,
      activities: safeDecode(options.activities),
      tripId: tripId
    }, () => {
      console.log('【设置后的页面数据】', {
        place: this.data.place,
        date: this.data.date,
        days: this.data.days,
        weatherIndex: this.data.weatherIndex,
        typeIndex: this.data.typeIndex,
        physiqueIndex: this.data.physiqueIndex,
        activities: this.data.activities,
        tripId: this.data.tripId
      });
      
      if (tripId) {
        this.loadTripAndItems(tripId);
      } else {
        console.log('没有tripId，使用本地生成清单');
        this.generateList();
      }
    });
  },

  // 加载行程信息和物品
  async loadTripAndItems(tripId) {
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
          place: trip.destinations && trip.destinations[0] ? trip.destinations[0].cityName : this.data.place,
          date: trip.startDate || this.data.date,
          days: this.calculateDays(trip.startDate, trip.endDate) || this.data.days,
          tripInfo: trip
        });
      }
      
      // 获取打包物品列表
      console.log('【5. 开始请求物品接口】');
      const itemsRes = await getPackingItemsByTrip(tripId);
      console.log('【6. 物品接口原始返回】:', itemsRes);

      // --- 修复点：处理后端返回的数据格式 ---
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
          // 尝试将整个返回对象作为物品数组，如果不是数组则置为空
          items = Array.isArray(itemsRes) ? itemsRes : [];
        }
      } else {
        console.log('【7.6 itemsRes 为空】');
        items = [];
      }
      // ---------------------------------------------

      console.log('【8. 最终物品数组】:', items);
      console.log('【9. 物品数量】:', items.length);
      
      // 从物品中提取分类
      const categories = this.extractCategoriesFromItems(items);
      console.log('【10. 提取的分类】:', categories);
      
      const categoryDisplayNames = this.generateCategoryDisplayNames(categories);
      console.log('【11. 分类显示名称映射】:', categoryDisplayNames);
      
      // 转换物品为分类格式
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
      
      console.log('========== 数据加载完成 ==========');
      
      this.setData({ 
        listCategories,
        totalItems,
        availableCategories: categories,
        categoryDisplayNames: categoryDisplayNames,
        isLoading: false
      });
      
      if (items.length === 0) {
        // 如果没有物品，生成默认清单
        console.log('物品列表为空，生成默认清单');
        this.generateList();
      }
      
    } catch (error) {
      console.log('========== 错误信息 ==========');
      console.error('【错误】加载失败:', error);
      console.error('【错误信息】', error.message);
      console.log('========== 使用本地生成清单 ==========');
      
      this.generateList();
      this.setData({ isLoading: false });
      
      wx.showToast({
        title: '加载失败，使用本地清单',
        icon: 'none'
      });
    }
  },

  // 从物品中提取所有唯一的分类
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

  // 生成分类显示名称映射
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
      '药品健康': '💊 健康提醒'
    };
    
    categories.forEach(category => {
      displayNameMap[category] = defaultDisplayNames[category] || `📌 ${category}`;
    });
    
    return displayNameMap;
  },

  // 将后端物品转换为前端分类格式
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
          title: categoryDisplayNames[category] || `📌 ${category}`,
          originalCategory: category,
          items: []
        };
      }
      
      // 处理 is_packed 字段（兼容两种字段名）
      let isPacked = false;
      if (item.is_packed !== undefined) {
        isPacked = item.is_packed === 1 || item.is_packed === true;
      } else if (item.isPacked !== undefined) {
        isPacked = item.isPacked === 1 || item.isPacked === true;
      }
      
      categoriesObj[category].items.push({
        id: item.id,
        name: item.name,
        checked: isPacked,
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

  // 辅助函数：将天气字符串转为索引
  getWeatherIndex(weather) {
    if (!weather) return 0;
    const index = this.data.weatherList.findIndex(w => w === weather);
    return index >= 0 ? index : 0;
  },

  // 辅助函数：将行程类型转为索引
  getTypeIndex(type) {
    if (!type) return 0;
    const index = this.data.typeList.findIndex(t => t === type);
    return index >= 0 ? index : 0;
  },

  // 辅助函数：将体质字符串转为索引
  getPhysiqueIndex(physique) {
    if (!physique) return 0;
    const index = this.data.physiqueList.findIndex(p => p === physique);
    return index >= 0 ? index : 0;
  },

  // 辅助函数：计算天数
  calculateDays(startDate, endDate) {
    if (!startDate || !endDate) return '';
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays.toString();
    } catch (e) {
      return '';
    }
  },

  // 辅助函数：根据开始日期和天数计算结束日期
  calculateEndDate(startDate, days) {
    if (!startDate || !days) return '';
    try {
      const date = new Date(startDate);
      date.setDate(date.getDate() + parseInt(days) - 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  },

  // 计算总物品数
  calculateTotalItems(categories) {
    let total = 0;
    categories.forEach(category => {
      total += category.items.length;
    });
    return total;
  },

  // 生成本地清单（备用）
  generateList() {
    console.log('========== 生成本地清单 ==========');
    const { weatherIndex, physiqueIndex } = this.data;
    const weather = this.data.weatherList[weatherIndex];
    const physique = this.data.physiqueList[physiqueIndex];

    console.log('【生成参数】', { weather, physique });

    const localCategories = [
      { originalCategory: '衣物', displayName: '👔 衣物推荐' },
      { originalCategory: '重要文件', displayName: '📄 重要证件' },
      { originalCategory: '药品', displayName: '💊 健康提醒' },
      { originalCategory: '其他物品', displayName: '📦 其他物品' }
    ];
    
    const categoryDisplayNames = {};
    localCategories.forEach(cat => {
      categoryDisplayNames[cat.originalCategory] = cat.displayName;
    });
    
    const listCategories = localCategories.map(cat => ({
      title: cat.displayName,
      originalCategory: cat.originalCategory,
      items: []
    }));

    // 衣物推荐
    const clothes = listCategories[0].items;
    clothes.push({ name: '换洗衣物（按天数准备）', checked: false, originalCategory: '衣物' });
    clothes.push({ name: '舒适内裤/袜子', checked: false, originalCategory: '衣物' });
    
    if (weather === '晴天') {
      clothes.push({ name: '防晒衣/冰袖', checked: false, originalCategory: '衣物' });
      clothes.push({ name: '遮阳帽/墨镜', checked: false, originalCategory: '衣物' });
    }
    if (weather === '雨天') {
      clothes.push({ name: '雨衣/折叠伞', checked: false, originalCategory: '衣物' });
      clothes.push({ name: '防水鞋套', checked: false, originalCategory: '衣物' });
    }
    if (weather === '寒冷') {
      clothes.push({ name: '羽绒服/厚外套', checked: false, originalCategory: '衣物' });
      clothes.push({ name: '围巾/手套', checked: false, originalCategory: '衣物' });
    }
    if (weather === '炎热') {
      clothes.push({ name: '透气T恤/短裤', checked: false, originalCategory: '衣物' });
      clothes.push({ name: '凉拖', checked: false, originalCategory: '衣物' });
    }
    
    if (physique === '怕热') clothes.push({ name: '冰丝背心', checked: false, originalCategory: '衣物' });
    if (physique === '怕冷') clothes.push({ name: '保暖内衣', checked: false, originalCategory: '衣物' });

    // 重要证件
    const certificates = listCategories[1].items;
    certificates.push({ name: '身份证/护照', checked: false, originalCategory: '重要文件' });
    certificates.push({ name: '手机', checked: false, originalCategory: '重要文件' });
    certificates.push({ name: '银行卡/少量现金', checked: false, originalCategory: '重要文件' });

    // 健康提醒
    const health = listCategories[2].items;
    health.push({ name: '创可贴/碘伏', checked: false, originalCategory: '药品' });
    health.push({ name: '感冒药/退烧药', checked: false, originalCategory: '药品' });
    if (physique === '鼻炎/过敏') {
      health.push({ name: '抗过敏药', checked: false, originalCategory: '药品' });
    }
    if (physique === '易晕车/晕船') {
      health.push({ name: '晕车药/晕车贴', checked: false, originalCategory: '药品' });
    }

    // 其他物品
    const tools = listCategories[3].items;
    tools.push({ name: '手机充电器/充电宝', checked: false, originalCategory: '其他物品' });
    tools.push({ name: '洗漱用品', checked: false, originalCategory: '其他物品' });
    tools.push({ name: '纸巾/湿巾', checked: false, originalCategory: '其他物品' });
    tools.push({ name: '保温杯', checked: false, originalCategory: '其他物品' });

    const totalItems = this.calculateTotalItems(listCategories);

    console.log('【生成的本地清单】:', listCategories.map(cat => ({
      title: cat.title,
      count: cat.items.length
    })));

    this.setData({ 
      listCategories,
      totalItems,
      availableCategories: localCategories.map(c => c.originalCategory),
      categoryDisplayNames: categoryDisplayNames
    });
  },

  // 切换物品选中状态
  async toggleItem(e) {
    const { category, index } = e.currentTarget.dataset;
    const categoryKey = `listCategories[${category}].items[${index}].checked`;
    const item = this.data.listCategories[category].items[index];
    const newChecked = !item.checked;
    
    this.setData({
      [categoryKey]: newChecked
    });

    if (item.id && this.data.tripId) {
      try {
        await updatePackingItem(item.id, {
          isPacked: newChecked
        });
      } catch (error) {
        this.setData({
          [categoryKey]: !newChecked
        });
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        });
      }
    }
  },

  // 开始编辑物品
  startEditItem(e) {
    const { category, index } = e.currentTarget.dataset;
    
    if (this.data.newItemCategory !== null) {
      this.saveNewItemDirectly();
    }
    
    const itemName = this.data.listCategories[category].items[index].name;
    
    this.setData({
      editingItem: { category, index },
      editingCategory: null,
      newItemCategory: null,
      tempValue: itemName,
      tempOldValue: itemName
    });
  },

  // 开始编辑分类
  startEditCategory(e) {
    const { category } = e.currentTarget.dataset;
    
    if (this.data.newItemCategory !== null) {
      this.saveNewItemDirectly();
    }
    
    this.setData({
      editingCategory: category,
      editingItem: null,
      newItemCategory: null,
      tempValue: this.data.listCategories[category].title,
      tempOldValue: this.data.listCategories[category].title
    });
  },

  // 物品输入时临时保存
  onItemNameInput(e) {
    this.setData({
      tempValue: e.detail.value
    });
  },

  // 保存物品名称
  async saveItemName(e) {
    const { category, index } = e.currentTarget.dataset;
    const newName = this.data.tempValue;
    const oldName = this.data.tempOldValue;
    const item = this.data.listCategories[category].items[index];
    
    if (newName === oldName) {
      this.setData({
        editingItem: null,
        tempValue: '',
        tempOldValue: ''
      });
      return;
    }
    
    if (!newName || newName.trim() === '') {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个物品吗？',
        success: async (res) => {
          if (res.confirm) {
            await this.deleteItem(category, index, item);
          }
          this.setData({
            editingItem: null,
            tempValue: '',
            tempOldValue: ''
          });
        },
        fail: () => {
          this.setData({
            editingItem: null,
            tempValue: '',
            tempOldValue: ''
          });
        }
      });
      return;
    }
    
    const trimmedName = newName.trim();
    
    const key = `listCategories[${category}].items[${index}].name`;
    this.setData({
      [key]: trimmedName
    });

    if (item.id && this.data.tripId) {
      try {
        await updatePackingItem(item.id, {
          name: trimmedName
        });
        wx.showToast({
          title: '修改成功',
          icon: 'success',
          duration: 1000
        });
      } catch (error) {
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        });
        this.setData({
          [key]: oldName
        });
      }
    } else {
      wx.showToast({
        title: '修改成功',
        icon: 'success',
        duration: 1000
      });
    }
    
    this.setData({
      editingItem: null,
      tempValue: '',
      tempOldValue: ''
    });
  },

  // 删除物品
  async deleteItem(category, index, item) {
    const key = `listCategories[${category}].items`;
    const items = this.data.listCategories[category].items;
    
    if (item.id && this.data.tripId) {
      try {
        await deletePackingItem(item.id);
        
        items.splice(index, 1);
        this.setData({
          [key]: items,
          totalItems: this.data.totalItems - 1
        });
        
        wx.showToast({
          title: '已删除',
          icon: 'success',
          duration: 1000
        });
      } catch (error) {
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      }
    } else {
      items.splice(index, 1);
      this.setData({
        [key]: items,
        totalItems: this.data.totalItems - 1
      });
      
      wx.showToast({
        title: '已删除',
        icon: 'success',
        duration: 1000
      });
    }
  },

  // 分类输入时临时保存
  onCategoryTitleInput(e) {
    this.setData({
      tempValue: e.detail.value
    });
  },

  // 保存分类标题
  saveCategoryTitle(e) {
    const { category } = e.currentTarget.dataset;
    const newTitle = this.data.tempValue;
    const oldTitle = this.data.tempOldValue;
    
    if (newTitle && newTitle.trim() && newTitle.trim() !== oldTitle) {
      const key = `listCategories[${category}].title`;
      this.setData({
        [key]: newTitle.trim()
      });
      
      const originalCategory = this.data.listCategories[category].originalCategory;
      const categoryDisplayNames = this.data.categoryDisplayNames;
      categoryDisplayNames[originalCategory] = newTitle.trim();
      
      this.setData({
        categoryDisplayNames: categoryDisplayNames
      });
      
      wx.showToast({
        title: '分类已修改',
        icon: 'success',
        duration: 1000
      });
    }
    
    this.setData({
      editingCategory: null,
      tempValue: '',
      tempOldValue: ''
    });
  },

  // 取消编辑
  cancelEdit() {
    this.setData({
      editingItem: null,
      editingCategory: null,
      tempValue: '',
      tempOldValue: ''
    });
  },

  // 点击添加按钮
  addNewItem(e) {
    const { category } = e.currentTarget.dataset;
    
    this.setData({
      editingItem: null,
      editingCategory: null,
      newItemCategory: category,
      newItemValue: '',
      tempValue: '',
      tempOldValue: ''
    });
  },

  // 新物品输入时
  onNewItemInput(e) {
    this.setData({
      newItemValue: e.detail.value
    });
  },

  // 保存新物品
  async saveNewItem(e) {
    const { category } = e.currentTarget.dataset;
    const itemName = this.data.newItemValue;
    const originalCategory = this.data.listCategories[category].originalCategory;
    
    if (itemName && itemName.trim()) {
      const trimmedName = itemName.trim();
      
      const existingItems = this.data.listCategories[category].items;
      const isDuplicate = existingItems.some(item => item.name === trimmedName);
      
      if (!isDuplicate) {
        const newItem = {
          name: trimmedName,
          checked: false,
          originalCategory: originalCategory
        };

        if (this.data.tripId) {
          try {
            const serverItem = await createPackingItem({
              tripId: this.data.tripId,
              name: trimmedName,
              category: originalCategory,
              quantity: 1,
              notes: ''
            });
            
            if (serverItem && serverItem.id) {
              newItem.id = serverItem.id;
            } else if (serverItem && serverItem.data && serverItem.data.id) {
              newItem.id = serverItem.data.id;
            }
          } catch (error) {
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            });
            return;
          }
        }
        
        const key = `listCategories[${category}].items`;
        const items = this.data.listCategories[category].items;
        items.push(newItem);
        
        this.setData({
          [key]: items,
          totalItems: this.data.totalItems + 1
        });
        
        wx.showToast({
          title: '添加成功',
          icon: 'success',
          duration: 1000
        });
      } else {
        wx.showToast({
          title: '物品已存在',
          icon: 'none',
          duration: 1000
        });
      }
    }
    
    this.setData({
      newItemCategory: null,
      newItemValue: ''
    });
  },

  // 直接保存新物品（用于切换编辑状态时的自动保存）
  async saveNewItemDirectly() {
    if (this.data.newItemCategory !== null && this.data.newItemValue.trim()) {
      const category = this.data.newItemCategory;
      const originalCategory = this.data.listCategories[category].originalCategory;
      const trimmedName = this.data.newItemValue.trim();
      
      const newItem = {
        name: trimmedName,
        checked: false,
        originalCategory: originalCategory
      };

      if (this.data.tripId) {
        try {
          const serverItem = await createPackingItem({
            tripId: this.data.tripId,
            name: trimmedName,
            category: originalCategory,
            quantity: 1,
            notes: ''
          });
          
          if (serverItem && serverItem.id) {
            newItem.id = serverItem.id;
          } else if (serverItem && serverItem.data && serverItem.data.id) {
            newItem.id = serverItem.data.id;
          }
        } catch (error) {
          // 静默失败，继续本地保存
        }
      }
      
      const key = `listCategories[${category}].items`;
      const items = this.data.listCategories[category].items;
      items.push(newItem);
      
      this.setData({
        [key]: items,
        totalItems: this.data.totalItems + 1
      });
    }
    
    this.setData({
      newItemCategory: null,
      newItemValue: ''
    });
  },

  // 保存为模板
  async saveAsTemplate() {
    if (this.data.isSaving) return;
    
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

    const hasItems = items.length > 0;

    if (!this.data.place) {
      wx.showToast({
        title: '目的地不能为空',
        icon: 'none'
      });
      return;
    }

    if (!this.data.date) {
      wx.showToast({
        title: '出发日期不能为空',
        icon: 'none'
      });
      return;
    }

    this.setData({ isSaving: true });
    wx.showLoading({ title: '保存中...', mask: true });

    try {
      let tripId = this.data.tripId;
      const userInfo = wx.getStorageSync('userInfo');
      const userId = userInfo?.id || 1;
      
      const endDate = this.calculateEndDate(this.data.date, this.data.days);
      
      const tripData = {
        userId: userId,
        tripName: `${this.data.place}之旅`,
        startDate: this.data.date,
        endDate: endDate,
        destinations: [{
          cityName: this.data.place,
          country: "中国",
          poiName: this.data.typeList[this.data.typeIndex],
          arrivalDate: this.data.date,
          departureDate: endDate,
          orderIndex: 0
        }]
      };

      let savedTrip = null;
      let successMessage = '';
      
      if (tripId) {
        savedTrip = await updateTrip(tripId, tripData);
        successMessage = '行程信息已更新';
      } else {
        savedTrip = await createTrip(tripData);
        
        if (savedTrip && savedTrip.data && savedTrip.data.id) {
          tripId = savedTrip.data.id;
        } else if (savedTrip && savedTrip.id) {
          tripId = savedTrip.id;
        }
        successMessage = '行程信息已保存';
      }

      let templateResult = null;
      if (hasItems) {
        const templateData = {
          templateName: `${this.data.place}旅行物品清单`,
          description: `${this.data.days || '?'}天${this.data.typeList[this.data.typeIndex] || '旅行'} - 共${items.length}件物品`,
          items: items,
          tags: [this.data.typeList[this.data.typeIndex], this.data.place],
          tripSummary: {
            place: this.data.place,
            days: this.data.days,
            type: this.data.typeList[this.data.typeIndex],
            weather: this.data.weatherList[this.data.weatherIndex],
            activities: this.data.activities,
            physique: this.data.physiqueList[this.data.physiqueIndex],
            tripId: tripId
          }
        };

        templateResult = await createTemplate(templateData);
        
        successMessage = templateResult && templateResult.local 
          ? '行程信息已保存，物品清单已保存到本地'
          : '行程信息和物品清单已保存';
      }
      
      wx.hideLoading();
      
      if (tripId && tripId !== this.data.tripId) {
        this.setData({ tripId: tripId });
      }
      
      wx.showModal({
        title: '✅ 保存成功',
        content: successMessage || '行程信息已保存',
        confirmText: '确定',
        showCancel: false,
        confirmColor: '#0ABAB5'
      });

    } catch (error) {
      wx.hideLoading();
      
      let errorMsg = '保存失败，请重试';
      if (error && error.message) {
        errorMsg = error.message;
      } else if (error && error.data && error.data.message) {
        errorMsg = error.data.message;
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ isSaving: false });
    }
  },

  // 应用模板到当前行程
  async applyTemplate(e) {
    const templateId = e.currentTarget.dataset.id;
    
    if (!this.data.tripId) {
      wx.showToast({
        title: '请先生成行程',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '应用模板',
      content: '应用模板将为当前行程添加物品',
      confirmText: '确定',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '应用中...' });

            await applyTemplateToTrip({
              templateId: templateId,
              tripId: this.data.tripId
            });

            wx.hideLoading();

            await this.loadTripAndItems(this.data.tripId);

            wx.showToast({
              title: '应用成功',
              icon: 'success'
            });

          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '应用失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 阻止事件冒泡
  stopPropagation() {},

  // 返回首页
  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  // 重新生成
  regenerate() {
    wx.navigateBack({ delta: 1 });
  },

  // 分享清单
  onShareAppMessage() {
    return {
      title: `我的${this.data.place}旅行行李清单 | Packup`,
      path: `/pages/result/result?place=${encodeURIComponent(this.data.place)}&days=${this.data.days}&tripId=${this.data.tripId || ''}`,
      imageUrl: ''
    };
  }
});