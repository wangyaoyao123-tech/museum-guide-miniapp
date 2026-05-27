// cloudfunctions/verifyPayment/index.js - 验证支付结果云函数
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { orderId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const db = cloud.database();

  try {
    // 查询订单
    const orderRes = await db.collection('orders')
      .where({ orderId, openid })
      .get();

    if (orderRes.data.length === 0) {
      return { success: false, message: '订单不存在' };
    }

    const order = orderRes.data[0];

    // 如果订单已标记支付成功
    if (order.status === 'paid') {
      // 确保解锁记录存在
      await _ensureUnlockRecord(db, openid, orderId);
      return { success: true, isPaid: true };
    }

    // 向微信支付查询订单状态（实际项目需要商户号等配置）
    // 此处简化：通过云数据库中的回调记录判断
    const notifyRes = await db.collection('pay_notify')
      .where({ out_trade_no: orderId, trade_state: 'SUCCESS' })
      .get();

    if (notifyRes.data.length > 0) {
      // 更新订单状态
      await db.collection('orders').doc(order._id).update({
        data: { status: 'paid', paidAt: db.serverDate() },
      });
      await _ensureUnlockRecord(db, openid, orderId);
      return { success: true, isPaid: true };
    }

    return { success: true, isPaid: false };
  } catch (err) {
    console.error('验证支付失败:', err);
    return { success: false, message: err.message };
  }
};

async function _ensureUnlockRecord(db, openid, orderId) {
  const existing = await db.collection('unlock_records')
    .where({ openid })
    .get();
  if (existing.data.length === 0) {
    await db.collection('unlock_records').add({
      data: {
        openid,
        isUnlocked: true,
        orderId,
        unlockTime: db.serverDate(),
        createdAt: db.serverDate(),
      },
    });
  } else {
    await db.collection('unlock_records').doc(existing.data[0]._id).update({
      data: { isUnlocked: true, orderId, updatedAt: db.serverDate() },
    });
  }
}
