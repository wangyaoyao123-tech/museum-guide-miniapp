// utils/ad.js — 前端广告管理工具
// 所有广告资源均来自后端接口，本文件仅负责本地状态管理（关闭时效、激励计数、免广告期）
// 禁止在此处硬编码任何广告图片、链接或文案

const BANNER_DISMISS_KEY  = 'ad_banner_dismiss_at';   // Banner 关闭时间戳
const AD_FREE_UNTIL_KEY   = 'ad_free_until';           // 免广告到期时间戳
const REWARD_COUNT_PREFIX = 'ad_reward_count_';        // 激励视频每日计数前缀

/** 返回今日日期字符串，用于激励视频每日计数 key */
function _today() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// ── Banner 关闭管控（关闭后 30 分钟内不再展示） ─────────────────────────────

/** 判断 Banner 是否处于关闭抑制期 */
function isBannerDismissed() {
  try {
    const t = wx.getStorageSync(BANNER_DISMISS_KEY);
    return t ? (Date.now() - t < 30 * 60 * 1000) : false;
  } catch (e) { return false; }
}

/** 记录 Banner 关闭时间 */
function dismissBanner() {
  try { wx.setStorageSync(BANNER_DISMISS_KEY, Date.now()); } catch (e) {}
}

// ── 免广告特权管控（激励视频完整观看后触发） ─────────────────────────────────

/** 判断当前是否处于免广告特权期 */
function isAdFree() {
  try {
    const until = wx.getStorageSync(AD_FREE_UNTIL_KEY);
    return until ? (Date.now() < until) : false;
  } catch (e) { return false; }
}

/**
 * 设置免广告特权到期时间
 * @param {number} minutes 免广告时长（分钟），由后端配置下发
 */
function setAdFree(minutes) {
  try {
    wx.setStorageSync(AD_FREE_UNTIL_KEY, Date.now() + minutes * 60 * 1000);
  } catch (e) {}
}

/** 获取免广告剩余分钟数（0 表示已过期或未设置） */
function getAdFreeRemainMinutes() {
  try {
    const until = wx.getStorageSync(AD_FREE_UNTIL_KEY);
    if (!until || Date.now() >= until) return 0;
    return Math.ceil((until - Date.now()) / 60000);
  } catch (e) { return 0; }
}

// ── 激励视频每日计数管控 ──────────────────────────────────────────────────────

/**
 * 判断今日是否还可以观看激励视频
 * @param {number} dailyLimit 每日上限（由后端配置下发）
 */
function canWatchRewardVideo(dailyLimit) {
  try {
    const count = wx.getStorageSync(REWARD_COUNT_PREFIX + _today()) || 0;
    return count < dailyLimit;
  } catch (e) { return true; }
}

/** 记录一次激励视频观看（每日计数 +1） */
function recordRewardVideoWatch() {
  try {
    const key = REWARD_COUNT_PREFIX + _today();
    const count = wx.getStorageSync(key) || 0;
    wx.setStorageSync(key, count + 1);
  } catch (e) {}
}

/** 获取今日已观看激励视频次数 */
function getTodayRewardCount() {
  try {
    return wx.getStorageSync(REWARD_COUNT_PREFIX + _today()) || 0;
  } catch (e) { return 0; }
}

// ── 信息流原生广告混入 ─────────────────────────────────────────────────────────

/**
 * 将原生广告混入展品列表，每 10 条展品后插入 1 条广告
 * @param {Array} exhibits  展品数组
 * @param {Array} nativeAds 原生广告数组（来自后端）
 * @returns {Array} 混合后的展示列表，广告条目带有 _isAd:true 标志
 */
function mixNativeAds(exhibits, nativeAds) {
  if (!nativeAds || !nativeAds.length) return exhibits;
  const result = [];
  let adIdx = 0;
  for (let i = 0; i < exhibits.length; i++) {
    result.push(exhibits[i]);
    // 每满 10 条展品后插入 1 条广告
    if ((i + 1) % 10 === 0) {
      result.push({
        ...nativeAds[adIdx % nativeAds.length],
        _isAd: true,
        _adKey: 'native_' + adIdx
      });
      adIdx++;
    }
  }
  return result;
}

// ── 激励视频播放（微信流量主 API，含开发环境模拟兜底） ────────────────────────

/**
 * 播放激励视频广告
 * @param {object} rewardCfg 后端下发的 reward_video 配置
 * @param {Function} onComplete 用户完整观看后的回调
 */
function playRewardVideo(rewardCfg, onComplete) {
  if (!rewardCfg || !rewardCfg.ad_unit_id) {
    // 开发环境兜底：模拟用户观看完成
    wx.showModal({
      title: '开发环境模拟',
      content: '生产环境将播放激励视频广告。\n模拟完整观看，解锁免广告特权？',
      confirmText: '模拟完成',
      success: (res) => { if (res.confirm) onComplete(); }
    });
    return;
  }

  // 生产环境：使用微信流量主激励视频组件（需申请流量主资质）
  const videoAd = wx.createRewardedVideoAd({ adUnitId: rewardCfg.ad_unit_id });

  videoAd.onError((err) => {
    console.warn('[Ad] 激励视频加载失败', err);
    wx.showToast({ title: '视频加载失败，请稍后再试', icon: 'none' });
  });

  videoAd.onClose((res) => {
    // isEnded === true 表示用户完整观看
    if (res && res.isEnded) {
      onComplete();
    } else {
      wx.showToast({ title: '完整观看后可解锁免广告特权', icon: 'none', duration: 2000 });
    }
  });

  videoAd.load().then(() => videoAd.show()).catch(() => {
    wx.showToast({ title: '暂无可用广告', icon: 'none' });
  });
}

module.exports = {
  isBannerDismissed,
  dismissBanner,
  isAdFree,
  setAdFree,
  getAdFreeRemainMinutes,
  canWatchRewardVideo,
  recordRewardVideoWatch,
  getTodayRewardCount,
  mixNativeAds,
  playRewardVideo
};
