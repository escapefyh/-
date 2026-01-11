const express = require('express');
const router = express.Router();
const { User, Goods, Chat, ChatMessage } = require('../db');

// 将时间戳转换为 ISO 8601 格式
const formatISO8601 = (timestamp) => {
    if (!timestamp) return null;
    return new Date(timestamp).toISOString();
};

// 处理头像URL，确保返回完整的HTTP/HTTPS URL（用于聊天列表）
// 根据文档要求：必须是完整的HTTP/HTTPS URL，不能是相对路径或示例URL
const processAvatarUrlForList = (avatar) => {
    // 如果头像为空、null或空字符串，返回空字符串（前端会使用默认头像）
    if (!avatar || avatar.trim() === '') {
        return '';
    }
    
    const trimmed = avatar.trim();
    
    // 如果已经是完整URL，检查是否是示例URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        // 检查是否是示例URL，如果是则返回空字符串
        if (trimmed.includes('your-domain.com') || trimmed.includes('example.com') || trimmed.includes('localhost')) {
            return '';
        }
        return trimmed;
    }
    
    // 如果是相对路径或其他格式，返回空字符串（前端会使用默认头像）
    return '';
};

// 获取或创建聊天会话
const getOrCreateChat = async (user1_id, user2_id, goods_id = null) => {
    // 确保 user1_id < user2_id（用于统一查询）
    const [smallerId, largerId] = user1_id < user2_id ? [user1_id, user2_id] : [user2_id, user1_id];
    
    // 查找聊天会话（考虑两种可能的组合）
    let chat = await Chat.findOne({
        $or: [
            { user_id: user1_id, seller_id: user2_id, goods_id: goods_id || null },
            { user_id: user2_id, seller_id: user1_id, goods_id: goods_id || null }
        ]
    }).lean();

    const currentTime = new Date().getTime();

    if (!chat) {
        // 创建新会话
        const { v4: uuidv4 } = await import('uuid');
        const chatId = uuidv4();
        chat = await Chat.create({
            chat_id: chatId,
            user_id: user1_id,
            seller_id: user2_id,
            goods_id: goods_id || null,
            create_time: currentTime,
            update_time: currentTime
        });
        chat = chat.toObject();
    }

    return chat;
};

// 发送消息
router.post('/send', async (req, res) => {
    try {
        const { sender_id, receiver_id, content, goods_id } = req.body;

        // 1. 参数验证
        if (!sender_id || !receiver_id) {
            return res.status(200).json({
                msg: "error",
                error: "消息内容不能为空"
            });
        }

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "消息内容不能为空"
            });
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length < 1) {
            return res.status(200).json({
                msg: "error",
                error: "消息内容不能为空"
            });
        }

        if (trimmedContent.length > 500) {
            return res.status(200).json({
                msg: "error",
                error: "消息内容不能为空"
            });
        }

        // 2. 验证不能和自己聊天
        if (sender_id === receiver_id) {
            return res.status(200).json({
                msg: "error",
                error: "消息内容不能为空"
            });
        }

        // 3. 验证发送者是否存在
        const sender = await User.findOne({ user_id: sender_id }).lean();
        if (!sender) {
            return res.status(200).json({
                msg: "error",
                error: "消息内容不能为空"
            });
        }

        // 4. 验证接收者是否存在
        const receiver = await User.findOne({ user_id: receiver_id }).lean();
        if (!receiver) {
            return res.status(200).json({
                msg: "error",
                error: "消息内容不能为空"
            });
        }

        // 5. 如果提供了商品ID，验证商品是否存在
        if (goods_id) {
            const goods = await Goods.findOne({ goods_id: goods_id }).lean();
            if (!goods) {
                return res.status(200).json({
                    msg: "error",
                    error: "消息内容不能为空"
                });
            }
        }

        // 6. 获取或创建聊天会话
        const chat = await getOrCreateChat(sender_id, receiver_id, goods_id);

        // 7. 创建消息
        const { v4: uuidv4 } = await import('uuid');
        const messageId = uuidv4();
        const currentTime = new Date().getTime();

        await ChatMessage.create({
            message_id: messageId,
            chat_id: chat.chat_id,
            sender_id: sender_id,
            receiver_id: receiver_id,
            content: trimmedContent,
            is_read: false,
            create_time: currentTime
        });

        // 8. 更新聊天会话的更新时间
        await Chat.updateOne(
            { chat_id: chat.chat_id },
            { $set: { update_time: currentTime } }
        );

        // 9. 返回成功响应
        res.json({
            msg: "success",
            data: {
                message_id: messageId,
                create_time: formatISO8601(currentTime)
            }
        });
    } catch (error) {
        console.log('发送消息失败:', error);
        res.status(200).json({
            msg: "error",
            error: "消息内容不能为空"
        });
    }
});

// 获取聊天记录
router.get('/messages', async (req, res) => {
    try {
        const { user_id, target_user_id, page = 1, pageSize = 20 } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        if (!target_user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;

        if (pageNum < 1) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        if (pageSizeNum < 1 || pageSizeNum > 100) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 2. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        const targetUser = await User.findOne({ user_id: target_user_id }).lean();
        if (!targetUser) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 3. 查找聊天会话
        const chat = await Chat.findOne({
            $or: [
                { user_id: user_id, seller_id: target_user_id },
                { user_id: target_user_id, seller_id: user_id }
            ]
        }).lean();

        if (!chat) {
            // 如果没有聊天会话，返回空列表
            return res.json({
                msg: "success",
                data: {
                    list: [],
                    total: 0
                }
            });
        }

        // 4. 查询消息列表（按创建时间升序）
        const skip = (pageNum - 1) * pageSizeNum;
        const limit = pageSizeNum;

        const messages = await ChatMessage.find({
            chat_id: chat.chat_id,
            $or: [
                { sender_id: user_id, receiver_id: target_user_id },
                { sender_id: target_user_id, receiver_id: user_id }
            ]
        })
            .sort({ create_time: 1 }) // 升序排列（最早的在前）
            .skip(skip)
            .limit(limit)
            .lean();

        // 5. 格式化消息数据
        const messageList = messages.map(msg => ({
            message_id: msg.message_id,
            sender_id: msg.sender_id,
            receiver_id: msg.receiver_id,
            content: msg.content,
            create_time: formatISO8601(msg.create_time)
        }));

        // 6. 获取总数
        const total = await ChatMessage.countDocuments({
            chat_id: chat.chat_id,
            $or: [
                { sender_id: user_id, receiver_id: target_user_id },
                { sender_id: target_user_id, receiver_id: user_id }
            ]
        });

        // 7. 返回成功响应
        res.json({
            msg: "success",
            data: {
                list: messageList,
                total: total
            }
        });
    } catch (error) {
        console.log('获取聊天记录失败:', error);
        res.status(200).json({
            msg: "error",
            error: "用户不存在"
        });
    }
});

// 获取聊天列表
router.get('/list', async (req, res) => {
    try {
        const { user_id } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 2. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 3. 查询当前用户的所有聊天会话
        // 注意：这里先按 update_time 排序作为初步排序，后续会根据 last_message_time 重新排序
        const chats = await Chat.find({
            $or: [
                { user_id: user_id },
                { seller_id: user_id }
            ]
        })
            .sort({ update_time: -1 })
            .lean();

        // 4. 获取所有聊天对象的用户ID
        const targetUserIds = [...new Set(
            chats.map(chat => {
                if (chat.user_id === user_id) {
                    return chat.seller_id;
                } else {
                    return chat.user_id;
                }
            })
        )];

        // 5. 批量查询聊天对象信息
        const targetUsers = await User.find({ user_id: { $in: targetUserIds } }).lean();
        const userMap = {};
        targetUsers.forEach(u => {
            userMap[u.user_id] = {
                user_id: u.user_id,
                nickname: u.nickname || '',
                avatar: processAvatarUrlForList(u.avatar)
            };
        });

        // 6. 获取所有聊天会话ID
        const chatIds = chats.map(chat => chat.chat_id);

        // 7. 查询每个会话的最后一条消息
        const lastMessages = await ChatMessage.aggregate([
            { $match: { chat_id: { $in: chatIds } } },
            { $sort: { create_time: -1 } },
            {
                $group: {
                    _id: '$chat_id',
                    lastMessage: { $first: '$$ROOT' }
                }
            }
        ]);

        const lastMessageMap = {};
        lastMessages.forEach(item => {
            lastMessageMap[item._id] = item.lastMessage;
        });

        // 8. 统计未读消息数（当前用户作为接收者的未读消息）
        const unreadCounts = await ChatMessage.aggregate([
            {
                $match: {
                    chat_id: { $in: chatIds },
                    receiver_id: user_id,
                    is_read: false
                }
            },
            {
                $group: {
                    _id: '$chat_id',
                    count: { $sum: 1 }
                }
            }
        ]);

        const unreadCountMap = {};
        unreadCounts.forEach(item => {
            unreadCountMap[item._id] = item.count;
        });

        // 9. 组装返回数据
        const chatList = chats.map(chat => {
            const targetUserId = chat.user_id === user_id ? chat.seller_id : chat.user_id;
            const lastMessage = lastMessageMap[chat.chat_id];
            const unreadCount = unreadCountMap[chat.chat_id] || 0;
            
            // 计算最后消息时间（用于排序）
            const lastMessageTime = lastMessage ? lastMessage.create_time : chat.create_time;

            return {
                chat_id: chat.chat_id,
                target_user: userMap[targetUserId] || {
                    user_id: targetUserId,
                    nickname: '',
                    avatar: '' // 返回空字符串，前端会使用默认头像
                },
                last_message: lastMessage ? lastMessage.content : '',
                last_message_time: formatISO8601(lastMessageTime),
                unread_count: unreadCount,
                goods_id: chat.goods_id || null,
                _sortTime: lastMessageTime // 临时字段，用于排序
            };
        });

        // 10. 按 last_message_time 降序排序（最新的在前）
        chatList.sort((a, b) => b._sortTime - a._sortTime);
        
        // 11. 移除临时排序字段
        chatList.forEach(item => {
            delete item._sortTime;
        });

        // 12. 返回成功响应
        res.json({
            msg: "success",
            data: {
                list: chatList
            }
        });
    } catch (error) {
        console.log('获取聊天列表失败:', error);
        res.status(200).json({
            msg: "error",
            error: "用户不存在"
        });
    }
});

// 获取未读消息总数
router.get('/unreadCount', async (req, res) => {
    try {
        const { user_id } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 2. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 3. 统计当前用户作为接收者的所有未读消息总数（跨所有聊天会话）
        const unreadCount = await ChatMessage.countDocuments({
            receiver_id: user_id,
            is_read: false
        });

        // 4. 返回成功响应
        res.json({
            msg: "success",
            data: {
                unread_count: unreadCount
            }
        });
    } catch (error) {
        console.log('获取未读消息总数失败:', error);
        res.status(200).json({
            msg: "error",
            error: "用户不存在"
        });
    }
});

// 标记消息为已读
router.post('/markRead', async (req, res) => {
    try {
        const { user_id, target_user_id } = req.body;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        if (!target_user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 2. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        const targetUser = await User.findOne({ user_id: target_user_id }).lean();
        if (!targetUser) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 3. 查找聊天会话
        const chat = await Chat.findOne({
            $or: [
                { user_id: user_id, seller_id: target_user_id },
                { user_id: target_user_id, seller_id: user_id }
            ]
        }).lean();

        if (!chat) {
            // 如果没有聊天会话，直接返回成功（没有消息需要标记）
            return res.json({
                msg: "success",
                data: {}
            });
        }

        // 4. 标记该聊天会话中所有来自 target_user_id 且接收者为 user_id 的未读消息为已读
        await ChatMessage.updateMany(
            {
                chat_id: chat.chat_id,
                sender_id: target_user_id,
                receiver_id: user_id,
                is_read: false
            },
            {
                $set: { is_read: true }
            }
        );

        // 5. 返回成功响应
        res.json({
            msg: "success",
            data: {}
        });
    } catch (error) {
        console.log('标记消息为已读失败:', error);
        res.status(200).json({
            msg: "error",
            error: "用户不存在"
        });
    }
});

// 创建聊天会话
router.post('/create', async (req, res) => {
    try {
        const { user_id, seller_id, goods_id } = req.body;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

        if (!seller_id) {
            return res.status(200).json({
                msg: "error",
                error: "卖家ID不能为空"
            });
        }

        // 2. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

        // 3. 验证卖家是否存在
        const seller = await User.findOne({ user_id: seller_id }).lean();
        if (!seller) {
            return res.status(200).json({
                msg: "error",
                error: "卖家不存在"
            });
        }

        // 4. 验证不能和自己聊天
        if (user_id === seller_id) {
            return res.status(200).json({
                msg: "error",
                error: "不能和自己聊天"
            });
        }

        // 5. 如果提供了商品ID，验证商品是否存在
        if (goods_id) {
            const goods = await Goods.findOne({ goods_id: goods_id }).lean();
            if (!goods) {
                return res.status(200).json({
                    msg: "error",
                    error: "商品不存在"
                });
            }
            // 验证商品是否属于该卖家
            if (goods.user_id !== seller_id) {
                return res.status(200).json({
                    msg: "error",
                    error: "商品不属于该卖家"
                });
            }
        }

        // 6. 检查是否已存在聊天会话
        const existingChat = await Chat.findOne({
            user_id: user_id,
            seller_id: seller_id,
            goods_id: goods_id || null
        }).lean();

        let chatId;
        const currentTime = new Date().getTime();

        if (existingChat) {
            // 如果会话已存在，更新更新时间并返回现有会话ID
            chatId = existingChat.chat_id;
            await Chat.updateOne(
                { chat_id: chatId },
                { $set: { update_time: currentTime } }
            );
        } else {
            // 创建新会话
            // 动态导入 uuid
            const { v4: uuidv4 } = await import('uuid');
            chatId = uuidv4();
            await Chat.create({
                chat_id: chatId,
                user_id: user_id,
                seller_id: seller_id,
                goods_id: goods_id || null,
                create_time: currentTime,
                update_time: currentTime
            });
        }

        // 7. 返回成功响应
        res.json({
            msg: "success",
            data: {
                chat_id: chatId,
                message: "聊天会话创建成功"
            }
        });
    } catch (error) {
        console.log('创建聊天会话失败:', error);
        // 如果是唯一索引冲突（理论上不应该发生，因为我们已经检查过了）
        if (error.code === 11000) {
            // 如果是因为唯一索引冲突，尝试获取现有会话
            try {
                const { user_id, seller_id, goods_id } = req.body;
                const existingChat = await Chat.findOne({
                    user_id: user_id,
                    seller_id: seller_id,
                    goods_id: goods_id || null
                }).lean();
                if (existingChat) {
                    return res.json({
                        msg: "success",
                        data: {
                            chat_id: existingChat.chat_id,
                            message: "聊天会话创建成功"
                        }
                    });
                }
            } catch (retryError) {
                console.log('重试获取聊天会话失败:', retryError);
            }
        }
        res.status(200).json({
            msg: "error",
            error: "创建失败"
        });
    }
});

module.exports = router;

