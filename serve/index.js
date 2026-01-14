require('dotenv').config();
const express = require('express');
const app = express();

// 中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// 添加 CORS 支持（微信小程序需要）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 引入路由
const authRoutes = require('./routes/auth');
const ossRoutes = require('./routes/oss');
const goodsRoutes = require('./routes/goods');
const goodsPublishRoutes = require('./routes/goodsPublish');
const goodsSearchRoutes = require('./routes/goodsSearch');
const goodsUpdateRoutes = require('./routes/goodsUpdate');
const goodsDeleteRoutes = require('./routes/goodsDelete');
const userRoutes = require('./routes/user');
const orderRoutes = require('./routes/order');
const groupBuyRoutes = require('./routes/groupBuy');
const favoriteRoutes = require('./routes/favorite');
const chatRoutes = require('./routes/chat');
const addressRoutes = require('./routes/address');

// 注册路由
app.use('/', authRoutes);              // /register, /login
app.use('/oss', ossRoutes);            // /oss/getUploadToken, /oss/upload
app.use('/goods', goodsRoutes);        // /goods/detail, /goods/list, /goods/myGoods, /goods/getCommentCount, /goods/getFavoriteCount
app.use('/goods', goodsPublishRoutes); // /goods/publish
app.use('/goods', goodsSearchRoutes);  // /goods/search
app.use('/goods', goodsUpdateRoutes);  // /goods/update
app.use('/goods', goodsDeleteRoutes);  // /goods/delete
app.use('/user', userRoutes);          // /user/updateNickname
app.use('/order', orderRoutes);        // /order/create
app.use('/groupBuy', groupBuyRoutes);  // /groupBuy/getCurrentCount, /groupBuy/create
app.use('/favorite', favoriteRoutes);  // /favorite/toggle
app.use('/chat', chatRoutes);          // /chat/create
app.use('/address', addressRoutes);   // /address/list, /address/detail, /address/add, /address/update, /address/delete, /address/setDefault

// 启动服务
app.listen(3000,() => {
    console.log('后端项目跑起来了，在端口号3000');
});
