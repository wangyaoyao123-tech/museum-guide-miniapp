const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/exhibits', require('./routes/exhibits'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/ads', require('./routes/ads'));

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 全局错误兜底，保证任何未捕获异常都返回 JSON 而非 HTML
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ code: 500, msg: err.message || '服务器错误' });
});

const PORT = process.env.PORT || 3000;
// 监听 0.0.0.0，确保微信开发者工具通过 127.0.0.1 可访问
app.listen(PORT, '0.0.0.0', () => console.log(`后端服务运行在 http://localhost:${PORT}`));
