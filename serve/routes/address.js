const express = require('express');
const router = express.Router();
const { User, Address } = require('../db');

// 格式化时间戳为日期时间字符串
const formatDateTime = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 格式化地址对象为响应格式
const formatAddress = (address) => {
    return {
        address_id: address.address_id,
        user_id: address.user_id,
        contact_name: address.contact_name,
        phone: address.phone,
        region: address.region,
        province: address.province,
        city: address.city,
        district: address.district,
        street: address.street || '',
        detail_address: address.detail_address,
        is_default: address.is_default,
        created_at: formatDateTime(address.created_at),
        updated_at: formatDateTime(address.updated_at)
    };
};

// 验证手机号格式
const validatePhone = (phone) => {
    const phonePattern = /^1[3-9]\d{9}$/;
    return phonePattern.test(phone);
};

// 1. 获取地址列表
router.get('/list', async (req, res) => {
    try {
        const userId = req.query.user_id;

        // 验证用户ID
        if (!userId) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
            });
        }

        // 验证用户是否存在
        const user = await User.findOne({ user_id: userId });
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
            });
        }

        // 查询该用户的所有地址，默认地址排在第一位，其他按创建时间倒序
        const addresses = await Address.find({ user_id: userId })
            .sort({ is_default: -1, created_at: -1 });

        // 格式化地址列表
        const formattedList = addresses.map(formatAddress);

        res.json({
            msg: "success",
            data: {
                list: formattedList,
                total: formattedList.length
            }
        });
    } catch (error) {
        console.log('获取地址列表失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取地址列表失败"
        });
    }
});

// 2. 获取地址详情
router.get('/detail', async (req, res) => {
    try {
        const { address_id, user_id } = req.query;

        // 验证参数
        if (!address_id || !user_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 查询地址
        const address = await Address.findOne({ 
            address_id: address_id,
            user_id: user_id
        });

        if (!address) {
            return res.status(200).json({
                msg: "error",
                error: "地址不存在或无权访问"
            });
        }

        res.json({
            msg: "success",
            data: formatAddress(address)
        });
    } catch (error) {
        console.log('获取地址详情失败:', error);
        res.status(200).json({
            msg: "error",
            error: "获取地址详情失败"
        });
    }
});

// 3. 添加收货地址
router.post('/add', async (req, res) => {
    try {
        const { 
            user_id, 
            contact_name, 
            phone, 
            region, 
            province, 
            city, 
            district, 
            street, 
            detail_address, 
            is_default 
        } = req.body;

        // 验证用户ID
        if (!user_id) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
            });
        }

        // 验证用户是否存在
        const user = await User.findOne({ user_id: user_id });
        if (!user) {
            return res.status(200).json({
                msg: "error",
                error: "用户未登录"
            });
        }

        // 验证联系人姓名
        if (!contact_name || typeof contact_name !== 'string' || contact_name.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "联系人姓名不能为空"
            });
        }

        if (contact_name.trim().length > 20) {
            return res.status(200).json({
                msg: "error",
                error: "联系人姓名不能超过20个字符"
            });
        }

        // 验证手机号
        if (!phone || typeof phone !== 'string') {
            return res.status(200).json({
                msg: "error",
                error: "手机号不能为空"
            });
        }

        if (!validatePhone(phone)) {
            return res.status(200).json({
                msg: "error",
                error: "手机号格式不正确"
            });
        }

        // 验证所在地区
        if (!region || typeof region !== 'string' || region.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "所在地区不能为空"
            });
        }

        if (region.trim().length > 50) {
            return res.status(200).json({
                msg: "error",
                error: "所在地区不能超过50个字符"
            });
        }

        // 验证省份
        if (!province || typeof province !== 'string' || province.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "省份不能为空"
            });
        }

        // 验证城市
        if (!city || typeof city !== 'string' || city.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "城市不能为空"
            });
        }

        // 验证区/县
        if (!district || typeof district !== 'string' || district.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "区/县不能为空"
            });
        }

        // 验证详细地址
        if (!detail_address || typeof detail_address !== 'string' || detail_address.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "详细地址不能为空"
            });
        }

        if (detail_address.trim().length > 100) {
            return res.status(200).json({
                msg: "error",
                error: "详细地址不能超过100个字符"
            });
        }

        // 验证是否默认地址
        const isDefaultValue = (is_default === 1 || is_default === '1') ? 1 : 0;

        // 如果设置为默认地址，需要将该用户的其他地址的 is_default 设置为 0
        if (isDefaultValue === 1) {
            await Address.updateMany(
                { user_id: user_id },
                { $set: { is_default: 0 } }
            );
        }

        // 生成地址ID
        const { v4: uuidv4 } = await import('uuid');
        const addressId = uuidv4();
        const currentTime = new Date().getTime();

        // 创建地址记录
        await Address.create({
            address_id: addressId,
            user_id: user_id,
            contact_name: contact_name.trim(),
            phone: phone.trim(),
            region: region.trim(),
            province: province.trim(),
            city: city.trim(),
            district: district.trim(),
            street: street ? street.trim() : '',
            detail_address: detail_address.trim(),
            is_default: isDefaultValue,
            created_at: currentTime,
            updated_at: currentTime
        });

        res.json({
            msg: "success",
            data: {
                address_id: addressId,
                message: "地址添加成功"
            }
        });
    } catch (error) {
        console.log('添加地址失败:', error);
        res.status(200).json({
            msg: "error",
            error: "添加地址失败"
        });
    }
});

// 4. 更新收货地址
router.post('/update', async (req, res) => {
    try {
        const { 
            address_id,
            user_id, 
            contact_name, 
            phone, 
            region, 
            province, 
            city, 
            district, 
            street, 
            detail_address, 
            is_default 
        } = req.body;

        // 验证参数
        if (!address_id || !user_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 查询地址并验证归属
        const address = await Address.findOne({ 
            address_id: address_id,
            user_id: user_id
        });

        if (!address) {
            return res.status(200).json({
                msg: "error",
                error: "地址不存在或无权访问"
            });
        }

        // 验证联系人姓名
        if (!contact_name || typeof contact_name !== 'string' || contact_name.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "联系人姓名不能为空"
            });
        }

        if (contact_name.trim().length > 20) {
            return res.status(200).json({
                msg: "error",
                error: "联系人姓名不能超过20个字符"
            });
        }

        // 验证手机号
        if (!phone || typeof phone !== 'string') {
            return res.status(200).json({
                msg: "error",
                error: "手机号不能为空"
            });
        }

        if (!validatePhone(phone)) {
            return res.status(200).json({
                msg: "error",
                error: "手机号格式不正确"
            });
        }

        // 验证所在地区
        if (!region || typeof region !== 'string' || region.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "所在地区不能为空"
            });
        }

        if (region.trim().length > 50) {
            return res.status(200).json({
                msg: "error",
                error: "所在地区不能超过50个字符"
            });
        }

        // 验证省份
        if (!province || typeof province !== 'string' || province.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "省份不能为空"
            });
        }

        // 验证城市
        if (!city || typeof city !== 'string' || city.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "城市不能为空"
            });
        }

        // 验证区/县
        if (!district || typeof district !== 'string' || district.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "区/县不能为空"
            });
        }

        // 验证详细地址
        if (!detail_address || typeof detail_address !== 'string' || detail_address.trim().length === 0) {
            return res.status(200).json({
                msg: "error",
                error: "详细地址不能为空"
            });
        }

        if (detail_address.trim().length > 100) {
            return res.status(200).json({
                msg: "error",
                error: "详细地址不能超过100个字符"
            });
        }

        // 验证是否默认地址
        const isDefaultValue = (is_default === 1 || is_default === '1') ? 1 : 0;

        // 如果设置为默认地址，需要将该用户的其他地址的 is_default 设置为 0
        if (isDefaultValue === 1) {
            await Address.updateMany(
                { user_id: user_id, address_id: { $ne: address_id } },
                { $set: { is_default: 0 } }
            );
        }

        // 更新地址记录
        const currentTime = new Date().getTime();
        await Address.updateOne(
            { address_id: address_id },
            {
                $set: {
                    contact_name: contact_name.trim(),
                    phone: phone.trim(),
                    region: region.trim(),
                    province: province.trim(),
                    city: city.trim(),
                    district: district.trim(),
                    street: street ? street.trim() : '',
                    detail_address: detail_address.trim(),
                    is_default: isDefaultValue,
                    updated_at: currentTime
                }
            }
        );

        res.json({
            msg: "success",
            data: {
                message: "地址更新成功"
            }
        });
    } catch (error) {
        console.log('更新地址失败:', error);
        res.status(200).json({
            msg: "error",
            error: "更新地址失败"
        });
    }
});

// 5. 删除收货地址
router.post('/delete', async (req, res) => {
    try {
        const { address_id, user_id } = req.body;

        // 验证参数
        if (!address_id || !user_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 查询地址并验证归属
        const address = await Address.findOne({ 
            address_id: address_id,
            user_id: user_id
        });

        if (!address) {
            return res.status(200).json({
                msg: "error",
                error: "地址不存在或无权访问"
            });
        }

        // 检查是否为默认地址，不允许删除默认地址
        if (address.is_default === 1) {
            return res.status(200).json({
                msg: "error",
                error: "无法删除默认地址，请先设置其他地址为默认"
            });
        }

        // 删除地址
        await Address.deleteOne({ address_id: address_id });

        res.json({
            msg: "success",
            data: {
                message: "地址删除成功"
            }
        });
    } catch (error) {
        console.log('删除地址失败:', error);
        res.status(200).json({
            msg: "error",
            error: "删除地址失败"
        });
    }
});

// 6. 设置默认地址
router.post('/setDefault', async (req, res) => {
    try {
        const { address_id, user_id } = req.body;

        // 验证参数
        if (!address_id || !user_id) {
            return res.status(200).json({
                msg: "error",
                error: "参数错误"
            });
        }

        // 查询地址并验证归属
        const address = await Address.findOne({ 
            address_id: address_id,
            user_id: user_id
        });

        if (!address) {
            return res.status(200).json({
                msg: "error",
                error: "地址不存在或无权访问"
            });
        }

        // 将该用户的其他地址的 is_default 设置为 0
        await Address.updateMany(
            { user_id: user_id, address_id: { $ne: address_id } },
            { $set: { is_default: 0, updated_at: new Date().getTime() } }
        );

        // 设置当前地址为默认地址
        await Address.updateOne(
            { address_id: address_id },
            { 
                $set: { 
                    is_default: 1,
                    updated_at: new Date().getTime()
                } 
            }
        );

        res.json({
            msg: "success",
            data: {
                message: "默认地址设置成功"
            }
        });
    } catch (error) {
        console.log('设置默认地址失败:', error);
        res.status(200).json({
            msg: "error",
            error: "设置默认地址失败"
        });
    }
});

module.exports = router;


