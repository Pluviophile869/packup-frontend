// pages/result/result.js
import {
  getPackingItemsByTrip,
  createPackingItem,
  updatePackingItem,
  deletePackingItem,
  saveTripAsTemplate,
  applyTemplate,
  getTripById
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
    tripId: null,           // 行程ID
    secondaryColor: '#8EE4AF',
    
    // 分类清单
    listCategories: [],
    totalItems: 0,
    
    // 编辑状态控制
    editingItem: null,        // 当前正在编辑的物品 {categoryIndex, itemIndex}
    editingCategory: null,    // 当前正在编辑的分类索引
    tempValue: '',            // 临时存储编辑的值
    tempOldValue: '',         // 存储编辑前的值
    
    // 新增物品状态
    newItemCategory: null,    // 正在添加物品的分类索引
    newItemValue: '',         // 新物品的输入值

    // 加载状态
    isLoading: false,
    isSaving: false
  },

  // 页面加载
  onLoad(options) {
    console.log('【结果页接收参数】', options);
    
    // 安全解码函数
    const safeDecode = (str) => {
      if (!str || str === 'undefined' || str === 'null') return '';
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    };
    
    // 获取行程ID
    const tripId = options.tripId ? parseInt(options.tripId) : null;
    
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
      console.log('【设置后的tripId】', this.data.tripId);
      
      if (tripId) {
        // 如果有行程ID，从后端加载物品
        this.loadItemsFromServer(tripId);
      } else {
        // 否则生成本地清单
        this.generateList();
      }
    });
  },

  // 从服务器加载物品
  async loadItemsFromServer(tripId) {
    this.setData({ isLoading: true });
    
    try {
      console.log('【开始加载行程】tripId:', tripId);
      
      // 获取行程详情
      const trip = await getTripById(tripId);
      console.log('行程详情：', trip);
      
      // 获取打包物品列表
      const items = await getPackingItemsByTrip(tripId);
      console.log('打包物品：', items);
      
      // 将后端返回的物品转换为前端分类格式
      const listCategories = this.convertItemsToCategories(items);
      
      // 计算总物品数
      const totalItems = this.calculateTotalItems(listCategories);
      
      this.setData({ 
        listCategories,
        totalItems,
        isLoading: false
      });
      
    } catch (error) {
      console.log('后端接口未实现，使用本地生成清单');
      // 失败时使用本地生成
      this.generateList();
      this.setData({ isLoading: false });
    }
  },

  // 将后端物品转换为前端分类格式
  convertItemsToCategories(items) {
    // 定义默认分类
    const categoryMap = {
      '衣物鞋包': '👔 衣物推荐',
      '洗漱护肤': '🧴 洗漱用品',
      '电子设备': '📱 电子设备',
      '药品健康': '💊 健康提醒',
      '重要文件': '📄 重要证件',
      '其他物品': '📦 其他物品'
    };
    
    const categories = {};
    
    // 初始化分类
    Object.keys(categoryMap).forEach(key => {
      categories[key] = {
        title: categoryMap[key],
        items: []
      };
    });

    // 根据物品分类放入对应数组
    if (items && items.length) {
      items.forEach(item => {
        const category = item.category || '其他物品';
        if (categories[category]) {
          categories[category].items.push({
            id: item.id,
            name: item.name,
            checked: item.isPacked || false,  // 注意字段名转换
            quantity: item.quantity || 1,
            notes: item.notes || ''
          });
        } else {
          // 未知分类放入其他物品
          categories['其他物品'].items.push({
            id: item.id,
            name: item.name,
            checked: item.isPacked || false,
            quantity: item.quantity || 1,
            notes: item.notes || ''
          });
        }
      });
    }

    // 返回非空分类数组
    return Object.values(categories).filter(cat => cat.items.length > 0);
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
    const { weatherIndex, activities, physiqueIndex } = this.data;
    const weather = this.data.weatherList[weatherIndex];
    const physique = this.data.physiqueList[physiqueIndex];

    const listCategories = [
      { title: '👔 衣物推荐', items: [] },
      { title: '📄 重要证件', items: [] },
      { title: '💊 健康提醒', items: [] },
      { title: '📦 其他物品', items: [] }
    ];

    // ========== 1. 衣物推荐 ==========
    const clothes = listCategories[0].items;
    clothes.push({ name: '换洗衣物（按天数准备）', checked: false });
    clothes.push({ name: '舒适内裤/袜子', checked: false });
    
    if (weather === '晴天') {
      clothes.push({ name: '防晒衣/冰袖', checked: false });
      clothes.push({ name: '遮阳帽/墨镜', checked: false });
    }
    if (weather === '雨天') {
      clothes.push({ name: '雨衣/折叠伞', checked: false });
      clothes.push({ name: '防水鞋套', checked: false });
    }
    if (weather === '寒冷') {
      clothes.push({ name: '羽绒服/厚外套', checked: false });
      clothes.push({ name: '围巾/手套', checked: false });
    }
    if (weather === '炎热') {
      clothes.push({ name: '透气T恤/短裤', checked: false });
      clothes.push({ name: '凉拖', checked: false });
    }
    
    if (physique === '怕热') clothes.push({ name: '冰丝背心', checked: false });
    if (physique === '怕冷') clothes.push({ name: '保暖内衣', checked: false });

    // ========== 2. 重要证件 ==========
    const certificates = listCategories[1].items;
    certificates.push({ name: '身份证/护照', checked: false });
    certificates.push({ name: '手机', checked: false });
    certificates.push({ name: '银行卡/少量现金', checked: false });

    // ========== 3. 健康提醒 ==========
    const health = listCategories[2].items;
    health.push({ name: '创可贴/碘伏', checked: false });
    health.push({ name: '感冒药/退烧药', checked: false });
    if (physique === '鼻炎/过敏') {
      health.push({ name: '抗过敏药', checked: false });
    }
    if (physique === '易晕车/晕船') {
      health.push({ name: '晕车药/晕车贴', checked: false });
    }

    // ========== 4. 其他物品 ==========
    const tools = listCategories[3].items;
    tools.push({ name: '手机充电器/充电宝', checked: false });
    tools.push({ name: '洗漱用品', checked: false });
    tools.push({ name: '纸巾/湿巾', checked: false });
    tools.push({ name: '保温杯', checked: false });

    // 计算总物品数
    const totalItems = this.calculateTotalItems(listCategories);

    this.setData({ 
      listCategories,
      totalItems
    });
    
    console.log('生成的本地清单:', listCategories);
  },

  // 切换物品选中状态
  async toggleItem(e) {
    const { category, index } = e.currentTarget.dataset;
    const categoryKey = `listCategories[${category}].items[${index}].checked`;
    const item = this.data.listCategories[category].items[index];
    const newChecked = !item.checked;
    
    // 先更新UI
    this.setData({
      [categoryKey]: newChecked
    });

    // 如果有后端ID，同步到服务器
    if (item.id && this.data.tripId) {
      try {
        await updatePackingItem(item.id, {
          isPacked: newChecked  // 使用isPacked字段
        });
        console.log('更新状态成功');
      } catch (error) {
        console.error('更新状态失败：', error);
        // 失败时回滚
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
    
    // 如果有正在添加的新物品，先保存
    if (this.data.newItemCategory !== null) {
      this.saveNewItemDirectly();
    }
    
    // 获取当前物品名称
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
    
    // 如果没有变化，直接退出
    if (newName === oldName) {
      this.setData({
        editingItem: null,
        tempValue: '',
        tempOldValue: ''
      });
      return;
    }
    
    // 如果新名称为空，询问是否删除
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
    
    // 名称改变且有内容，直接更新
    const trimmedName = newName.trim();
    
    // 更新UI
    const key = `listCategories[${category}].items[${index}].name`;
    this.setData({
      [key]: trimmedName
    });

    // 同步到服务器
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
        console.error('更新物品失败：', error);
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        });
        // 回滚UI
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
    
    // 退出编辑状态
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
    
    // 如果有ID，从服务器删除
    if (item.id && this.data.tripId) {
      try {
        await deletePackingItem(item.id);
        
        // 从本地数组删除
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
        console.error('删除物品失败：', error);
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      }
    } else {
      // 本地删除
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
    
    // 如果有其他编辑状态，先退出
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
    
    // 获取分类名称（映射到后端的分类）
    const categoryMap = ['衣物鞋包', '重要文件', '药品健康', '其他物品'];
    const categoryName = categoryMap[category] || '其他物品';
    
    if (itemName && itemName.trim()) {
      const trimmedName = itemName.trim();
      
      // 检查是否已存在
      const existingItems = this.data.listCategories[category].items;
      const isDuplicate = existingItems.some(item => item.name === trimmedName);
      
      if (!isDuplicate) {
        const newItem = {
          name: trimmedName,
          checked: false
        };

        // 如果有行程ID，保存到服务器
        if (this.data.tripId) {
          try {
            const serverItem = await createPackingItem({
              tripId: this.data.tripId,
              name: trimmedName,
              category: categoryName,
              quantity: 1,
              notes: ''
            });
            
            // 使用服务器返回的ID
            if (serverItem && serverItem.id) {
              newItem.id = serverItem.id;
            } else if (serverItem && serverItem.data && serverItem.data.id) {
              newItem.id = serverItem.data.id;
            }
          } catch (error) {
            console.error('保存物品到服务器失败：', error);
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            });
            return;
          }
        }
        
        // 更新UI
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
    
    // 关闭新物品输入行
    this.setData({
      newItemCategory: null,
      newItemValue: ''
    });
  },

  // 直接保存新物品（用于切换编辑状态时的自动保存）
  async saveNewItemDirectly() {
    if (this.data.newItemCategory !== null && this.data.newItemValue.trim()) {
      const category = this.data.newItemCategory;
      const categoryMap = ['衣物鞋包', '重要文件', '药品健康', '其他物品'];
      const categoryName = categoryMap[category] || '其他物品';
      const trimmedName = this.data.newItemValue.trim();
      
      const newItem = {
        name: trimmedName,
        checked: false
      };

      // 如果有行程ID，保存到服务器
      if (this.data.tripId) {
        try {
          const serverItem = await createPackingItem({
            tripId: this.data.tripId,
            name: trimmedName,
            category: categoryName,
            quantity: 1,
            notes: ''
          });
          
          if (serverItem && serverItem.id) {
            newItem.id = serverItem.id;
          } else if (serverItem && serverItem.data && serverItem.data.id) {
            newItem.id = serverItem.data.id;
          }
        } catch (error) {
          console.error('保存物品到服务器失败：', error);
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
    
    console.log('========== 开始保存模板 ==========');
    
    if (!this.data.place) {
      wx.showToast({
        title: '目的地不能为空',
        icon: 'none'
      });
      return;
    }

    this.setData({ isSaving: true });
    wx.showLoading({ title: '保存中...', mask: true });

    try {
      // 构建模板数据
      const templateData = {
        templateName: `${this.data.place}旅行模板`,
        description: `${this.data.days || '?'}天${this.data.typeList[this.data.typeIndex] || '旅行'}`,
        tripId: this.data.tripId  // 如果有关联行程才传
      };

      console.log('发送的模板数据：', templateData);

      // 调用保存模板接口
      const result = await saveTripAsTemplate(templateData);
      console.log('保存模板结果：', result);
      
      wx.hideLoading();
      
      wx.showModal({
        title: '✅ 保存成功',
        content: result.local ? '模板已保存到本地' : '模板已保存，可在"我的模板"中查看',
        confirmText: '确定',
        showCancel: false,
        confirmColor: '#0ABAB5'
      });

    } catch (error) {
      wx.hideLoading();
      console.error('保存模板失败：', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isSaving: false });
    }
  },

  // 应用模板
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

            await applyTemplate({
              templateId: templateId,
              tripId: this.data.tripId
            });

            wx.hideLoading();

            // 重新加载物品列表
            await this.loadItemsFromServer(this.data.tripId);

            wx.showToast({
              title: '应用成功',
              icon: 'success'
            });

          } catch (error) {
            wx.hideLoading();
            console.error('应用模板失败：', error);
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

  // 分享清单
  onShareAppMessage() {
    return {
      title: `我的${this.data.place}旅行行李清单 | Packup`,
      path: `/pages/result/result?place=${encodeURIComponent(this.data.place)}&days=${this.data.days}&tripId=${this.data.tripId || ''}`,
      imageUrl: ''
    };
  }
});