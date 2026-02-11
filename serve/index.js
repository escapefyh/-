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
const registerRoutes = require('./routes/register');
const loginRoutes = require('./routes/login');
const changePasswordRoutes = require('./routes/changePassword');
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
const recognizeRoutes = require('./routes/recognize');
const appRoutes = require('./routes/app');
const walletRoutes = require('./routes/wallet');
const followRoutes = require('./routes/follow');
const browseRoutes = require('./routes/browse');
const commentRoutes = require('./routes/comment');
const adminAuthRoutes = require('./routes/admin/auth');
const adminUserRoutes = require('./routes/admin/user');
const adminImageProxyRoutes = require('./routes/admin/imageProxy');
const adminGoodsRoutes = require('./routes/admin/goods');
const adminAnnouncementRoutes = require('./routes/admin/announcement');
const adminSensitiveWordRoutes = require('./routes/admin/sensitiveWord');
const adminFeedbackRoutes = require('./routes/admin/feedback');
const analyticsTrafficRoutes = require('./routes/analytics/traffic');
const analyticsTransactionRoutes = require('./routes/analytics/transaction');
const announcementRoutes = require('./routes/announcement');
const feedbackRoutes = require('./routes/feedback');

// 注册路由
app.use('/', registerRoutes);         // /register
app.use('/', loginRoutes);            // /login
app.use('/', changePasswordRoutes);   // /changePassword
app.use('/oss', ossRoutes);            // /oss/getUploadToken, /oss/upload
app.use('/goods', goodsRoutes);        // /goods/detail, /goods/list, /goods/myGoods, /goods/getCommentCount, /goods/getFavoriteCount
app.use('/goods', goodsPublishRoutes); // /goods/publish
app.use('/goods', goodsSearchRoutes);  // /goods/search
app.use('/goods', goodsUpdateRoutes);  // /goods/update
app.use('/goods', goodsDeleteRoutes);  // /goods/delete
app.use('/user', userRoutes);          // /user/updateNickname, /user/updateAvatar, /user/info
app.use('/order', orderRoutes);        // /order/create
app.use('/groupBuy', groupBuyRoutes);  // /groupBuy/getCurrentCount, /groupBuy/create
app.use('/favorite', favoriteRoutes);  // /favorite/toggle
app.use('/chat', chatRoutes);          // /chat/create
app.use('/address', addressRoutes);   // /address/list, /address/detail, /address/add, /address/update, /address/delete, /address/setDefault
app.use('/', recognizeRoutes);        // /recognize
app.use('/app', appRoutes);           // /app/about, /app/privacy
app.use('/wallet', walletRoutes);     // /wallet/balance, /wallet/recharge
app.use('/follow', followRoutes);     // /follow/count
app.use('/browse', browseRoutes);     // /browse/count
app.use('/comment', commentRoutes);   // /comment/list, /comment/create
app.use('/admin', adminAuthRoutes);   // /admin/login, /admin/register
app.use('/admin/user', adminUserRoutes); // /admin/user/list, /admin/user/blacklist, /admin/user/detail/:user_id, /admin/user/orders/:user_id
app.use('/admin/image', adminImageProxyRoutes); // /admin/image/proxy?url=图片URL
app.use('/admin/goods', adminGoodsRoutes); // /admin/goods/list, /admin/goods/detail, /admin/goods/setHeatBonus
app.use('/admin/announcement', adminAnnouncementRoutes); // /admin/announcement/create, /admin/announcement/list, /admin/announcement/detail, /admin/announcement/delete
app.use('/admin/sensitive-word', adminSensitiveWordRoutes); // /admin/sensitive-word/create, /admin/sensitive-word/list, /admin/sensitive-word/delete
app.use('/admin/feedback', adminFeedbackRoutes); // /admin/feedback/list, /admin/feedback/detail, /admin/feedback/reply
app.use('/analytics/traffic', analyticsTrafficRoutes); // /analytics/traffic/hot-keywords, /analytics/traffic/visit-trend, /analytics/traffic/active-hours
app.use('/analytics/transaction', analyticsTransactionRoutes); // /analytics/transaction/trend, /analytics/transaction/category-share
app.use('/announcement', announcementRoutes); // /announcement/list, /announcement/detail
app.use('/feedback', feedbackRoutes); // /feedback/create

// 启动定时任务：处理过期的拼团组（每分钟执行一次）
const processExpiredGroupBuys = require('./cron/groupBuyExpire');
setInterval(() => {
    processExpiredGroupBuys();
}, 60 * 1000); // 60秒 = 1分钟

// 启动服务
app.listen(3000,() => {
    console.log('后端项目跑起来了，在端口号3000');
    console.log('定时任务已启动：拼团过期检查（每分钟执行一次）');
});
