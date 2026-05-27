const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// 数据库配置（和你原来的保持一致，不用修改）
const dbConfig = {
  host: 'localhost',
  user: 'museum_user',
  password: 'Feiyang1%',
  database: 'museum_db',
  charset: 'utf8mb4'
};

// 1. 【保留原格式】获取所有展品列表（直接返回数组，和你的前端兼容，图片能正常显示）
router.get('/', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM exhibits ORDER BY id ASC');
    await connection.end();
    // ✅ 和你原来的代码一样，直接返回数组，前端不用改也能解析
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '获取展品数据失败' });
  }
});

// 2. 【新增】获取单个展品详情（解决404报错）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM exhibits WHERE id = ?', [id]);
    await connection.end();

    if (rows.length > 0) {
      // 这里可以根据你的前端需求，返回详情数据，格式和列表保持一致即可
      res.json(rows[0]);
    } else {
      res.status(404).json({ msg: "展品不存在" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '获取展品详情失败' });
  }
});

module.exports = router;