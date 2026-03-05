// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

    // 检查登录状态
    this.checkLogin();
  },

  onShow() {
    // 每次显示小程序时检查登录状态
    this.checkLogin();
  },

  // 检查登录状态
  checkLogin() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    // 获取当前页面栈
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const currentRoute = currentPage ? currentPage.route : '';
    
    // 如果未登录且当前不是登录页，则跳转到登录页
    if (!token || !userInfo) {
      // 避免在登录页重复跳转
      if (currentRoute && currentRoute !== 'pages/login/login') {
        wx.reLaunch({
          url: '/pages/login/login'
        });
      }
    }
  },

  // 用户登录（调用微信登录）
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: res => {
          if (res.code) {
            // 这里应该发送 res.code 到后台换取 openId, sessionKey, unionId
            console.log('微信登录code:', res.code);
            
            // 模拟登录成功
            const mockToken = 'mock_token_' + Date.now();
            const mockUserInfo = {
              nickName: '微信用户',
              avatarUrl: ''
            };
            
            // 保存登录状态
            this.setLoginStatus(mockToken, mockUserInfo);
            resolve({ token: mockToken, userInfo: mockUserInfo });
          } else {
            console.error('登录失败', res.errMsg);
            reject(res.errMsg);
          }
        },
        fail: err => {
          console.error('微信登录失败', err);
          reject(err);
        }
      });
    });
  },

  // 手机号密码登录
  loginWithPhone(phone, password) {
    return new Promise((resolve, reject) => {
      // 模拟登录请求
      setTimeout(() => {
        if (phone && password) {
          const token = 'phone_token_' + Date.now();
          const userInfo = {
            phone: phone,
            nickName: '用户' + phone.slice(-4),
            avatarUrl: ''
          };
          
          this.setLoginStatus(token, userInfo);
          resolve({ token, userInfo });
        } else {
          reject('登录失败');
        }
      }, 1000);
    });
  },

  // 保存登录状态
  setLoginStatus(token, userInfo) {
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', userInfo);
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
  },

  // 退出登录
  logout() {
    // 清除本地存储的登录信息
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    
    // 清除全局数据
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    
    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    });
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false
  }
});