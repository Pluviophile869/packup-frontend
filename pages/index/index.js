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
    isLoading: false
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

    // 从缓存获取用户ID
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.id) {
      this.setData({ userId: userInfo.id });
    }
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
    date.setDate(date.getDate() + parseInt(days));
    return date.toISOString().split('T')[0];
  },

  // 获取打包清单（主功能）
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

    this.setData({ isLoading: true });

    try {
      wx.showLoading({ title: '生成清单中...', mask: true });

      // 行程数据 - 使用后端期望的字段名
      const tripData = {
        userId: userInfo.id,  // 从登录信息获取真实userId
        tripName: `${this.data.place}之旅`,
        startDate: this.data.date,
        endDate: this.calculateEndDate(this.data.date, this.data.days),
        destinations: [{
          cityName: this.data.place,
          country: "中国",
          arrivalDate: this.data.date,
          departureDate: this.calculateEndDate(this.data.date, this.data.days),
          orderIndex: 0
        }]
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
      const tripId = trip?.id || trip?.tripId || trip?.data?.id || Date.now();
      console.log('【3.最终tripId】', tripId);

      wx.hideLoading();
      
      // 准备跳转参数
      const queryParams = {
        place: this.data.place,
        date: this.data.date,
        days: this.data.days,
        weatherIndex: this.data.weatherIndex,
        typeIndex: this.data.typeIndex,
        activities: this.data.activities || '',
        physiqueIndex: this.data.physiqueIndex,
        tripId: tripId  // 传递真实的行程ID
      };

      const queryString = Object.keys(queryParams)
        .map(key => `${key}=${encodeURIComponent(queryParams[key] || '')}`)
        .join('&');
      
      console.log('【4.跳转URL】', `/pages/result/result?${queryString}`);

      wx.navigateTo({
        url: `/pages/result/result?${queryString}`
      });

    } catch (error) {
      console.error('生成清单失败：', error);
      wx.hideLoading();
      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
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
          this.setData({ 
            userId: null, 
            showSidebar: false 
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