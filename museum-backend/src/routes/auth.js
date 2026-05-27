const express = require('express');
const router = express.Router();
const axios = require('axios');

// 微信 code 换 openid
router.post('/login', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.json({ code: 400, msg: '缺少code' });

  try {
    const { data } = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: process.env.WX_APPID,
        secret: process.env.WX_APP_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });

    if (data.errcode) return res.json({ code: 400, msg: data.errmsg });
    res.json({ code: 0, data: { openid: data.openid } });
  } catch (e) {
    res.json({ code: 500, msg: e.message });
  }
});

module.exports = router;
