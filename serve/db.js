const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/shop")
.then(() => {
    console.log("MongoDB数据库连接成功");
})
.catch((error) => {
    console.log("MongoDB数据库连接失败", error);
})

// 用户表
//UserSchema 只是一个变量
//在 JavaScript 中，const UserSchema = ... 只是定义了一个变量，用来存储一个 Mongoose Schema 对象。
//UserSchema只存在于代码运行时，并不会直接被保存到数据库里。
const UserSchema = new mongoose.Schema({
    // 用户唯一id
    user_id: {
        type: String
    },
    // 名字
    name: {
        type: String
    },
    // 昵称（微信授权中设置的那个）
    nickname: {
        type: String,
        default: ''
    },
    // 头像URL
    avatar: {
        type: String,
        default: ''
    },
    // 手机号
    phone: {
        type: String
    },
    // 账号
    account: {
        type: String
    },
    password:{
        type:String
    },
    create_time:{
        type:Number
    },
    // 是否被拉黑（0-否，1-是）
    is_blacklisted: {
        type: Number,
        default: 0
    }
})
//第一个User是在操作数据库时用的名称，第二个User就是我在数据库中创建的表的名字
//在代码中，第一个 User（变量名） 和 第二个 "User"（模型名） 可以取不同的名字，
// 但为了代码的可读性和维护性，通常会取相同的名字。
const User = mongoose.model("User", UserSchema);

// 商品表
const GoodsSchema = new mongoose.Schema({
    // 商品唯一id
    goods_id: {
        type: String,
        required: true
    },
    // 发布者用户ID
    user_id: {
        type: String,
        required: true
    },
    // 商品图片URL数组（JSON格式存储）
    images: {
        type: [String],
        required: true
    },
    // 商品描述
    description: {
        type: String,
        required: true
    },
    // 商品价格
    price: {
        type: Number,
        required: true
    },
    // 商品分类ID（1-13）
    category_id: {
        type: Number,
        required: true
    },
    // 商品销量（已售出数量）
    sales_count: {
        type: Number,
        default: 0
    },
    // 是否开启拼团
    group_buy_enabled: {
        type: Boolean,
        required: true,
        default: false
    },
    // 拼单人数（2-5人）
    group_buy_count: {
        type: Number,
        default: null
    },
    // 拼团折扣
    group_buy_discount: {
        type: Number,
        default: null
    },
    // 是否开启规格
    spec_enabled: {
        type: Boolean,
        required: true,
        default: false
    },
    // 创建时间
    create_time: {
        type: Number,
        required: true
    },
    // 更新时间
    update_time: {
        type: Number,
        default: null
    },
    // 管理员给的热度加分（默认0）
    admin_heat_bonus: {
        type: Number,
        default: 0
    }
});

const Goods = mongoose.model("Goods", GoodsSchema);

// 拼团订单表
const GroupBuyOrderSchema = new mongoose.Schema({
    // 拼团ID
    group_buy_id: {
        type: String,
        required: true
    },
    // 商品ID
    goods_id: {
        type: String,
        required: true
    },
    // 发起拼团的用户ID
    user_id: {
        type: String,
        required: true
    },
    // 目标拼团人数
    target_count: {
        type: Number,
        required: true
    },
    // 当前拼团人数
    current_count: {
        type: Number,
        default: 1
    },
    // 拼团状态：pending(拼团中), success(拼团成功), failed(拼团失败)
    status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    // 拼团过期时间（时间戳）
    expire_time: {
        type: Number,
        default: null
    },
    // 创建时间
    create_time: {
        type: Number,
        required: true
    },
    // 更新时间
    update_time: {
        type: Number,
        default: null
    }
});

const GroupBuyOrder = mongoose.model("GroupBuyOrder", GroupBuyOrderSchema);

// 拼团参与者表
const GroupBuyParticipantSchema = new mongoose.Schema({
    // 拼团ID
    group_buy_id: {
        type: String,
        required: true
    },
    // 参与用户ID
    user_id: {
        type: String,
        required: true
    },
    // 订单ID
    order_id: {
        type: String,
        required: true
    },
    // 加入时间
    join_time: {
        type: Number,
        required: true
    }
});

const GroupBuyParticipant = mongoose.model("GroupBuyParticipant", GroupBuyParticipantSchema);

// 评论表
const CommentSchema = new mongoose.Schema({
    // 评论ID
    comment_id: {
        type: String,
        required: true
    },
    // 商品ID
    goods_id: {
        type: String,
        required: true
    },
    // 订单ID（唯一，一个订单只能评价一次）
    order_id: {
        type: String,
        required: true,
        unique: true
    },
    // 评论用户ID
    user_id: {
        type: String,
        required: true
    },
    // 评价星级（1-5）
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    // 评论内容
    content: {
        type: String,
        required: true
    },
    // 评价图片（JSON数组，最多3张）
    images: {
        type: String,
        default: '[]'
    },
    // 是否自动好评
    is_auto: {
        type: Boolean,
        default: false
    },
    // 父评论ID（回复时使用）
    parent_id: {
        type: String,
        default: null
    },
    // 审核状态：pending(待审核), approved(已通过), rejected(已拒绝)
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    // 创建时间
    create_time: {
        type: Number,
        required: true
    },
    // 更新时间
    update_time: {
        type: Number,
        default: null
    }
});

// 添加索引
CommentSchema.index({ goods_id: 1 }); // 便于查询商品的评论
CommentSchema.index({ order_id: 1 }, { unique: true }); // 订单ID唯一索引，防止重复评价
CommentSchema.index({ user_id: 1 }); // 便于查询用户的评论
CommentSchema.index({ create_time: -1 }); // 便于按时间排序

const Comment = mongoose.model("Comment", CommentSchema);

// 收藏表
const FavoriteSchema = new mongoose.Schema({
    // 收藏ID
    favorite_id: {
        type: String,
        required: true
    },
    // 用户ID
    user_id: {
        type: String,
        required: true
    },
    // 商品ID
    goods_id: {
        type: String,
        required: true
    },
    // 创建时间
    create_time: {
        type: Number,
        required: true
    }
});

// 添加唯一索引，防止重复收藏
FavoriteSchema.index({ user_id: 1, goods_id: 1 }, { unique: true });

const Favorite = mongoose.model("Favorite", FavoriteSchema);

// 聊天表
const ChatSchema = new mongoose.Schema({
    // 聊天ID
    chat_id: {
        type: String,
        required: true
    },
    // 买家用户ID
    user_id: {
        type: String,
        required: true
    },
    // 卖家用户ID
    seller_id: {
        type: String,
        required: true
    },
    // 商品ID（可选，用于关联商品）
    goods_id: {
        type: String,
        default: null
    },
    // 创建时间
    create_time: {
        type: Number,
        required: true
    },
    // 更新时间
    update_time: {
        type: Number,
        default: null
    }
});

// 添加唯一索引，防止重复创建聊天会话
ChatSchema.index({ user_id: 1, seller_id: 1, goods_id: 1 }, { unique: true });

const Chat = mongoose.model("Chat", ChatSchema);

// 消息表
const ChatMessageSchema = new mongoose.Schema({
    // 消息ID
    message_id: {
        type: String,
        required: true
    },
    // 聊天会话ID
    chat_id: {
        type: String,
        required: true
    },
    // 发送者用户ID
    sender_id: {
        type: String,
        required: true
    },
    // 接收者用户ID
    receiver_id: {
        type: String,
        required: true
    },
    // 消息内容
    content: {
        type: String,
        required: true
    },
    // 是否已读（默认false）
    is_read: {
        type: Boolean,
        default: false
    },
    // 创建时间
    create_time: {
        type: Number,
        required: true
    }
});

// 添加索引
ChatMessageSchema.index({ chat_id: 1, create_time: 1 }); // 用于查询聊天记录
ChatMessageSchema.index({ sender_id: 1, receiver_id: 1 }); // 用于查询用户间的消息
ChatMessageSchema.index({ receiver_id: 1, is_read: 1 }); // 用于统计未读消息

const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);

// 规格选项表
const SpecOptionSchema = new mongoose.Schema({
    // 规格选项ID
    spec_option_id: {
        type: String,
        required: true
    },
    // 商品ID（外键）
    goods_id: {
        type: String,
        required: true
    },
    // 规格选项名称
    name: {
        type: String,
        required: true
    },
    // 价格
    price: {
        type: Number,
        required: true
    },
    // 库存
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    // 排序顺序
    sort_order: {
        type: Number,
        default: 0
    },
    // 创建时间
    created_at: {
        type: Number,
        default: () => new Date().getTime()
    },
    // 更新时间
    updated_at: {
        type: Number,
        default: null
    }
});

// 添加索引，便于查询某个商品的所有规格选项
SpecOptionSchema.index({ goods_id: 1 });

const SpecOption = mongoose.model("SpecOption", SpecOptionSchema);

// 收货地址表
const AddressSchema = new mongoose.Schema({
    // 地址ID
    address_id: {
        type: String,
        required: true
    },
    // 用户ID（外键）
    user_id: {
        type: String,
        required: true
    },
    // 联系人姓名
    contact_name: {
        type: String,
        required: true
    },
    // 手机号
    phone: {
        type: String,
        required: true
    },
    // 所在地区（省 市 区）
    region: {
        type: String,
        required: true
    },
    // 省份
    province: {
        type: String,
        required: true
    },
    // 城市
    city: {
        type: String,
        required: true
    },
    // 区/县
    district: {
        type: String,
        required: true
    },
    // 街道（可选）
    street: {
        type: String,
        default: ''
    },
    // 详细地址
    detail_address: {
        type: String,
        required: true
    },
    // 是否默认地址（0-否，1-是）
    is_default: {
        type: Number,
        default: 0
    },
    // 创建时间
    created_at: {
        type: Number,
        required: true
    },
    // 更新时间
    updated_at: {
        type: Number,
        default: null
    }
});

// 添加索引
AddressSchema.index({ user_id: 1 }); // 便于查询某个用户的所有地址
AddressSchema.index({ user_id: 1, is_default: 1 }); // 便于查询用户的默认地址

const Address = mongoose.model("Address", AddressSchema);

// 订单表
const OrderSchema = new mongoose.Schema({
    // 订单ID
    order_id: {
        type: String,
        required: true
    },
    // 订单编号（唯一标识）
    order_no: {
        type: String,
        required: true,
        unique: true
    },
    // 用户ID（购买者）
    user_id: {
        type: String,
        required: true
    },
    // 商品ID
    goods_id: {
        type: String,
        required: true
    },
    // 收货地址ID
    address_id: {
        type: String,
        required: true
    },
    // 购买数量
    quantity: {
        type: Number,
        required: true
    },
    // 规格ID（如果商品开启了规格）
    spec_id: {
        type: String,
        default: null
    },
    // 是否为拼团购买
    is_group_buy: {
        type: Boolean,
        default: false
    },
    // 拼团组ID（外键，关联 group_buy 表）
    group_id: {
        type: String,
        default: null
    },
    // 订单总价
    total_price: {
        type: Number,
        required: true
    },
    // 订单状态：pending(待支付), paid(已支付), shipped(已发货), review(待评价), completed(已完成), cancelled(已取消)
    status: {
        type: String,
        enum: ['pending', 'paid', 'shipped', 'review', 'completed', 'cancelled'],
        default: 'pending'
    },
    // 创建时间
    create_time: {
        type: Number,
        required: true
    },
    // 更新时间
    update_time: {
        type: Number,
        default: null
    },
    // 支付时间
    pay_time: {
        type: Number,
        default: null
    },
    // 发货时间
    ship_time: {
        type: Number,
        default: null
    },
    // 收货时间
    receive_time: {
        type: Number,
        default: null
    },
    // 完成时间
    complete_time: {
        type: Number,
        default: null
    }
});

// 添加索引
OrderSchema.index({ user_id: 1 }); // 便于查询用户的订单
OrderSchema.index({ goods_id: 1 }); // 便于查询商品的订单
OrderSchema.index({ order_no: 1 }); // 订单编号唯一索引
OrderSchema.index({ group_id: 1 }); // 便于查询拼团组的订单

const Order = mongoose.model("Order", OrderSchema);

// 钱包表
const WalletSchema = new mongoose.Schema({
    // 钱包ID
    wallet_id: {
        type: String,
        required: true
    },
    // 用户ID（外键，唯一）
    user_id: {
        type: String,
        required: true,
        unique: true
    },
    // 账户余额
    balance: {
        type: Number,
        required: true,
        default: 0.00
    },
    // 创建时间
    create_time: {
        type: Number,
        required: true
    },
    // 更新时间
    update_time: {
        type: Number,
        default: null
    }
});

// 添加索引
WalletSchema.index({ user_id: 1 }); // 便于查询用户的钱包

const Wallet = mongoose.model("Wallet", WalletSchema);

// 充值记录表
const RechargeRecordSchema = new mongoose.Schema({
    // 记录ID
    record_id: {
        type: String,
        required: true
    },
    // 充值订单ID（唯一标识）
    order_id: {
        type: String,
        required: true,
        unique: true
    },
    // 用户ID（外键）
    user_id: {
        type: String,
        required: true
    },
    // 充值金额
    amount: {
        type: Number,
        required: true
    },
    // 充值前余额
    balance_before: {
        type: Number,
        required: true
    },
    // 充值后余额
    balance_after: {
        type: Number,
        required: true
    },
    // 充值时间
    create_time: {
        type: Number,
        required: true
    },
    // 状态（success/failed）
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
    }
});

// 添加索引
RechargeRecordSchema.index({ user_id: 1 }); // 便于查询用户的充值记录
RechargeRecordSchema.index({ order_id: 1 }); // 订单ID唯一索引

const RechargeRecord = mongoose.model("RechargeRecord", RechargeRecordSchema);

// 支付记录表
const PaymentRecordSchema = new mongoose.Schema({
    // 记录ID
    record_id: {
        type: String,
        required: true
    },
    // 订单ID（外键）
    order_id: {
        type: String,
        required: true
    },
    // 用户ID（外键）
    user_id: {
        type: String,
        required: true
    },
    // 支付金额
    pay_amount: {
        type: Number,
        required: true
    },
    // 支付前余额
    balance_before: {
        type: Number,
        required: true
    },
    // 支付后余额
    balance_after: {
        type: Number,
        required: true
    },
    // 支付方式（wallet/wechat/alipay）
    pay_method: {
        type: String,
        default: 'wallet'
    },
    // 支付时间
    pay_time: {
        type: Number,
        required: true
    },
    // 状态（success/failed）
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
    }
});

// 添加索引
PaymentRecordSchema.index({ user_id: 1 }); // 便于查询用户的支付记录
PaymentRecordSchema.index({ order_id: 1 }); // 便于查询订单的支付记录

const PaymentRecord = mongoose.model("PaymentRecord", PaymentRecordSchema);

// 关注表
const FollowSchema = new mongoose.Schema({
    // 关注ID
    follow_id: {
        type: String,
        required: true
    },
    // 关注者ID（follower_id）
    follower_id: {
        type: String,
        required: true
    },
    // 被关注者ID（following_id）
    following_id: {
        type: String,
        required: true
    },
    // 创建时间
    create_time: {
        type: Number,
        required: true
    }
});

// 添加唯一索引，防止重复关注
FollowSchema.index({ follower_id: 1, following_id: 1 }, { unique: true });
// 添加索引，便于查询
FollowSchema.index({ follower_id: 1 }); // 便于查询某个用户关注的所有人
FollowSchema.index({ following_id: 1 }); // 便于查询某个用户的所有粉丝

const Follow = mongoose.model("Follow", FollowSchema);

// 浏览历史表
const BrowseHistorySchema = new mongoose.Schema({
    // 浏览记录ID
    browse_id: {
        type: String,
        required: true
    },
    // 用户ID
    user_id: {
        type: String,
        required: true
    },
    // 商品ID
    goods_id: {
        type: String,
        required: true
    },
    // 浏览时间
    create_time: {
        type: Number,
        required: true
    }
});

// 添加索引，便于查询
BrowseHistorySchema.index({ user_id: 1, create_time: -1 }); // 便于查询某个用户的浏览历史（按时间倒序）
BrowseHistorySchema.index({ user_id: 1, goods_id: 1 }); // 便于查询某个用户是否浏览过某个商品

const BrowseHistory = mongoose.model("BrowseHistory", BrowseHistorySchema);

// 搜索关键词记录表（用于热搜词云图）
const SearchKeywordSchema = new mongoose.Schema({
    // 搜索记录ID
    search_id: {
        type: String,
        required: true
    },
    // 用户ID（可选，匿名搜索可能为空）
    user_id: {
        type: String,
        default: null
    },
    // 搜索关键词
    keyword: {
        type: String,
        required: true
    },
    // 搜索时间
    create_time: {
        type: Number,
        required: true
    }
});

// 添加索引，便于统计和按时间查询
SearchKeywordSchema.index({ keyword: 1, create_time: -1 });
SearchKeywordSchema.index({ create_time: -1 });

const SearchKeyword = mongoose.model("SearchKeyword", SearchKeywordSchema);

// 拼团组表（group_buy）
const GroupBuySchema = new mongoose.Schema({
    // 拼团组ID（主键）
    group_id: {
        type: String,
        required: true,
        unique: true
    },
    // 商品ID
    goods_id: {
        type: String,
        required: true
    },
    // 拼团所需人数
    required_count: {
        type: Number,
        required: true
    },
    // 当前拼团人数
    current_count: {
        type: Number,
        default: 1
    },
    // 状态：pending(拼团中), success(成团成功), failed(拼团失败)
    status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    // 创建时间
    create_time: {
        type: Number,
        required: true
    },
    // 过期时间（创建时间 + 24小时）
    expire_time: {
        type: Number,
        required: true
    },
    // 成团成功时间（可选）
    success_time: {
        type: Number,
        default: null
    }
});

// 添加索引
GroupBuySchema.index({ goods_id: 1, status: 1 }); // 便于查询某个商品的拼团组
GroupBuySchema.index({ status: 1, expire_time: 1 }); // 便于查询过期的拼团组
GroupBuySchema.index({ group_id: 1 }); // 拼团组ID索引

const GroupBuy = mongoose.model("GroupBuy", GroupBuySchema);

// 管理员表（用于网页端后台管理系统）
const AdminUserSchema = new mongoose.Schema({
    // 管理员唯一id
    admin_id: {
        type: String,
        required: true
    },
    // 账号
    account: {
        type: String,
        required: true,
        unique: true
    },
    // 密码
    password: {
        type: String,
        required: true
    },
    // 姓名
    name: {
        type: String,
        required: true
    },
    // 手机号
    phone: {
        type: String,
        required: true
    },
    // 角色（admin-管理员, super_admin-超级管理员）
    role: {
        type: String,
        enum: ['admin', 'super_admin'],
        default: 'admin'
    },
    // 创建时间
    create_time: {
        type: Number,
        required: true
    },
    // 更新时间
    update_time: {
        type: Number,
        default: null
    }
});

// 添加索引
AdminUserSchema.index({ account: 1 }, { unique: true }); // 账号唯一索引
AdminUserSchema.index({ phone: 1 }); // 手机号索引

const AdminUser = mongoose.model("AdminUser", AdminUserSchema);

module.exports = {
    User,
    AdminUser,
    Goods,
    GroupBuyOrder,
    GroupBuyParticipant,
    Comment,
    Favorite,
    Chat,
    ChatMessage,
    SpecOption,
    Address,
    Order,
    Wallet,
    RechargeRecord,
    PaymentRecord,
    Follow,
    BrowseHistory,
    GroupBuy,
    SearchKeyword
};