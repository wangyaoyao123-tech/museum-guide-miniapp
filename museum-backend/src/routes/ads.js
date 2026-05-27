// src/routes/ads.js — 广告配置接口（所有广告资源由此接口动态下发）
const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * GET /api/ads
 * 返回全部启用中的广告配置，按类型分组
 * 响应结构：
 *   carousel   — 首页顶部轮播推广（数组）
 *   banner     — 底部 Banner 图片广告（单条）
 *   reward_video — 激励视频配置（单条）
 *   native     — 展品列表信息流原生广告（数组）
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM ads WHERE is_active = 1 ORDER BY sort_order ASC'
    );

    const carousel    = rows.filter(r => r.type === 'carousel');
    const banner      = rows.find(r => r.type === 'banner') || null;
    const rewardVideo = rows.find(r => r.type === 'reward_video') || null;
    const native      = rows.filter(r => r.type === 'native');

    res.json({ code: 0, data: { carousel, banner, reward_video: rewardVideo, native } });
  } catch (e) {
    res.json({ code: 500, msg: e.message });
  }
});

module.exports = router;
