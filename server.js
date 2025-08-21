const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// 允许跨域
app.use(cors());
app.use(express.json());

// 从环境变量获取MongoDB连接字符串（线上部署更安全）
// 本地开发时可在根目录创建.env文件存储该变量
const mongoUri = process.env.MONGO_URI || 'mongodb+srv://partheniaparslowppa24:rPXTXVWdds4WXMwm@cluster0.i5yruwe.mongodb.net/videoTaskDB?retryWrites=true&w=majority&appName=Cluster0';

// 连接 MongoDB
mongoose.connect(mongoUri, { 
  dbName: 'videoTaskDB', 
  connectTimeoutMS: 10000,  // 延长超时时间，适应线上环境
  retryWrites: true 
})
  .then(() => console.log('✅ MongoDB 连接成功'))
  .catch(err => {
    console.error('❌ MongoDB 连接失败:', err);
    // 数据库连接失败时退出服务
    process.exit(1);
  });

// 定义数据模型
const watchRecordSchema = new mongoose.Schema({
  username: { type: String, required: true },
  ip: { type: String, required: true },
  videoUrl: { type: String, required: true },
  watchSeconds: { type: Number, required: true },
  isQualified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const WatchRecord = mongoose.model('WatchRecord', watchRecordSchema);

// 数据上报接口 - 增加输入验证
app.post('/api/report', async (req, res) => {
  try {
    const { username, ip, videoUrl, watchSeconds } = req.body;
    
    // 基础验证
    if (!username || !ip || !videoUrl || watchSeconds === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必要参数（username, ip, videoUrl, watchSeconds 为必填项）' 
      });
    }

    const newRecord = new WatchRecord({
      username,
      ip,
      videoUrl,
      watchSeconds: Number(watchSeconds),  // 确保是数字类型
      isQualified: Number(watchSeconds) >= 120
    });
    
    await newRecord.save();
    res.status(200).json({ success: true, message: '数据已保存' });
  } catch (error) {
    console.error('数据保存失败:', error);  // 记录详细错误日志
    res.status(500).json({ 
      success: false, 
      message: '服务器错误，数据保存失败',
      // 线上环境可以去掉具体错误信息，避免泄露敏感内容
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    mongoConnected: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// 启动服务 - 使用环境变量提供的端口（Render等平台会自动设置）
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 后端服务启动：http://localhost:${PORT}`);
  console.log(`📦 环境：${process.env.NODE_ENV || 'development'}`);
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  // 优雅关闭服务
  mongoose.connection.close().then(() => {
    process.exit(1);
  });
});
