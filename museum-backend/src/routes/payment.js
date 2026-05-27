const express = require('express');
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');
const axios = require('axios');

// 生成订单号
function genOrderId() {
  return 'MUS' + Date.now() + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// 微信支付签名
function wxSign(method, url, timestamp, nonce, body) {
  const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(process.env.WX_PRIVATE_KEY.replace(/\\n/g, '\n'), 'base64');
}

// 生成Authorization头
function wxAuthHeader(method, url, body) {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const signature = wxSign(method, url, timestamp, nonce, body);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${process.env.WX_MCHID}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${process.env.WX_SERIAL_NO}"`;
}

// 创建支付订单
router.post('/create', async (req, res) => {
  const { openid } = req.body;
  if (!openid) return res.json({ code: 400, msg: '缺少openid' });

  const orderId = genOrderId();
  const amount = 2990; // 29.90元

  try {
    const payData = {
      appid: process.env.WX_APPID,
      mchid: process.env.WX_MCHID,
      description: '博物馆语音导览解锁',
      out_trade_no: orderId,
      notify_url: process.env.WX_NOTIFY_URL,
      amount: { total: amount, currency: 'CNY' },
      payer: { openid }
    };

    const body = JSON.stringify(payData);
    const url = '/v3/pay/transactions/jsapi';
    const auth = wxAuthHeader('POST', url, body);

    const { data } = await axios.post(`https://api.mch.weixin.qq.com${url}`, payData, {
      headers: { 'Content-Type': 'application/json', 'Authorization': auth }
    });

    await db.query(
      'INSERT INTO orders (order_id, openid, amount, status, prepay_id) VALUES (?,?,?,?,?)',
      [orderId, openid, amount, 'pending', data.prepay_id]
    );

    // 生成小程序支付参数
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const pkg = `prepay_id=${data.prepay_id}`;
    const signStr = `${process.env.WX_APPID}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
    const paySign = crypto.createSign('RSA-SHA256').update(signStr).sign(process.env.WX_PRIVATE_KEY.replace(/\\n/g, '\n'), 'base64');

    res.json({
      code: 0,
      data: {
        orderId,
        timeStamp,
        nonceStr,
        package: pkg,
        signType: 'RSA',
        paySign
      }
    });
  } catch (e) {
    res.json({ code: 500, msg: e.response?.data?.message || e.message });
  }
});

// 支付回调（微信服务器调用）
router.post('/notify', async (req, res) => {
  try {
    const { out_trade_no, trade_state, openid } = req.body.resource?.ciphertext || {};

    await db.query(
      'INSERT INTO pay_notify (out_trade_no, trade_state, openid, notify_data) VALUES (?,?,?,?)',
      [out_trade_no, trade_state, openid, JSON.stringify(req.body)]
    );

    if (trade_state === 'SUCCESS') {
      await db.query('UPDATE orders SET status=?, paid_at=NOW() WHERE order_id=?', ['paid', out_trade_no]);
      await db.query(
        'INSERT INTO unlock_records (openid, order_id) VALUES (?,?) ON DUPLICATE KEY UPDATE order_id=?, unlock_time=NOW()',
        [openid, out_trade_no, out_trade_no]
      );
    }

    res.json({ code: 'SUCCESS', message: '成功' });
  } catch (e) {
    res.status(500).json({ code: 'FAIL', message: e.message });
  }
});

// 验证支付结果
router.post('/verify', async (req, res) => {
  const { orderId, openid } = req.body;
  try {
    const [orders] = await db.query('SELECT status FROM orders WHERE order_id=? AND openid=?', [orderId, openid]);
    if (!orders.length) return res.json({ code: 404, msg: '订单不存在' });

    const isPaid = orders[0].status === 'paid';
    if (isPaid) {
      await db.query(
        'INSERT INTO unlock_records (openid, order_id) VALUES (?,?) ON DUPLICATE KEY UPDATE order_id=?',
        [openid, orderId, orderId]
      );
    }

    res.json({ code: 0, data: { isPaid } });
  } catch (e) {
    res.json({ code: 500, msg: e.message });
  }
});

// 检查解锁状态
router.get('/unlock/:openid', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM unlock_records WHERE openid=?', [req.params.openid]);
    res.json({ code: 0, data: { isUnlocked: rows.length > 0 } });
  } catch (e) {
    res.json({ code: 500, msg: e.message });
  }
});

module.exports = router;
