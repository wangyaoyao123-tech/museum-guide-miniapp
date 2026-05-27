// utils/api.js - 【修复版】统一后端接口封装
const BASE_URL = 'https://wenbovr.top/api';

// 【核心保留】通用请求封装（原有功能，绝对不能删）
function request(path, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + path,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      success: res => {
        resolve(res.data || []);
      },
      fail: err => reject(err)
    });
  });
}

// ======================
// ✅ 必用接口（正常使用）
// ======================
// 获取展品列表
function getExhibits(filter = {}) {
  const query = filter.category ? `?category=${encodeURIComponent(filter.category)}` : '';
  return request(`/exhibits${query}`);
}

// 获取展品详情（遗漏！必须保留）
function getExhibitDetail(id) {
  return request(`/exhibits/${id}`);
}

// 获取广告配置
function getAds() {
  return request('/ads');
}

// ======================
// ⏸️ 支付接口（保留占位，注释禁用）
// ======================
// 创建支付订单
// function createPayOrder(openid) {
//   return request('/payment/create', 'POST', { openid });
// }

// 验证支付结果
// function verifyPayment(orderId, openid) {
//   return request('/payment/verify', 'POST', { orderId, openid });
// }

// 检查解锁状态
// function checkUnlock(openid) {
//   return request(`/payment/unlock/${openid}`);
// }

module.exports = {
  request,
  getExhibits,
  getExhibitDetail,
  getAds,
  // 支付接口注释导出
  // createPayOrder, verifyPayment, checkUnlock
};