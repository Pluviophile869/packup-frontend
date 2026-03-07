// pages/templates/templates.js
import {
  getTripsByUserId,
  getTripById,
  deleteTrip,
  updateTrip,
  createTrip
} from '../../api/user';

Page({
  data: {
    trips: [], // 行程列表
    filteredTrips: [], // 过滤后的行程列表
    showModal: false,
    showAddTabModal: false,
    modalTitle: '创建行程',
    typeList: ['休闲旅行', '户外徒步', '商务出行'], // 用于标签
    defaultTabs: ['全部', '休闲旅行', '户外徒步', '商务出行'], // 默认标签
    customTabs: [], // 自定义标签
    currentTab: 0, // 当前选中的标签索引
    newTabName: '', // 新标签名称
    formData: {
      id: '',
      tripName: '',        // 行程名称
      destinations: [],    // 目的地数组（对应后端的 destinations）
      startDate: '',       // 开始日期
      endDate: '',         // 结束日期
      days: '',            // 天数
      typeIndex: 0,        // 类型索引
      activities: '',      // 活动
      weather: '',         // 天气
      physique: ''         // 体质
    },
    currentTripId: null,
    scrollLeft: 0,
    newTagInput: '',
    isLoading: false,
    loadingRequest: false,
    userId: null,
    page: 1,
    pageSize: 20,
    hasMore: true,
    isRefreshing: false,
    weatherList: ['晴天', '雨天', '寒冷', '炎热'],
    physiqueList: ['无特殊情况', '怕热', '怕冷', '鼻炎/过敏', '易晕车/晕船']
  },

  onLoad() {
    console.log('页面加载，开始第一次加载');
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.id) {
      this.setData({ userId: userInfo.id });
    }
    
    this.loadTrips();
    this.loadCustomTabs();
  },

  onShow() {
    console.log('页面显示，刷新数据');
    // 每次显示页面时刷新数据
    this.setData({ 
      page: 1,
      hasMore: true,
      trips: []  // 先清空，避免重复
    }, () => {
      this.loadTrips();
    });
  },

  // 加载行程数据
  loadTrips(isRefresh = false) {
    // 防止重复请求
    if (this.data.isLoading) {
      console.log('正在加载中，跳过本次请求');
      return;
    }
    
    if (this.loadingRequest) {
      console.log('已有请求在进行中，跳过本次请求');
      return;
    }
    
    console.log('loadTrips 被调用，isRefresh:', isRefresh, '当前页:', this.data.page);
    
    this.loadingRequest = true;
    this.setData({ isLoading: true });
    
    if (isRefresh) {
      this.setData({ 
        page: 1,
        hasMore: true,
        trips: []
      });
    }

    if (!this.data.userId) {
      console.log('用户ID不存在');
      this.setData({ isLoading: false });
      this.loadingRequest = false;
      return;
    }

    // 构建查询参数
    const params = {
      page: this.data.page,
      size: this.data.pageSize
    };

    // 调用接口获取行程列表
    getTripsByUserId(this.data.userId, params)
      .then(res => {
        console.log('获取行程列表成功：', JSON.stringify(res, null, 2));
        
        let newTrips = [];
        let hasMore = false;
        
        // 根据后端返回格式处理
        if (Array.isArray(res)) {
          newTrips = res;
          hasMore = res.length >= this.data.pageSize;
        } else if (res && res.records) {
          newTrips = res.records;
          hasMore = res.current < res.pages;
        } else if (res && res.data) {
          newTrips = res.data;
          hasMore = newTrips.length >= this.data.pageSize;
        }

        // 格式化行程数据 - 关键修改：从 destinations[0].poiName 获取 typeIndex
        newTrips = newTrips.map((item) => {
          console.log(`行程 ${item.id} 的原始数据:`, JSON.stringify(item, null, 2));
          
          // 计算天数
          let days = '';
          if (item.startDate && item.endDate) {
            const start = new Date(item.startDate);
            const end = new Date(item.endDate);
            const diffTime = Math.abs(end - start);
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          } else if (item.travelDays) {
            days = item.travelDays;
          }

          // 获取城市名称（用于显示）
          let cityName = '';
          
          // 重要：先检查是否有原始的 destinations 数组
          const rawDestinations = item.destinations || [];
          
          // 从 destinations 数组中获取城市名称字符串
          if (rawDestinations.length > 0) {
            const cityNames = rawDestinations
              .map(dest => {
                if (dest.cityName) return dest.cityName;
                if (dest.city) return dest.city;
                if (dest.name) return dest.name;
                if (typeof dest === 'string') return dest;
                return null;
              })
              .filter(name => name && name.trim() !== '');
            
            if (cityNames.length > 0) {
              cityName = cityNames.join('、');
            }
          }
          
          // 如果 destinations 为空，尝试其他字段
          if (!cityName) {
            if (item.cityName) {
              cityName = item.cityName;
            } else if (item.city) {
              cityName = item.city;
            } else if (item.destination) {
              cityName = item.destination;
            } else if (item.location) {
              cityName = item.location;
            }
          }

          // 如果没有获取到任何城市名称，显示默认值
          if (!cityName) {
            cityName = '未指定目的地';
          }

          // ===== 关键修改：从 destinations[0].poiName 获取 typeIndex =====
          let typeIndex = 0; // 默认值：休闲旅行
          let tripType = '休闲旅行'; // 默认值
          
          // 检查是否有 destinations 数组且第一个元素有 poiName
          if (rawDestinations.length > 0 && rawDestinations[0].poiName !== undefined) {
            // poiName 中存储的就是 typeIndex
            const poiNameValue = rawDestinations[0].poiName;
            console.log('行程的 poiName:', poiNameValue, '类型:', typeof poiNameValue);
            
            // 将 poiName 转换为数字索引
            if (poiNameValue !== null && poiNameValue !== '') {
              // 如果是字符串数字，转换为数字
              if (typeof poiNameValue === 'string' && !isNaN(parseInt(poiNameValue))) {
                typeIndex = parseInt(poiNameValue);
              } 
              // 如果已经是数字
              else if (typeof poiNameValue === 'number') {
                typeIndex = poiNameValue;
              }
              // 如果是其他字符串，尝试匹配类型名称
              else if (typeof poiNameValue === 'string') {
                const matchedIndex = this.data.typeList.indexOf(poiNameValue);
                if (matchedIndex >= 0) {
                  typeIndex = matchedIndex;
                }
              }
              
              // 确保 typeIndex 在有效范围内
              if (typeIndex < 0 || typeIndex >= this.data.typeList.length) {
                typeIndex = 0;
              }
            }
            
            // 根据 typeIndex 获取对应的类型名称
            tripType = this.data.typeList[typeIndex];
            console.log(`映射后: poiName=${poiNameValue} -> typeIndex=${typeIndex} -> tripType=${tripType}`);
          } else {
            // 如果没有 poiName，尝试从其他字段获取类型
            if (item.tripType) {
              const matchedIndex = this.data.typeList.indexOf(item.tripType);
              if (matchedIndex >= 0) {
                typeIndex = matchedIndex;
                tripType = item.tripType;
              }
            }
          }

          // 返回完整数据，保留原始的 destinations 数组
          return {
            id: item.id,
            tripName: item.tripName || '未命名行程',
            cityName: cityName,  // 用于显示的字符串
            startDate: item.startDate || '',
            endDate: item.endDate || '',
            days: days || '?',
            type: tripType,  // 使用映射后的类型名称
            typeIndex: typeIndex, // 存储 typeIndex 供前端使用
            activities: item.activities || '',
            weather: item.weather || '',
            physique: item.physique || '',
            createTime: item.createdTime ? item.createdTime.split('T')[0] : new Date().toISOString().split('T')[0],
            // 保留完整的原始 destinations 数组，用于编辑
            destinations: rawDestinations
          };
        });

        // 使用 Map 去重合并数据
        let trips;
        if (isRefresh) {
          trips = newTrips;
        } else {
          const tripMap = new Map();
          
          // 先添加已有的行程
          this.data.trips.forEach(trip => {
            tripMap.set(trip.id, trip);
          });
          
          // 再添加新加载的行程
          newTrips.forEach(trip => {
            tripMap.set(trip.id, trip);
          });
          
          // 转换回数组并按创建时间倒序排序
          trips = Array.from(tripMap.values()).sort((a, b) => {
            return new Date(b.createTime) - new Date(a.createTime);
          });
        }
        
        console.log(`合并后共有 ${trips.length} 个行程（去重后）`);
        console.log('第一个行程的 typeIndex:', trips[0]?.typeIndex);
        
        this.setData({
          trips: trips,
          isLoading: false,
          hasMore: hasMore,
          isRefreshing: false
        }, () => {
          this.filterTrips();
          this.loadingRequest = false;
        });
      })
      .catch(error => {
        console.error('从服务器加载行程失败：', error);
        this.setData({ 
          isLoading: false,
          isRefreshing: false 
        });
        this.loadingRequest = false;
      });
  },

  // 加载更多行程
  loadMoreTrips() {
    if (this.data.hasMore && !this.data.isLoading && !this.loadingRequest) {
      console.log('加载更多行程，下一页:', this.data.page + 1);
      this.setData({ page: this.data.page + 1 }, () => {
        this.loadTrips();
      });
    } else {
      console.log('无法加载更多：', {
        hasMore: this.data.hasMore,
        isLoading: this.data.isLoading,
        loadingRequest: this.loadingRequest
      });
    }
  },

  // 刷新行程
  refreshTrips() {
    console.log('刷新行程');
    this.setData({ 
      isRefreshing: true,
      page: 1,
      hasMore: true 
    }, () => {
      this.loadTrips(true);
    });
  },

  // 加载自定义标签
  loadCustomTabs() {
    const customTabs = wx.getStorageSync('customTabs') || [];
    this.setData({ customTabs: customTabs });
  },

  // 保存自定义标签
  saveCustomTabs(customTabs) {
    wx.setStorageSync('customTabs', customTabs);
    this.setData({ customTabs: customTabs });
  },

  // 获取当前标签名称
  getCurrentTabName() {
    const { currentTab, defaultTabs, customTabs } = this.data;
    
    if (currentTab < defaultTabs.length) {
      return defaultTabs[currentTab];
    } else {
      const customIndex = currentTab - defaultTabs.length;
      if (customIndex < customTabs.length) {
        return customTabs[customIndex];
      }
    }
    return '';
  },

  // 根据当前标签过滤行程
  filterTrips() {
    const { trips, currentTab, defaultTabs, customTabs } = this.data;
    
    console.log('开始过滤行程，总行程数:', trips.length);
    console.log('当前标签索引:', currentTab);
    
    let filteredTrips = [];
    
    if (currentTab === 0) {
      filteredTrips = trips;
    } else if (currentTab < defaultTabs.length) {
      const tabName = defaultTabs[currentTab];
      console.log('当前默认标签名称:', tabName);
      // 使用 type 字段进行过滤
      filteredTrips = trips.filter(t => t.type === tabName);
      console.log(`标签"${tabName}"匹配到 ${filteredTrips.length} 个行程`);
    } else {
      const customIndex = currentTab - defaultTabs.length;
      if (customIndex < customTabs.length) {
        const tabName = customTabs[customIndex];
        console.log('当前自定义标签名称:', tabName);
        filteredTrips = trips.filter(t => t.type === tabName);
        console.log(`自定义标签"${tabName}"匹配到 ${filteredTrips.length} 个行程`);
      } else {
        filteredTrips = trips;
      }
    }
    
    console.log('最终显示行程数:', filteredTrips.length);
    
    this.setData({ 
      filteredTrips: filteredTrips 
    });
  },

  // 切换标签
  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentTab: index }, () => {
      this.filterTrips();
    });
  },

  // 显示添加标签弹窗
  showAddTabModal() {
    this.setData({
      showAddTabModal: true,
      newTabName: ''
    });
  },

  // 关闭添加标签弹窗
  closeAddTabModal() {
    this.setData({ showAddTabModal: false });
  },

  // 新标签名称输入
  onNewTabNameInput(e) {
    this.setData({ newTabName: e.detail.value });
  },

  // 添加自定义标签
  addCustomTab() {
    const tabName = this.data.newTabName.trim();
    
    if (!tabName) {
      wx.showToast({
        title: '请输入标签名称',
        icon: 'none'
      });
      return;
    }
    
    if (this.data.defaultTabs.indexOf(tabName) !== -1 || 
        this.data.customTabs.indexOf(tabName) !== -1) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none'
      });
      return;
    }
    
    const customTabs = this.data.customTabs.concat([tabName]);
    this.saveCustomTabs(customTabs);
    this.closeAddTabModal();
    
    wx.showToast({
      title: '标签添加成功',
      icon: 'success'
    });
  },

  // 确认删除标签
  confirmDeleteTab(e) {
    const index = e.currentTarget.dataset.index;
    
    if (index === undefined || index === null) {
      return;
    }
    
    const tabName = this.data.customTabs[index];
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除标签"${tabName}"吗？`,
      confirmColor: '#48c4bf',
      success: (res) => {
        if (res.confirm) {
          this.doDeleteCustomTab(index);
        }
      }
    });
  },

  // 执行删除标签
  doDeleteCustomTab(index) {
    const customTabs = this.data.customTabs.slice();
    customTabs.splice(index, 1);
    
    wx.setStorageSync('customTabs', customTabs);
    
    let newCurrentTab = this.data.currentTab;
    const deletedTabIndex = this.data.defaultTabs.length + index;
    
    if (this.data.currentTab === deletedTabIndex) {
      newCurrentTab = 0;
    } else if (this.data.currentTab > deletedTabIndex) {
      newCurrentTab = this.data.currentTab - 1;
    }
    
    this.setData({ 
      customTabs: customTabs,
      currentTab: newCurrentTab
    }, () => {
      this.filterTrips();
    });
    
    wx.showToast({
      title: '删除成功',
      icon: 'success'
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 跳转到首页创建行程
  addTrip() {
    wx.navigateTo({
      url: '/pages/index/index',
      success: () => {
        console.log('成功跳转到首页创建行程');
      },
      fail: (err) => {
        console.error('跳转失败：', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 查看行程详情
  viewTripDetail(e) {
    const tripId = e.currentTarget.dataset.id;
    
    if (!tripId) {
      return;
    }
    
    wx.navigateTo({
      url: `/pages/trip_detail/trip_detail?id=${tripId}`,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '页面不存在',
          icon: 'none'
        });
      }
    });
  },

  // 编辑行程
  editTrip(e) {
    const tripId = e.currentTarget.dataset.id;
    const trip = this.data.trips.find(t => t.id === tripId);
    
    if (trip) {
      console.log('编辑行程，原始数据:', trip);
      
      // 直接使用 trip 中已存储的 typeIndex
      const typeIndex = trip.typeIndex !== undefined ? trip.typeIndex : 0;
      
      // 处理目的地数据
      let destinations = [];
      
      if (trip.destinations && Array.isArray(trip.destinations) && trip.destinations.length > 0) {
        // 有原始的 destinations 数组，直接使用
        destinations = trip.destinations;
        console.log('使用原始 destinations:', destinations);
      } else if (trip.cityName && trip.cityName !== '未指定目的地') {
        // 只有 cityName 字符串，创建基础格式
        const cityNames = trip.cityName.split(/[、,]/).map(name => name.trim()).filter(name => name);
        destinations = cityNames.map((name, index) => ({
          cityName: name,
          country: '中国',
          poiName: typeIndex, // 保存 typeIndex 到 poiName
          arrivalDate: trip.startDate || '',
          departureDate: trip.endDate || '',
          orderIndex: index + 1
        }));
        console.log('从 cityName 创建 destinations:', destinations);
      }
      
      // 获取天气和体质的索引
      const weatherIndex = this.getWeatherIndex(trip.weather);
      const physiqueIndex = this.getPhysiqueIndex(trip.physique);
      
      this.setData({
        showModal: true,
        modalTitle: '编辑行程',
        currentTripId: tripId,
        formData: {
          id: trip.id,
          tripName: trip.tripName || '',
          destinations: destinations,
          startDate: trip.startDate || '',
          endDate: trip.endDate || '',
          days: trip.days || '',
          typeIndex: typeIndex, // 使用已存储的 typeIndex
          activities: trip.activities || '',
          weather: weatherIndex,
          physique: physiqueIndex
        }
      });
    }
  },

  // 获取天气索引
  getWeatherIndex(weather) {
    if (!weather) return 0;
    const index = this.data.weatherList.indexOf(weather);
    return index >= 0 ? index : 0;
  },

  // 获取体质索引
  getPhysiqueIndex(physique) {
    if (!physique) return 0;
    const index = this.data.physiqueList.indexOf(physique);
    return index >= 0 ? index : 0;
  },

  // 确认删除行程
  confirmDeleteTrip(e) {
    const tripId = e.currentTarget.dataset.id;
    const trip = this.data.trips.find(t => t.id === tripId);
    const tripName = trip ? trip.tripName : '这个行程';
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除行程"${tripName}"吗？删除后无法恢复。`,
      confirmColor: '#0ABAB5',
      confirmText: '删除',
      cancelColor: '#636E72',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.doDeleteTrip(tripId);
        }
      }
    });
  },

  /**
   * 执行删除行程
   * @param {number} tripId - 行程ID
   */
  doDeleteTrip(tripId) {
    wx.showLoading({ 
      title: '删除中...',
      mask: true 
    });
    
    // 调用真实的删除接口
    deleteTrip(tripId)
      .then(res => {
        console.log('删除行程成功：', res);
        wx.hideLoading();
        
        // 从列表中移除
        const trips = this.data.trips.filter(t => t.id !== tripId);
        
        this.setData({ 
          trips: trips 
        }, () => {
          this.filterTrips();
        });
        
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 1500
        });
      })
      .catch(error => {
        console.error('删除行程失败：', error);
        wx.hideLoading();
        
        let errorMsg = '删除失败，请重试';
        if (error && error.message) {
          errorMsg = error.message;
        } else if (error && error.errMsg) {
          errorMsg = error.errMsg;
        }
        
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
      });
  },

  // 使用行程 - 应用到打包清单
  useTrip(e) {
    const tripId = e.currentTarget.dataset.id;
    const trip = this.data.trips.find(t => t.id === tripId);
    
    if (trip) {
      console.log('选择行程：', trip);
      
      // 保存行程数据到 Storage
      wx.setStorageSync('selectedTrip', trip);
      
      // 跳转到模板详情页
      wx.navigateTo({
        url: `/pages/template_detail/template_detail?tripId=${tripId}&place=${encodeURIComponent(trip.cityName)}&days=${trip.days}`,
        success: () => {
          console.log('成功跳转到模板详情页');
        },
        fail: (err) => {
          console.error('跳转失败：', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '行程不存在',
        icon: 'none'
      });
    }
  },

  // 阻止事件冒泡
  stopPropagation() {},

  // 关闭弹窗
  closeModal() {
    this.setData({ showModal: false });
  },

  // 表单输入处理
  onTripNameInput(e) {
    this.setData({ 'formData.tripName': e.detail.value });
  },

  // 目的地输入处理 - 把用户输入的字符串转成完整的 destinations 数组
  onDestinationsInput(e) {
    const inputValue = e.detail.value;
    const cityNames = inputValue.split(/[，,]/).map(name => name.trim()).filter(name => name);
    
    // 创建完整的 destinations 数组，包含所有必要字段
    const destinations = cityNames.map((name, index) => {
      // 检查是否已有该城市的数据（用于编辑时保留原有数据）
      const existingDest = this.data.formData.destinations.find(d => d.cityName === name);
      
      if (existingDest) {
        // 如果已有，保留原有数据
        return existingDest;
      } else {
        // 如果是新的，创建完整格式
        return {
          cityName: name,
          country: '中国',
          poiName: this.data.formData.typeIndex, // 保存当前 typeIndex 到 poiName
          arrivalDate: this.data.formData.startDate || '',
          departureDate: this.data.formData.endDate || '',
          orderIndex: index + 1
        };
      }
    });
    
    console.log('目的地输入转换:', inputValue, '->', destinations);
    
    this.setData({ 
      'formData.destinations': destinations 
    });
  },

  // 获取显示用的目的地字符串（用于输入框显示）
  getDestinationsDisplay() {
    const destinations = this.data.formData.destinations || [];
    return destinations.map(d => d.cityName).join('、');
  },

  onStartDateInput(e) {
    const startDate = e.detail.value;
    
    // 更新 destinations 中的 arrivalDate
    const destinations = this.data.formData.destinations.map(dest => ({
      ...dest,
      arrivalDate: startDate
    }));
    
    this.setData({ 
      'formData.startDate': startDate,
      'formData.destinations': destinations
    });
  },

  onEndDateInput(e) {
    const endDate = e.detail.value;
    
    // 更新 destinations 中的 departureDate
    const destinations = this.data.formData.destinations.map(dest => ({
      ...dest,
      departureDate: endDate
    }));
    
    this.setData({ 
      'formData.endDate': endDate,
      'formData.destinations': destinations
    });
  },

  onDaysInput(e) {
    const value = e.detail.value.replace(/[^\d]/g, '');
    this.setData({ 'formData.days': value });
  },

  onTypeChange(e) {
    const typeIndex = parseInt(e.detail.value);
    
    // 更新 formData 中的 typeIndex
    this.setData({ 
      'formData.typeIndex': typeIndex
    });
    
    // 同时更新 destinations 中的 poiName
    if (this.data.formData.destinations && this.data.formData.destinations.length > 0) {
      const destinations = this.data.formData.destinations.map(dest => ({
        ...dest,
        poiName: typeIndex
      }));
      
      this.setData({
        'formData.destinations': destinations
      });
    }
  },

  onActivitiesInput(e) {
    this.setData({ 'formData.activities': e.detail.value });
  },

  onWeatherChange(e) {
    this.setData({ 'formData.weather': parseInt(e.detail.value) });
  },

  onPhysiqueChange(e) {
    this.setData({ 'formData.physique': parseInt(e.detail.value) });
  },

  /**
   * 保存行程 - 修复版本，完全匹配后端接口
   */
  saveTrip() {
    const formData = this.data.formData;
    
    // 表单验证
    if (!formData.tripName.trim()) {
      wx.showToast({ title: '请输入行程名称', icon: 'none' });
      return;
    }
    
    if (!formData.destinations || formData.destinations.length === 0) {
      wx.showToast({ title: '请输入目的地', icon: 'none' });
      return;
    }
    
    if (!formData.startDate) {
      wx.showToast({ title: '请选择开始日期', icon: 'none' });
      return;
    }
    
    if (!formData.days) {
      wx.showToast({ title: '请输入天数', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...', mask: true });

    // 计算结束日期
    const endDate = this.calculateEndDate(formData.startDate, formData.days);

    // 按照接口要求的格式准备数据
    const tripData = {
      userId: this.data.userId, 
      tripName: formData.tripName.trim(),
      startDate: formData.startDate,
      endDate: endDate,
      // 确保 destinations 数组中的每个对象都有完整字段
      destinations: formData.destinations.map((dest, index) => {
        return {
          id: null,
          tripId: null,
          cityName: dest.cityName,
          country: dest.country || '中国',
          poiName: formData.typeIndex, // 保存 typeIndex 到 poiName
          arrivalDate: dest.arrivalDate || formData.startDate,
          departureDate: dest.departureDate || endDate,
          orderIndex: dest.orderIndex || index + 1
        };
      })
    };

    // 判断是编辑还是新增
    const isEdit = !!formData.id;
    
    if (isEdit) {
      // 编辑模式：调用 updateTrip
      console.log('【编辑模式】发送到后端的完整数据:', JSON.stringify(tripData, null, 2));
      console.log('【编辑模式】行程ID:', formData.id);
      
      updateTrip(formData.id, tripData)
        .then(res => {
          console.log('更新行程成功:', res);
          wx.hideLoading();
          
          // 更新成功后，刷新列表
          this.setData({ 
            showModal: false,
            page: 1
          }, () => {
            this.loadTrips();
          });
          
          wx.showToast({
            title: '更新成功',
            icon: 'success',
            duration: 1500
          });
        })
        .catch(error => {
          console.error('更新行程失败:', error);
          console.error('错误详情:', JSON.stringify(error));
          wx.hideLoading();
          
          let errorMsg = '更新失败，请重试';
          if (error && error.message) {
            errorMsg = error.message;
          } else if (error && error.errMsg) {
            errorMsg = error.errMsg;
          }
          
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
        });
    } else {
      // 新增模式：调用 createTrip
      console.log('【新增模式】发送到后端的完整数据:', JSON.stringify(tripData, null, 2));
      
      createTrip(tripData)
        .then(res => {
          console.log('创建行程成功:', res);
          wx.hideLoading();
          
          this.setData({ 
            showModal: false,
            page: 1
          }, () => {
            this.loadTrips();
          });
          
          wx.showToast({
            title: '创建成功',
            icon: 'success',
            duration: 1500
          });
        })
        .catch(error => {
          console.error('创建行程失败:', error);
          wx.hideLoading();
          
          let errorMsg = '创建失败，请重试';
          if (error && error.message) {
            errorMsg = error.message;
          } else if (error && error.errMsg) {
            errorMsg = error.errMsg;
          }
          
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
        });
    }
  },

  // 计算结束日期
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

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshTrips();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadMoreTrips();
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '我的行程 - Packup',
      path: '/pages/templates/templates'
    };
  }
});