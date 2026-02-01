const express = require('express');
const router = express.Router();
const { User, Follow, Goods } = require('../db');

// 检查关注状态接口
// GET /follow/check
router.get('/check', async (req, res) => {
    try {
        const { user_id, followed_id } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
            });
        }

        if (!followed_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
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

        // 3. 检查是否已关注（follower_id 是关注者，following_id 是被关注者）
        const followRecord = await Follow.findOne({
            follower_id: user_id,
            following_id: followed_id
        }).lean();

        const isFollowed = !!followRecord;

        // 4. 返回成功响应
        res.json({
            msg: "success",
            data: {
                is_followed: isFollowed
            }
        });
    } catch (error) {
        console.log('检查关注状态失败:', error);
        res.status(200).json({
            msg: "error",
            error: "检查失败"
        });
    }
});

// 关注/取消关注接口
// POST /follow/toggle
router.post('/toggle', async (req, res) => {
    try {
        const { user_id, followed_id } = req.body;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
            });
        }

        if (!followed_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 2. 不能关注自己
        if (user_id === followed_id) {
            return res.status(200).json({
                msg: "error",
                error: "不能关注自己"
            });
        }

        // 3. 验证用户是否存在
        const user = await User.findOne({ user_id: user_id }).lean();
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户不存在"
            });
        }

        // 4. 验证被关注用户是否存在
        const followedUser = await User.findOne({ user_id: followed_id }).lean();
        if (!followedUser) {
            return res.status(200).json({
                msg: "error",
                error: "被关注用户不存在"
            });
        }

        // 5. 检查是否已关注
        const existingFollow = await Follow.findOne({
            follower_id: user_id,
            following_id: followed_id
        }).lean();

        let isFollowed;

        if (existingFollow) {
            // 已关注，取消关注
            await Follow.deleteOne({
                follower_id: user_id,
                following_id: followed_id
            });
            isFollowed = false;
        } else {
            // 未关注，添加关注
            const { v4: uuidv4 } = await import('uuid');
            const followId = uuidv4();
            const currentTime = new Date().getTime();

            try {
                await Follow.create({
                    follow_id: followId,
                    follower_id: user_id,
                    following_id: followed_id,
                    create_time: currentTime
                });
                isFollowed = true;
            } catch (error) {
                // 处理唯一索引冲突（重复关注）
                if (error.code === 11000 || (error.message && error.message.includes('duplicate key'))) {
                    // 如果已存在，查询状态
                    const checkFollow = await Follow.findOne({
                        follower_id: user_id,
                        following_id: followed_id
                    }).lean();
                    isFollowed = !!checkFollow;
                } else {
                    throw error;
                }
            }
        }

        // 6. 返回成功响应
        res.json({
            msg: "success",
            data: {
                is_followed: isFollowed
            }
        });
    } catch (error) {
        console.log('关注/取消关注失败:', error);
        res.status(200).json({
            msg: "error",
            error: "操作失败"
        });
    }
});

// 获取关注列表接口
// GET /follow/list
router.get('/list', async (req, res) => {
    try {
        const { user_id, page = 1, pageSize = 10 } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
            });
        }

        // 分页参数验证
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 10;

        if (pageNum < 1) {
            return res.status(200).json({
                msg: "error",
                error: "页码必须大于0"
            });
        }

        if (pageSizeNum < 1 || pageSizeNum > 100) {
            return res.status(200).json({
                msg: "error",
                error: "每页数量必须在1-100之间"
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

        const skip = (pageNum - 1) * pageSizeNum;
        const limit = pageSizeNum;

        // 3. 查询关注列表（按关注时间倒序）
        const followList = await Follow.find({ follower_id: user_id })
            .sort({ create_time: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 4. 获取所有被关注用户ID
        const followedIds = followList.map(f => f.following_id);

        if (followedIds.length === 0) {
            // 没有关注任何人，返回空列表
            return res.json({
                msg: "success",
                data: {
                    list: [],
                    total: 0
                }
            });
        }

        // 5. 批量查询被关注用户信息
        const followedUsers = await User.find({ user_id: { $in: followedIds } }).lean();
        const userMap = {};
        followedUsers.forEach(u => {
            userMap[u.user_id] = u;
        });

        // 6. 批量查询每个用户发布的商品数量
        const goodsCounts = await Goods.aggregate([
            { $match: { user_id: { $in: followedIds } } },
            { $group: { _id: '$user_id', count: { $sum: 1 } } }
        ]);

        const goodsCountMap = {};
        goodsCounts.forEach(item => {
            goodsCountMap[item._id] = item.count;
        });

        // 7. 组装返回数据
        const result = followedIds.map(followedId => {
            const user = userMap[followedId];
            if (!user) {
                return null; // 用户不存在，跳过
            }

            return {
                user_id: user.user_id,
                nickname: user.nickname || '',
                name: user.name || '',
                avatar: user.avatar || '',
                goods_count: goodsCountMap[followedId] || 0
            };
        }).filter(item => item !== null); // 过滤掉不存在的用户

        // 8. 获取关注总数
        const total = await Follow.countDocuments({ follower_id: user_id });

        // 9. 返回成功响应
        res.json({
            msg: "success",
            data: {
                list: result,
                total: total
            }
        });
    } catch (error) {
        console.log('获取关注列表失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

// 获取关注数量接口
// GET /follow/count
router.get('/count', async (req, res) => {
    try {
        const { user_id } = req.query;

        // 1. 参数验证
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
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

        // 3. 统计关注数量（follower_id 是关注者ID）
        const count = await Follow.countDocuments({
            follower_id: user_id
        });

        // 4. 返回成功响应
        res.json({
            msg: "success",
            data: {
                count: count
            }
        });
    } catch (error) {
        console.log('获取关注数量失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取失败"
        });
    }
});

module.exports = router;







