const express = require('express');
const router = express.Router();
const { User, Goods, SpecOption } = require('../db');

// 发布商品
router.post('/publish', async (req, res) => {
    try {
        const { images, description, price, category_id, groupBuyEnabled, groupBuyCount, groupBuyDiscount, specEnabled, specs } = req.body;

        // 1. 用户验证：从请求中获取 user_id（前端应在登录后保存 user_id，发布商品时传递）
        const userId = req.body.user_id;
        if (!userId) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

        // 验证用户是否存在
        const user = await User.findOne({ user_id: userId });
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "请先登录"
            });
        }

        // 2. 图片验证
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "请上传商品图片"
            });
        }
        if (images.length > 9) {
            return res.status(200).json({
                msg: "error",
                error: "图片数量不能超过9张"
            });
        }
        // 验证图片URL格式（简单验证）
        const urlPattern = /^https?:\/\/.+/;
        for (const imageUrl of images) {
            if (!urlPattern.test(imageUrl)) {
                return res.status(200).json({
                    msg: "error",
                    error: "图片URL无效"
                });
            }
        }

        // 3. 描述验证
        if (!description || description.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "请输入商品描述"
            });
        }
        if (description.length < 10) {
            return res.status(200).json({
                msg: "error",
                error: "商品描述至少需要10个字符"
            });
        }
        if (description.length > 500) {
            return res.status(200).json({
                msg: "error",
                error: "商品描述不能超过500个字符"
            });
        }

        // 4. 价格验证
        if (!price || price <= 0) {
            return res.status(200).json({
                msg: "error",
                error: "价格必须大于0"
            });
        }
        if (price > 999999.99) {
            return res.status(200).json({
                msg: "error",
                error: "价格不能超过999999.99"
            });
        }

        // 5. 分类ID验证
        if (category_id === undefined || category_id === null) {
            return res.status(200).json({
                msg: "error",
                error: "请选择商品分类"
            });
        }

        const categoryIdNum = Number(category_id);
        if (isNaN(categoryIdNum)) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        if (categoryIdNum < 1 || categoryIdNum > 13 || !Number.isInteger(categoryIdNum)) {
            return res.status(200).json({
                msg: "error",
                error: "请选择商品分类"
            });
        }

        // 6. 拼团验证
        if (groupBuyEnabled === true) {
            // 验证拼单人数
            if (groupBuyCount === undefined || groupBuyCount === null) {
                return res.status(200).json({
                    msg: "error",
                    error: "开启拼团时必须设置拼单人数和折扣"
                });
            }

            const groupBuyCountNum = Number(groupBuyCount);
            if (isNaN(groupBuyCountNum) || !Number.isInteger(groupBuyCountNum)) {
                return res.status(200).json({
                    msg: "error",
                    error: "拼单人数必须在2-5人之间"
                });
            }

            if (groupBuyCountNum < 2 || groupBuyCountNum > 5) {
                return res.status(200).json({
                    msg: "error",
                    error: "拼单人数必须在2-5人之间"
                });
            }

            // 验证拼团折扣
            if (groupBuyDiscount === undefined || groupBuyDiscount === null) {
                return res.status(200).json({
                    msg: "error",
                    error: "开启拼团时必须设置拼单人数和折扣"
                });
            }

            const discountNum = parseFloat(groupBuyDiscount);
            if (isNaN(discountNum)) {
                return res.status(200).json({
                    msg: "error",
                    error: "折扣必须在0-1之间（不能等于0或1）"
                });
            }

            if (discountNum <= 0 || discountNum >= 1) {
                return res.status(200).json({
                    msg: "error",
                    error: "折扣必须在0-1之间（不能等于0或1）"
                });
            }
        }

        // 7. 规格验证
        const specEnabledValue = specEnabled === true;
        
        if (specEnabledValue) {
            // 当开启规格时，specs 字段必填且不能为空数组
            if (!specs || !Array.isArray(specs) || specs.length === 0) {
                return res.status(200).json({
                    msg: "error",
                    error: "请至少添加一个规格选项"
                });
            }

            // 验证每个规格选项
            for (let i = 0; i < specs.length; i++) {
                const specOption = specs[i];
                
                // 验证规格选项结构
                if (!specOption || typeof specOption !== 'object') {
                    return res.status(200).json({
                        msg: "error",
                        error: "规格数据格式错误：specs 必须是数组类型"
                    });
                }

                // 验证规格选项名称
                if (!specOption.name || typeof specOption.name !== 'string' || specOption.name.trim().length === 0) {
                    return res.status(200).json({
                        msg: "error",
                        error: `第${i + 1}个规格选项的名称不能为空`
                    });
                }

                // 验证价格
                if (specOption.price === undefined || specOption.price === null) {
                    return res.status(200).json({
                        msg: "error",
                        error: `规格选项缺少必填字段：price`
                    });
                }

                const priceNum = parseFloat(specOption.price);
                if (isNaN(priceNum) || priceNum <= 0) {
                    return res.status(200).json({
                        msg: "error",
                        error: `第${i + 1}个规格选项"${specOption.name}"的价格必须大于0`
                    });
                }

                if (priceNum > 999999.99) {
                    return res.status(200).json({
                        msg: "error",
                        error: `第${i + 1}个规格选项"${specOption.name}"的价格不能超过999999.99`
                    });
                }

                // 验证库存
                if (specOption.stock === undefined || specOption.stock === null) {
                    return res.status(200).json({
                        msg: "error",
                        error: `规格选项缺少必填字段：stock`
                    });
                }

                const stockNum = Number(specOption.stock);
                if (isNaN(stockNum) || !Number.isInteger(stockNum) || stockNum < 0) {
                    return res.status(200).json({
                        msg: "error",
                        error: `第${i + 1}个规格选项"${specOption.name}"的库存必须大于等于0`
                    });
                }
            }
        } else {
            // 当不开启规格时，specs 应为 null 或不传
            if (specs !== null && specs !== undefined) {
                return res.status(200).json({
                    msg: "error",
                    error: "未开启规格时，specs 字段应为 null 或不传"
                });
            }
        }

        // 8. 生成商品ID
        const { v4: uuidv4 } = await import('uuid');
        const goodsId = uuidv4();

        // 9. 创建商品记录
        await Goods.create({
            goods_id: goodsId,
            user_id: userId,
            images: images,
            description: description.trim(),
            price: parseFloat(price.toFixed(2)),
            category_id: categoryIdNum,
            group_buy_enabled: groupBuyEnabled || false,
            group_buy_count: groupBuyEnabled ? Number(groupBuyCount) : null,
            group_buy_discount: groupBuyEnabled ? parseFloat(groupBuyDiscount.toFixed(2)) : null,
            spec_enabled: specEnabledValue,
            create_time: new Date().getTime()
        });

        // 10. 如果开启了规格，创建规格选项
        if (specEnabledValue && specs && specs.length > 0) {
            for (let i = 0; i < specs.length; i++) {
                const specOption = specs[i];
                const specOptionId = uuidv4();

                // 创建规格选项
                await SpecOption.create({
                    spec_option_id: specOptionId,
                    goods_id: goodsId,
                    name: specOption.name.trim(),
                    price: parseFloat(parseFloat(specOption.price).toFixed(2)),
                    stock: Number(specOption.stock),
                    sort_order: i,
                    created_at: new Date().getTime()
                });
            }
        }

        // 11. 返回成功响应
        res.json({
            msg: "success",
            data: {
                goods_id: goodsId,
                message: "商品发布成功"
            }
        });
    } catch (error) {
        console.log('商品发布失败:', error);
        res.status(200).json({
            msg: "error",
            error: "发布失败"
        });
    }
});

module.exports = router;


