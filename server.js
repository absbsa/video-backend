const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// 允许跨域
app.use(cors());
app.use(express.json());

// 替换为实际的完整连接字符串（从 Atlas 控制台复制）
const mongoUri = 'mongodb+srv://partheniaparslowppa24:rPXTXVWdds4WXMwm@cluster0.i5yruwe.mongodb.net/videoTaskDB?retryWrites=true&w=majority&appName=Cluster0';

// 连接 MongoDB（指定数据库名 + 优化配置）
mongoose.connect(mongoUri, { 
  dbName: 'videoTaskDB', 
  connectTimeoutMS: 5000, 
  retryWrites: true 
})
  .then(() => console.log('✅ MongoDB 连接成功'))
  .catch(err => console.error('❌ MongoDB 连接失败:', err));

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

// 数据上报接口
app.post('/api/report', async (req, res) => {
  try {
    const { username, ip, videoUrl, watchSeconds } = req.body;
    const newRecord = new WatchRecord({
      username,
      ip,
      videoUrl,
      watchSeconds,
      isQualified: watchSeconds >= 120
    });
    await newRecord.save();
    res.status(200).json({ success: true, message: '数据已保存' });
  } catch (error) {
    res.status(500).json({ success: false, message: '保存失败', error: error.message });
  }
});

// 健康检查接口（可选，方便测试）
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    mongoConnected: mongoose.connection.readyState === 1 
  });
});

// 启动服务
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 后端服务启动：http://localhost:${PORT}`);
});