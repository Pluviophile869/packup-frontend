// api/user.js
import request from '../utils/request';

// ========== 用户相关接口 ==========
// 对应 UserController

/**
 * 1. 用户注册 POST /api/users/register
 * @param {Object} data - 注册数据 {username, password}
 */
export const registerUser = (data) => {
  // 确保字段名正确
  const requestData = {
    username: data.username || data.phone || '',
    password: data.password
  };
  return request({
    url: '/api/users/register',
    method: 'POST',
    data: requestData
  });
};

/**
 * 2. 用户登录 POST /api/users/login
 * @param {Object} data - 登录数据 {username, password}
 */
export const loginUser = (data) => {
  const requestData = {
    username: data.username || data.phone || '',
    password: data.password
  };
  return request({
    url: '/api/users/login',
    method: 'POST',
    data: requestData
  });
};

/**
 * 3. 获取用户列表 GET /api/users
 */
export const getUserList = (params) => {
  return request({
    url: '/api/users',
    method: 'GET',
    params,
    showLoading: false
  });
};

/**
 * 4. 根据ID获取用户信息 GET /api/users/{id}
 */
export const getUserById = (id) => {
  return request({
    url: `/api/users/${id}`,
    method: 'GET'
  });
};

/**
 * 5. 根据状态查找用户 GET /api/users/status/{status}
 */
export const getUsersByStatus = (status) => {
  return request({
    url: `/api/users/status/${status}`,
    method: 'GET'
  });
};

/**
 * 6. 检查用户名是否存在 GET /api/users/check/username?username=xxx
 */
export const checkUsername = (username) => {
  return request({
    url: '/api/users/check/username',
    method: 'GET',
    params: { username }
  });
};

/**
 * 7. 检查微信OpenId是否存在 GET /api/users/check/openid?openId=xxx
 */
export const checkOpenId = (openId) => {
  return request({
    url: '/api/users/check/openid',
    method: 'GET',
    params: { openId }
  });
};

/**
 * 8. 统计用户总数 GET /api/users/count
 */
export const getUserCount = () => {
  return request({
    url: '/api/users/count',
    method: 'GET'
  });
};

/**
 * 9. 更新用户信息 PUT /api/users/{id}
 * @param {number} id - 用户ID
 * @param {Object} data - 更新数据 {nickname, avatarUrl, phone}
 */
export const updateUser = (id, data) => {
  return request({
    url: `/api/users/${id}`,
    method: 'PUT',
    data
  });
};

/**
 * 10. 删除用户 DELETE /api/users/{id}
 */
export const deleteUser = (id) => {
  return request({
    url: `/api/users/${id}`,
    method: 'DELETE'
  });
};

// ========== 用户偏好相关接口 ==========
// 对应 UserPreferenceController

/**
 * 11. 创建用户偏好 POST /api/user-preferences
 * @param {Object} data - 偏好数据
 */
export const createUserPreference = (data) => {
  return request({
    url: '/api/user-preferences',
    method: 'POST',
    data
  });
};

/**
 * 12. 根据用户ID获取偏好 GET /api/user-preferences/{userId}
 */
export const getUserPreference = (userId) => {
  return request({
    url: `/api/user-preferences/${userId}`,
    method: 'GET'
  });
};

/**
 * 13. 更新用户偏好 PUT /api/user-preferences/{userId}
 */
export const updateUserPreference = (userId, data) => {
  return request({
    url: `/api/user-preferences/${userId}`,
    method: 'PUT',
    data
  });
};

/**
 * 14. 删除用户偏好 DELETE /api/user-preferences/{userId}
 */
export const deleteUserPreference = (userId) => {
  return request({
    url: `/api/user-preferences/${userId}`,
    method: 'DELETE'
  });
};

/**
 * 15. 检查用户偏好是否存在 GET /api/user-preferences/{userId}/exists
 */
export const checkUserPreferenceExists = (userId) => {
  return request({
    url: `/api/user-preferences/${userId}/exists`,
    method: 'GET'
  });
};

// ========== 行程相关接口 ==========
// 对应 TripController

/**
 * 16. 创建行程 POST /api/trips
 * @param {Object} data - 行程数据
 */
export const createTrip = (data) => {
  console.log('createTrip 接收到的数据：', data);
  
  // 从缓存获取真实的 userId
  const userInfo = wx.getStorageSync('userInfo');
  const userId = userInfo?.id || data.userId || 1;
  
  // 构建符合后端 TripCreateDTO 的数据结构
  const tripData = {
    userId: userId,
    tripName: data.tripName || data.name || `${data.destination || data.place || '未知'}之旅`,
    startDate: data.startDate,
    endDate: data.endDate,
    destinations: data.destinations || [{
      cityName: data.destination || data.place || '',
      country: "中国",
      poiName: data.poiName || '',
      arrivalDate: data.startDate,
      departureDate: data.endDate,
      orderIndex: 0
    }]
  };
  
  console.log('发送的行程数据：', tripData);
  
  return request({
    url: '/api/trips',
    method: 'POST',
    data: tripData
  });
};

/**
 * 17. 查询所有行程 GET /api/trips
 */
export const getAllTrips = (params) => {
  return request({
    url: '/api/trips',
    method: 'GET',
    params,
    showLoading: false
  });
};

/**
 * 18. 根据ID查询行程 GET /api/trips/{tripId}
 */
export const getTripById = (tripId) => {
  return request({
    url: `/api/trips/${tripId}`,
    method: 'GET'
  });
};

/**
 * 19. 根据用户ID查询行程 GET /api/trips/user/{userId}
 */
export const getTripsByUserId = (userId, params) => {
  return request({
    url: `/api/trips/user/${userId}`,
    method: 'GET',
    params
  });
};

/**
 * 20. 更新行程 PUT /api/trips/{tripId}
 */
export const updateTrip = (tripId, data) => {
  console.log('updateTrip 接收到的数据：', data);
  
  const tripData = {
    userId: data.userId,
    tripName: data.tripName,
    startDate: data.startDate,
    endDate: data.endDate,
    destinations: data.destinations || [{
      cityName: data.destination || data.place || '',
      country: "中国",
      poiName: data.poiName || '',
      arrivalDate: data.startDate,
      departureDate: data.endDate,
      orderIndex: 0
    }]
  };
  
  console.log('发送的更新数据：', tripData);
  
  return request({
    url: `/api/trips/${tripId}`,
    method: 'PUT',
    data: tripData
  });
};

/**
 * 21. 删除行程 DELETE /api/trips/{tripId}
 */
export const deleteTrip = (tripId) => {
  return request({
    url: `/api/trips/${tripId}`,
    method: 'DELETE'
  });
};

/**
 * 22. 基于天气生成打包物品 POST /api/trips/{tripId}/generate-weather-items
 */
export const generateWeatherItems = (tripId) => {
  return request({
    url: `/api/trips/${tripId}/generate-weather-items`,
    method: 'POST',
    showLoading: true,
    loadingText: '正在根据天气生成物品...'
  });
};

/**
 * 23. 基于AI生成打包物品 POST /api/trips/{tripId}/generate-ai-items
 */
export const generateAIItems = (tripId) => {
  return request({
    url: `/api/trips/${tripId}/generate-ai-items`,
    method: 'POST',
    showLoading: true,
    loadingText: 'AI正在智能生成物品...'
  });
};

// ========== 打包物品相关接口 ==========
// 对应 PackingController

/**
 * 24. 创建打包物品 POST /api/packing/list
 * @param {Object} data - 物品数据
 */
export const createPackingItem = (data) => {
  // 构建符合后端 PackingItemCreateDTO 的数据结构
  const requestData = {
    tripId: data.tripId,
    name: data.name,
    quantity: data.quantity || 1,
    category: data.category || '其他物品',
    subCategory: data.subCategory || '',
    notes: data.notes || ''
  };
  
  return request({
    url: '/api/packing/list',
    method: 'POST',
    data: requestData
  });
};

/**
 * 25. 获取行程所有打包物品 GET /api/packing/list/trip/{tripId}
 */
export const getPackingItemsByTrip = (tripId) => {
  return request({
    url: `/api/packing/list/trip/${tripId}`,
    method: 'GET',
    showLoading: false
  });
};

/**
 * 26. 获取单个打包物品 GET /api/packing/list/{itemId}
 */
export const getPackingItemById = (itemId) => {
  return request({
    url: `/api/packing/list/${itemId}`,
    method: 'GET'
  });
};

/**
 * 27. 更新打包物品 PUT /api/packing/list/{itemId}
 * @param {number} itemId - 物品ID
 * @param {Object} data - 更新数据
 */
export const updatePackingItem = (itemId, data) => {
  // 构建符合后端 PackingItemUpdateDTO 的数据结构
  const requestData = {
    name: data.name,
    quantity: data.quantity,
    category: data.category,
    subCategory: data.subCategory,
    notes: data.notes,
    isPacked: data.isPacked !== undefined ? data.isPacked : data.checked
  };
  
  // 删除未定义的字段
  Object.keys(requestData).forEach(key => {
    if (requestData[key] === undefined) {
      delete requestData[key];
    }
  });
  
  return request({
    url: `/api/packing/list/${itemId}`,
    method: 'PUT',
    data: requestData
  });
};

/**
 * 28. 删除打包物品 DELETE /api/packing/list/{itemId}
 */
export const deletePackingItem = (itemId) => {
  return request({
    url: `/api/packing/list/${itemId}`,
    method: 'DELETE'
  });
};

// ========== 模板相关接口 ==========
// 对应 PackingController - 注意：模板接口是在 PackingController 下

/**
 * 29. 保存为模板 POST /api/packing/template
 * @param {Object} data - 模板数据 {templateName, description, tripId}
 */
export const saveTripAsTemplate = (data) => {
  console.log('【saveTripAsTemplate】原始数据：', data);
  
  // 获取当前用户ID
  const userInfo = wx.getStorageSync('userInfo');
  const userId = userInfo?.id;
  
  // 根据接口文档构建正确的数据结构
  const requestData = {
    templateName: data.templateName || data.name || '默认模板',
    description: data.description || '',
    tripId: data.tripId,  // 关联的行程ID
    userId: userId
  };
  
  console.log('【saveTripAsTemplate】发送数据：', requestData);
  
  return request({
    url: '/api/packing/template',
    method: 'POST',
    data: requestData
  }).catch(error => {
    console.log('后端保存失败，自动存储到本地', error);
    // 返回一个成功的Promise，让前端可以存本地
    return Promise.resolve({ 
      success: true, 
      data: { 
        ...requestData, 
        id: Date.now(),
        userId: userId,
        local: true 
      } 
    });
  });
};

/**
 * 30. 获取所有模板 GET /api/packing/templates
 * @param {Object} params - 分页参数
 */
export const getAllTemplates = (params) => {
  return request({
    url: '/api/packing/templates',
    method: 'GET',
    params,
    showLoading: false
  });
};

/**
 * 31. 应用模板到行程 POST /api/packing/template/apply
 * @param {Object} data - {templateId, tripId}
 */
export const applyTemplate = (data) => {
  // 构建符合后端的数据结构
  const requestData = {
    templateId: data.templateId,
    tripId: data.tripId
  };
  
  return request({
    url: '/api/packing/template/apply',
    method: 'POST',
    data: requestData
  });
};

// ========== 本地存储辅助函数 ==========

/**
 * 保存模板到本地（当后端失败时）- 按用户区分
 * @param {Object} templateData - 模板数据
 */
export const saveTemplateToLocal = (templateData) => {
  try {
    // 获取当前用户ID
    const userInfo = wx.getStorageSync('userInfo');
    const userId = userInfo?.id || 'anonymous';
    
    // 使用用户特定的存储键
    const storageKey = `templates_${userId}`;
    const templates = wx.getStorageSync(storageKey) || [];
    
    const newTemplate = {
      id: Date.now(),
      ...templateData,
      userId: userId,
      createTime: new Date().toISOString().split('T')[0],
      local: true
    };
    templates.unshift(newTemplate);
    wx.setStorageSync(storageKey, templates);
    return newTemplate;
  } catch (error) {
    console.error('保存到本地失败：', error);
    return null;
  }
};

/**
 * 获取本地模板列表 - 按当前用户
 */
export const getLocalTemplates = () => {
  try {
    // 获取当前用户ID
    const userInfo = wx.getStorageSync('userInfo');
    const userId = userInfo?.id || 'anonymous';
    
    const storageKey = `templates_${userId}`;
    return wx.getStorageSync(storageKey) || [];
  } catch (error) {
    console.error('获取本地模板失败：', error);
    return [];
  }
};

/**
 * 根据用户ID获取本地模板
 * @param {number|string} userId - 用户ID
 */
export const getLocalTemplatesByUserId = (userId) => {
  try {
    if (!userId) return [];
    const storageKey = `templates_${userId}`;
    return wx.getStorageSync(storageKey) || [];
  } catch (error) {
    console.error('获取本地模板失败：', error);
    return [];
  }
};

/**
 * 删除本地模板
 * @param {number} templateId - 模板ID
 */
export const deleteLocalTemplate = (templateId) => {
  try {
    // 获取当前用户ID
    const userInfo = wx.getStorageSync('userInfo');
    const userId = userInfo?.id || 'anonymous';
    
    const storageKey = `templates_${userId}`;
    const templates = wx.getStorageSync(storageKey) || [];
    const newTemplates = templates.filter(t => t.id !== templateId);
    wx.setStorageSync(storageKey, newTemplates);
    return true;
  } catch (error) {
    console.error('删除本地模板失败：', error);
    return false;
  }
};

/**
 * 更新本地模板
 * @param {number} templateId - 模板ID
 * @param {Object} updateData - 更新数据
 */
export const updateLocalTemplate = (templateId, updateData) => {
  try {
    // 获取当前用户ID
    const userInfo = wx.getStorageSync('userInfo');
    const userId = userInfo?.id || 'anonymous';
    
    const storageKey = `templates_${userId}`;
    const templates = wx.getStorageSync(storageKey) || [];
    const index = templates.findIndex(t => t.id === templateId);
    
    if (index !== -1) {
      templates[index] = { ...templates[index], ...updateData };
      wx.setStorageSync(storageKey, templates);
      return true;
    }
    return false;
  } catch (error) {
    console.error('更新本地模板失败：', error);
    return false;
  }
};