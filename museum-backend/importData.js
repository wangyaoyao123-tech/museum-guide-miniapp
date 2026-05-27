// 导入数据库配置
require('dotenv').config();
const mysql = require('mysql2/promise');
// 导入数据（data是包含exhibits和categories的对象）
const data = require('../museum-guide-miniapp-0408/utils/data.js');

// 自动插入数据
async function importData() {
  // 连接数据库
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // 循环插入所有展品，核心修改：处理tags字段的空字符串
    for (let item of data.exhibits) {
      // 关键处理：如果tags是空字符串，转为合法空JSON数组[]
      const tags = item.tags === '' ? [] : item.tags;
      
      await connection.query(
        `INSERT INTO exhibits (id, name, category, hall, image, description, audio_url, audio_title, audio_duration, tags, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.category,
          item.hall,
          item.image,
          item.description,
          item.audioUrl,
          item.audioTitle,
          item.audioDuration,
          tags,
          Number(item.id) // 用 id 作为排序序号，保证返回顺序稳定
        ]
      );
    }
    console.log('✅ 37件展品数据插入成功！');
  } catch (err) {
    console.error('插入失败：', err);
  } finally {
    connection.end();
  }
}

importData();