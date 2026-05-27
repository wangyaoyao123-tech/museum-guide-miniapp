# 博物馆智能导游系统 - 部署文档

## 一、后端部署步骤

### 1. 环境准备
- Node.js 16+
- MySQL 5.7+
- 云服务器（需公网IP和域名）

### 2. 安装依赖
```bash
cd museum-backend
npm install
```

### 3. 配置环境变量
复制 `.env.example` 为 `.env`，填写真实配置：
```bash
cp .env.example .env
```

必填项：
- `DB_*`：MySQL数据库连接信息
- `WX_APPID`：小程序AppID
- `WX_APP_SECRET`：小程序密钥（微信公众平台获取）
- `WX_MCHID`：微信支付商户号
- `WX_API_V3_KEY`：微信支付APIv3密钥
- `WX_SERIAL_NO`：商户证书序列号
- `WX_PRIVATE_KEY`：商户私钥（apiclient_key.pem内容，换行符替换为\n）
- `WX_NOTIFY_URL`：支付回调地址（https://your-domain.com/api/payment/notify）

### 4. 初始化数据库
```bash
mysql -u root -p < sql/init.sql
mysql -u root -p museum_db < sql/data.sql
```

### 5. 启动服务
```bash
npm start
# 或开发模式
npm run dev
```

### 6. 配置Nginx反向代理（推荐）
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
    }
}
```

### 7. 使用PM2守护进程
```bash
npm install -g pm2
pm2 start src/app.js --name museum-backend
pm2 save
pm2 startup
```

---

## 二、小程序端配置

### 1. 修改后端地址
编辑 `utils/api.js`，将 `BASE_URL` 改为你的后端域名：
```javascript
const BASE_URL = 'https://your-domain.com/api';
```

### 2. 配置服务器域名白名单
微信公众平台 → 开发 → 开发管理 → 服务器域名，添加：
- request合法域名：`https://your-domain.com`
- uploadFile合法域名：（如需上传功能）
- downloadFile合法域名：（如需下载功能）

### 3. 删除云函数目录（可选）
```bash
rm -rf cloudfunctions
```

### 4. 上传代码
使用微信开发者工具上传小程序代码，提交审核。

---

## 三、数据管理

### 添加展品
直接在MySQL中插入数据：
```sql
INSERT INTO exhibits (name, category, hall, image, description, audio_url, audio_title, audio_duration, tags, sort_order)
VALUES ('展品名称', '分类', '展厅', '图片URL', '描述', '音频URL', '音频标题', 180, '["标签1","标签2"]', 10);
```

### 修改展品
```sql
UPDATE exhibits SET description='新描述' WHERE id=1;
```

### 查询订单
```sql
SELECT * FROM orders WHERE status='paid' ORDER BY created_at DESC LIMIT 10;
```

---

## 四、常见问题

### 1. 支付回调收不到
- 检查 `WX_NOTIFY_URL` 是否为公网可访问的HTTPS地址
- 查看 `pay_notify` 表是否有记录

### 2. 获取openid失败
- 确认 `WX_APP_SECRET` 配置正确
- 检查小程序是否已发布

### 3. 数据库连接失败
- 检查MySQL服务是否启动
- 确认 `.env` 中数据库配置正确

---

## 五、安全建议

1. 定期备份数据库
2. 使用HTTPS协议
3. 不要将 `.env` 文件提交到Git
4. 定期更新依赖包
5. 限制数据库访问IP
