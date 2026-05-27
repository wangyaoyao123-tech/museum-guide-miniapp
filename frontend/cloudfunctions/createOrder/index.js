// cloudfunctions/createOrder/index.js - 创建微信支付订单云函数
const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { openid, amount, description } = event;
  const wxContext = cloud.getWXContext();
  const realOpenid = wxContext.OPENID;

  // 配置项（替换为真实商户信息）
  const CONFIG = {
    appid: 'your_appid',           // 小程序 AppID
    mchid: 'your_mchid',           // 商户号
    apiV3Key: 'your_api_v3_key',   // APIv3 密钥
    serialNo: 'your_serial_no',    // 证书序列号
    privateKey: `-----BEGIN PRIVATE KEY-----
your_private_key_here
-----END PRIVATE KEY-----`,        // 商户私钥
    notifyUrl: 'https://cloud1-5g8ndtx54207f69e-1415293110.ap-shanghai.app.tcloudbase.com/verifyPayment', // 支付回调地址
  };

  try {
    // 生成订单号
    const orderId = `MUS${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // 构造微信支付 v3 下单请求体
    const body = {
      appid: CONFIG.appid,
      mchid: CONFIG.mchid,
      description: description || '博物馆语音导游-永久解锁',
      out_trade_no: orderId,
      notify_url: CONFIG.notifyUrl,
      amount: { total: amount || 2990, currency: 'CNY' },
      payer: { openid: realOpenid },
    };

    // 生成签名
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const url = '/v3/pay/transactions/jsapi';
    const method = 'POST';
    const bodyStr = JSON.stringify(body);

    const signStr = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;
    const sign = crypto.createSign('RSA-SHA256')
      .update(signStr)
      .sign(CONFIG.privateKey, 'base64');

    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${CONFIG.mchid}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${CONFIG.serialNo}",signature="${sign}"`;

    // 调用微信支付下单接口
    const result = await new Promise((resolve, reject) => {
      const https = require('https');
      const options = {
        hostname: 'api.mch.weixin.qq.com',
        path: url,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authorization,
          'Accept': 'application/json',
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    });

    if (!result.prepay_id) {
      throw new Error(result.message || '下单失败');
    }

    // 构造前端支付参数并签名
    const payTimestamp = Math.floor(Date.now() / 1000).toString();
    const payNonceStr = crypto.randomBytes(16).toString('hex');
    const packageStr = `prepay_id=${result.prepay_id}`;
    const paySignStr = `${CONFIG.appid}\n${payTimestamp}\n${payNonceStr}\n${packageStr}\n`;
    const paySign = crypto.createSign('RSA-SHA256')
      .update(paySignStr)
      .sign(CONFIG.privateKey, 'base64');

    // 保存订单到云数据库
    const db = cloud.database();
    await db.collection('orders').add({
      data: {
        orderId,
        openid: realOpenid,
        amount,
        description,
        status: 'pending',
        prepayId: result.prepay_id,
        createdAt: db.serverDate(),
      },
    });

    return {
      success: true,
      orderId,
      payParams: {
        timeStamp: payTimestamp,
        nonceStr: payNonceStr,
        package: packageStr,
        signType: 'RSA',
        paySign,
      },
    };
  } catch (err) {
    console.error('创建订单失败:', err);
    return { success: false, message: err.message || '创建订单失败' };
  }
};
