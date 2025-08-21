const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// 允许跨域
app.use(cors());
app.use(express.json());

// 从环境变量获取MongoDB连接字符串
const mongoUri = process.env.MONGO_URI || 'mongodb+srv://partheniaparslowppa24:rPXTXVWdds4WXMwm@cluster0.i5yruwe.mongodb.net/videoTaskDB?retryWrites=true&w=majority&appName=Cluster0';

// 连接 MongoDB
mongoose.connect(mongoUri, { 
  dbName: 'videoTaskDB', 
  connectTimeoutMS: 10000,
  retryWrites: true 
})
  .then(() => console.log('✅ MongoDB 连接成功'))
  .catch(err => {
    console.error('❌ MongoDB 连接失败:', err);
    process.exit(1);
  });

// 定义数据模型（移除 actualWatchSeconds 字段）
const watchRecordSchema = new mongoose.Schema({
  username: { type: String, required: true },
  ip: { type: String, required: true },
  videoUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false }); // 移除 __v 字段

const WatchRecord = mongoose.model('WatchRecord', watchRecordSchema);

// 数据上报接口（移除 actualWatchSeconds 相关逻辑）
app.post('/api/report', async (req, res) => {
  try {
    const { username, ip, videoUrl } = req.body;
    
    // 基础参数校验
    if (!username || !ip || !videoUrl) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必要参数（username, ip, videoUrl 为必填项）' 
      });
    }

    // 构造新记录（不含 actualWatchSeconds）
    const newRecord = new WatchRecord({
      username,
      ip,
      videoUrl
    });
    
    await newRecord.save();
    res.status(200).json({ 
      success: true, 
      message: '数据已保存',
      data: { username, ip, videoUrl } // 返回已保存的核心字段
    });
  } catch (error) {
    console.error('数据保存失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误，数据保存失败',
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
    version: '1.0.2' // 版本更新，标识移除实际时长存储
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// 启动服务
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 后端服务启动：http://localhost:${PORT}`);
  console.log(`📦 环境：${process.env.NODE_ENV || 'development'}`);
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  mongoose.connection.close().then(() => {
    process.exit(1);
  });
});
