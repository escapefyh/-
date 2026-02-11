const express = require('express');
const router = express.Router();
const { BrowseHistory, SearchKeyword, User } = require('../../db');

// 获取热搜词云图数据
// GET /analytics/traffic/hot-keywords
router.get('/hot-keywords', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const daysNum = parseInt(days);
        
        // 计算时间范围（最近N天）
        const now = Date.now();
        const startTime = now - (daysNum * 24 * 60 * 60 * 1000);
        
        // 查询指定时间范围内的搜索关键词
        const searchRecords = await SearchKeyword.find({
            create_time: { $gte: startTime }
        }).lean();
        
        // 统计关键词出现次数
        const keywordMap = {};
        searchRecords.forEach(record => {
            const keyword = record.keyword.trim();
            if (keyword) {
                keywordMap[keyword] = (keywordMap[keyword] || 0) + 1;
            }
        });
        
        // 转换为数组格式，按出现次数排序，取前50个
        const keywordList = Object.entries(keywordMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 50);
        
        res.status(200).json({
            msg: 'success',
            data: keywordList
        });
    } catch (error) {
        console.log('获取热搜关键词失败:', error);
        res.status(200).json({
            msg: 'error',
            error: '获取热搜关键词失败'
        });
    }
});

// 获取访问量趋势数据（近7天PV/UV）
// GET /analytics/traffic/visit-trend
router.get('/visit-trend', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const daysNum = parseInt(days);
        
        // 计算时间范围
        const now = Date.now();
        const startTime = now - (daysNum * 24 * 60 * 60 * 1000);
        
        // 查询指定时间范围内的浏览记录
        const browseRecords = await BrowseHistory.find({
            create_time: { $gte: startTime }
        }).lean();
        
        // 按日期分组统计
        const dateMap = {};
        const uvMap = {}; // 用于统计UV（独立访客）
        
        browseRecords.forEach(record => {
            const date = new Date(record.create_time);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            
            // 统计PV（页面访问量）
            dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
            
            // 统计UV（独立访客）
            if (!uvMap[dateStr]) {
                uvMap[dateStr] = new Set();
            }
            uvMap[dateStr].add(record.user_id);
        });
        
        // 生成日期数组（最近N天）
        const dateList = [];
        for (let i = daysNum - 1; i >= 0; i--) {
            const date = new Date(now - (i * 24 * 60 * 60 * 1000));
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            dateList.push(dateStr);
        }
        
        // 组装返回数据
        const pvData = dateList.map(date => dateMap[date] || 0);
        const uvData = dateList.map(date => uvMap[date] ? uvMap[date].size : 0);
        
        res.status(200).json({
            msg: 'success',
            data: {
                dates: dateList,
                pv: pvData,
                uv: uvData
            }
        });
    } catch (error) {
        console.log('获取访问量趋势失败:', error);
        res.status(200).json({
            msg: 'error',
            error: '获取访问量趋势失败'
        });
    }
});

// 获取活跃时段分布数据（热力图）
// GET /analytics/traffic/active-hours
router.get('/active-hours', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const daysNum = parseInt(days);
        
        // 计算时间范围
        const now = Date.now();
        const startTime = now - (daysNum * 24 * 60 * 60 * 1000);
        
        // 查询指定时间范围内的浏览记录
        const browseRecords = await BrowseHistory.find({
            create_time: { $gte: startTime }
        }).lean();
        
        // 初始化24小时的数据结构
        const hourMap = {};
        for (let i = 0; i < 24; i++) {
            hourMap[i] = 0;
        }
        
        // 统计每个时段的访问量
        browseRecords.forEach(record => {
            const date = new Date(record.create_time);
            const hour = date.getHours();
            hourMap[hour] = (hourMap[hour] || 0) + 1;
        });
        
        // 转换为数组格式
        const hourData = [];
        const hourLabels = [];
        for (let i = 0; i < 24; i++) {
            hourLabels.push(`${i}:00`);
            hourData.push(hourMap[i] || 0);
        }
        
        res.status(200).json({
            msg: 'success',
            data: {
                hours: hourLabels,
                values: hourData
            }
        });
    } catch (error) {
        console.log('获取活跃时段分布失败:', error);
        res.status(200).json({
            msg: 'error',
            error: '获取活跃时段分布失败'
        });
    }
});

module.exports = router;


