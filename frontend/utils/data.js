// 引入官方修复后的api.js（全项目统一）
const api = require('./utils/api.js');

// 获取展品数据（调用统一接口）
function getExhibitData() {
  return api.getExhibits().catch(() => []);
}

module.exports = { getExhibitData };