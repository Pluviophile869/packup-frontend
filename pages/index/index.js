// pages/index/index.js
import {
  createTrip,
  generateAIItems,
  generateWeatherItems,
  getAllTemplates,
  getUserPreference
} from '../../api/user';

Page({
  data: {
    place: '',       // 旅行地点
    days: '',        // 旅行天数
    date: '',        // 出行日期
    startDate: '',   // 可选开始日期（今天）
    endDate: '',     // 可选结束日期（一年后）
    weatherIndex: 0, // 天气选择索引
    weatherList: ['晴天', '雨天', '寒冷', '炎热'],
    typeIndex: 0,    // 旅行类型索引
    typeList: ['休闲旅行', '户外徒步', '商务出行'],
    activities: '',
    physiqueIndex: 0, // 体质选择索引
    physiqueList: ['无特殊情况', '怕热', '怕冷', '鼻炎/过敏', '易晕车/晕船'],
    showSidebar: false,
    errors: {},
    userId: null,
    userName: '旅行者',
    isLoading: false,
    
    // 生成选项 - 默认全部开启
    generateOptions: {
      weather: true,  // 默认开启天气生成
      ai: true        // 默认开启AI生成
    },
    
    // 生成状态
    weatherGenerating: false,
    aiGenerating: false,
    
    // 生成结果
    generateResults: []
  },

  onLoad() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    const today = `${year}-${month}-${day}`;
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    
    this.setData({
      startDate: today,
      endDate: next.toISOString().split('T')[0]
    });

    // 从缓存获取用户信息
    this.getUserInfo();
    
    // 从缓存获取用户偏好设置
    this.loadUserPreferences();
  },

  onShow() {
    // 每次显示页面时重新获取用户信息（确保最新）
    this.getUserInfo();
  },

  // 获取用户信息
  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    console.log('从缓存获取的用户信息:', userInfo);
    
    if (userInfo) {
      // 获取用户名 - 根据你的后端返回结构调整
      let userName = '旅行者';
      
      // 尝试多种可能的字段名
      if (userInfo.username) {
        userName = userInfo.username;
      } else if (userInfo.data?.username) {
        userName = userInfo.data.username;
      } else if (userInfo.user?.username) {
        userName = userInfo.user.username;
      } else if (userInfo.nickName) {
        userName = userInfo.nickName;
      } else if (userInfo.nickname) {
        userName = userInfo.nickname;
      } else if (userInfo.name) {
        userName = userInfo.name;
      }
      
      this.setData({ 
        userId: userInfo.id || userInfo.userId || userInfo.data?.id,
        userName: userName
      });
      
      console.log('设置的用户名:', userName);
    } else {
      this.setData({ 
        userId: null,
        userName: '旅行者'
      });
    }
  },

  // 加载用户偏好设置
  loadUserPreferences() {
    try {
      const preferences = wx.getStorageSync('userPreferences');
      if (preferences) {
        this.setData({
          'generateOptions.weather': preferences.weather !== false,
          'generateOptions.ai': preferences.ai === true
        });
      }
    } catch (error) {
      console.log('加载用户偏好失败:', error);
    }
  },

  // 保存用户偏好设置
  saveUserPreferences() {
    try {
      wx.setStorageSync('userPreferences', {
        weather: this.data.generateOptions.weather,
        ai: this.data.generateOptions.ai
      });
    } catch (error) {
      console.log('保存用户偏好失败:', error);
    }
  },

  // 切换天气生成选项
  toggleWeatherOption() {
    this.setData({
      'generateOptions.weather': !this.data.generateOptions.weather
    }, () => {
      this.saveUserPreferences();
      wx.showToast({
        title: this.data.generateOptions.weather ? '已开启天气生成' : '已关闭天气生成',
        icon: 'none',
        duration: 1000
      });
    });
  },

  // 切换AI生成选项
  toggleAIOption() {
    this.setData({
      'generateOptions.ai': !this.data.generateOptions.ai
    }, () => {
      this.saveUserPreferences();
      wx.showToast({
        title: this.data.generateOptions.ai ? '已开启AI智能生成' : '已关闭AI生成',
        icon: 'none',
        duration: 1000
      });
    });
  },

  setPlace(e) {
    this.setData({ place: e.detail.value });
  },

  setDate(e) {
    this.setData({ date: e.detail.value });
  },

  setDays(e) {
    this.setData({ days: e.detail.value });
  },

  setWeather(e) {
    this.setData({ weatherIndex: parseInt(e.detail.value) });
  },

  setType(e) {
    this.setData({ typeIndex: parseInt(e.detail.value) });
  },

  setActivities(e) {
    this.setData({ activities: e.detail.value });
  },

  setPhysique(e) {
    this.setData({ physiqueIndex: parseInt(e.detail.value) });
  },

  // 验证表单
  validateForm() {
    if (!this.data.place || this.data.place.trim() === '') {
      wx.showToast({ title: '请输入旅行目的地', icon: 'none' });
      return false;
    }

    if (!this.data.date || this.data.date.trim() === '') {
      wx.showToast({ title: '请选择出发日期', icon: 'none' });
      return false;
    }

    if (!this.data.days || this.data.days.trim() === '') {
      wx.showToast({ title: '请输入旅行天数', icon: 'none' });
      return false;
    }

    if (this.data.days && (isNaN(this.data.days) || parseInt(this.data.days) <= 0)) {
      wx.showToast({ title: '请输入有效的天数', icon: 'none' });
      return false;
    }

    return true;
  },

  // 计算结束日期
  calculateEndDate(startDate, days) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + parseInt(days) - 1);
    return date.toISOString().split('T')[0];
  },

  // 获取打包清单（主功能）- 同时触发AI和天气生成
  async getList() {
    if (this.data.isLoading) return;
    
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.id) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再生成清单',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
      return;
    }
    
    if (!this.validateForm()) return;

    this.setData({ 
      isLoading: true,
      generateResults: [] 
    });

    try {
      wx.showLoading({ title: '生成行程中...', mask: true });

      // 计算结束日期
      const endDate = this.calculateEndDate(this.data.date, this.data.days);

      // 行程数据 - 使用后端期望的字段名
      const tripData = {
        userId: userInfo.id,
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
        }],
        activities: this.data.activities,
      };

      console.log('【1.发送的行程数据】', tripData);

      // 创建行程
      let trip;
      try {
        trip = await createTrip(tripData);
        console.log('【2.创建行程返回】', trip);
      } catch (error) {
        console.log('【2.创建行程失败，使用模拟数据】', error);
        trip = { id: Date.now(), tripId: Date.now() };
      }
      
      // 获取行程ID - 兼容多种返回格式
      const tripId = trip?.id || trip?.tripId || trip?.data?.id;
      if (!tripId) {
        throw new Error('无法获取行程ID');
      }
      
      console.log('【3.最终tripId】', tripId);

      // 更新加载提示
      wx.showLoading({ title: '生成物品中...', mask: true });

      // 4. 根据用户选择并行调用生成接口（同时触发）
      const promises = [];
      const generateResults = [];

      // 4.1 如果开启了天气生成
      if (this.data.generateOptions.weather) {
        this.setData({ weatherGenerating: true });
        console.log('【4.1开始天气生成】tripId:', tripId);
        
        promises.push(
          generateWeatherItems(tripId)
            .then(result => {
              console.log('【4.1天气生成成功】', result);
              generateResults.push({
                type: 'weather',
                success: true,
                message: '天气物品生成成功',
                data: result
              });
              return { type: 'weather', success: true };
            })
            .catch(error => {
              console.error('【4.1天气生成失败】', error);
              generateResults.push({
                type: 'weather',
                success: false,
                message: error.message || '天气生成失败',
                error: error
              });
              return { type: 'weather', success: false };
            })
            .finally(() => {
              this.setData({ weatherGenerating: false });
            })
        );
      }

      // 4.2 如果开启了AI生成
      if (this.data.generateOptions.ai) {
        this.setData({ aiGenerating: true });
        console.log('【4.2开始AI生成】tripId:', tripId);
        
        promises.push(
          generateAIItems(tripId)
            .then(result => {
              console.log('【4.2AI生成成功】', result);
              generateResults.push({
                type: 'ai',
                success: true,
                message: 'AI物品生成成功',
                data: result
              });
              return { type: 'ai', success: true };
            })
            .catch(error => {
              console.error('【4.2AI生成失败】', error);
              generateResults.push({
                type: 'ai',
                success: false,
                message: error.message || 'AI生成失败',
                error: error
              });
              return { type: 'ai', success: false };
            })
            .finally(() => {
              this.setData({ aiGenerating: false });
            })
        );
      }

      // 等待所有生成任务完成
      if (promises.length > 0) {
        await Promise.all(promises);
      }
      
      wx.hideLoading();
      
      // 保存生成结果
      this.setData({ generateResults });

      // 准备跳转参数
      const queryParams = {
        place: this.data.place,
        date: this.data.date,
        days: this.data.days,
        weatherIndex: this.data.weatherIndex,
        typeIndex: this.data.typeIndex,
        activities: this.data.activities || '',
        physiqueIndex: this.data.physiqueIndex,
        tripId: tripId
      };

      const queryString = Object.keys(queryParams)
        .map(key => `${key}=${encodeURIComponent(queryParams[key] || '')}`)
        .join('&');
      
      console.log('【5.跳转URL】', `/pages/result/result?${queryString}`);
      console.log('【6.生成结果汇总】', generateResults);

      // 显示生成结果汇总
      const successCount = generateResults.filter(r => r.success).length;
      const failCount = generateResults.filter(r => !r.success).length;
      const totalCount = generateResults.length;
      
      if (totalCount > 0) {
        let content = '';
        if (successCount === totalCount) {
          content = `🌤️ 天气生成: ${generateResults.find(r => r.type === 'weather')?.success ? '成功' : '未开启'}\n🪄 AI生成: ${generateResults.find(r => r.type === 'ai')?.success ? '成功' : '未开启'}`;
        } 
        
        wx.showModal({
          title: successCount === totalCount ? '✨ 生成完成' : '⚠️ 生成完成（部分失败）',
          content: content,
          confirmText: '查看清单',
          showCancel: false,
          success: () => {
            wx.navigateTo({
              url: `/pages/result/result?${queryString}`
            });
          }
        });
      } else {
        // 没有开启任何生成选项，直接跳转
        wx.navigateTo({
          url: `/pages/result/result?${queryString}`
        });
      }

    } catch (error) {
      console.error('生成清单失败：', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '生成失败，请重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ 
        isLoading: false,
        weatherGenerating: false,
        aiGenerating: false
      });
    }
  },

  // 单独调用天气生成（用于测试）
  async testWeatherGenerate() {
    if (!this.data.userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '测试天气生成',
      content: '这将创建一个测试行程并调用天气生成接口',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ isLoading: true });
          
          try {
            // 创建测试行程
            const testDate = new Date().toISOString().split('T')[0];
            const testEndDate = this.calculateEndDate(testDate, '3');
            
            const tripData = {
              userId: this.data.userId,
              tripName: '测试行程',
              startDate: testDate,
              endDate: testEndDate,
              destinations: [{
                cityName: '北京',
                country: "中国",
                poiName: '休闲旅行',
                arrivalDate: testDate,
                departureDate: testEndDate,
                orderIndex: 0
              }]
            };

            wx.showLoading({ title: '创建行程...' });
            const trip = await createTrip(tripData);
            const tripId = trip?.id || trip?.tripId || trip?.data?.id;

            wx.showLoading({ title: '调用天气生成...' });
            const result = await generateWeatherItems(tripId);
            
            wx.hideLoading();
            
            wx.showModal({
              title: '测试成功',
              content: `天气生成接口调用成功\n行程ID: ${tripId}`,
              confirmText: '查看详情',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.navigateTo({
                    url: `/pages/result/result?tripId=${tripId}`
                  });
                }
              }
            });
            
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '测试失败',
              icon: 'none'
            });
          } finally {
            this.setData({ isLoading: false });
          }
        }
      }
    });
  },

  // 单独调用AI生成（用于测试）
  async testAIGenerate() {
    if (!this.data.userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '测试AI生成',
      content: '这将创建一个测试行程并调用AI生成接口',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ isLoading: true });
          
          try {
            // 创建测试行程
            const testDate = new Date().toISOString().split('T')[0];
            const testEndDate = this.calculateEndDate(testDate, '3');
            
            const tripData = {
              userId: this.data.userId,
              tripName: '测试行程',
              startDate: testDate,
              endDate: testEndDate,
              destinations: [{
                cityName: '上海',
                country: "中国",
                poiName: '休闲旅行',
                arrivalDate: testDate,
                departureDate: testEndDate,
                orderIndex: 0
              }],
              activities: '测试AI生成功能'
            };

            wx.showLoading({ title: '创建行程...' });
            const trip = await createTrip(tripData);
            const tripId = trip?.id || trip?.tripId || trip?.data?.id;

            wx.showLoading({ title: '调用AI生成...' });
            const result = await generateAIItems(tripId);
            
            wx.hideLoading();
            
            wx.showModal({
              title: '测试成功',
              content: `AI生成接口调用成功\n行程ID: ${tripId}`,
              confirmText: '查看详情',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.navigateTo({
                    url: `/pages/result/result?tripId=${tripId}`
                  });
                }
              }
            });
            
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '测试失败',
              icon: 'none'
            });
          } finally {
            this.setData({ isLoading: false });
          }
        }
      }
    });
  },

  openSidebar() {
    this.setData({ showSidebar: true });
  },

  closeSidebar() {
    this.setData({ showSidebar: false });
  },

  goToPage(e) {
    const page = e.currentTarget.dataset.page;
    this.closeSidebar();
    
    switch(page) {
      case 'favorites':
        wx.navigateTo({ url: '/pages/templates/templates' });
        break;
      case 'myTrips':
        if (this.data.userId) {
          wx.navigateTo({ url: `/pages/trips/trips?userId=${this.data.userId}` });
        } else {
          wx.showToast({ title: '请先登录', icon: 'none' });
        }
        break;
      default:
        wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('token');
          wx.removeStorageSync('userPreferences');
          this.setData({ 
            userId: null, 
            userName: '旅行者',
            showSidebar: false,
            'generateOptions.weather': true,
            'generateOptions.ai': true
          });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  fillTemplateData(template) {
    this.setData({
      place: template.destination || template.place || '',
      days: template.days ? template.days.toString() : '',
      typeIndex: this.data.typeList.indexOf(template.type) >= 0 ? 
                 this.data.typeList.indexOf(template.type) : 0
    });
  }
});