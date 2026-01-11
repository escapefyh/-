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
    // 评论用户ID
    user_id: {
        type: String,
        required: true
    },
    // 评论内容
    content: {
        type: String,
        required: true
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
    }
});

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

module.exports = {
    User,
    Goods,
    GroupBuyOrder,
    GroupBuyParticipant,
    Comment,
    Favorite,
    Chat,
    ChatMessage
};