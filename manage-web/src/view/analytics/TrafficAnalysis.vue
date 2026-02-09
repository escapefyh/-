<template>
  <div class="traffic-analysis">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>流量与热度分析</span>
          <el-select v-model="days" @change="handleDaysChange" style="width: 150px">
            <el-option label="最近7天" :value="7" />
            <el-option label="最近14天" :value="14" />
            <el-option label="最近30天" :value="30" />
          </el-select>
        </div>
      </template>

      <div v-loading="loading" class="charts-container">
        <!-- 热搜词云图 -->
        <el-card class="chart-card">
          <template #header>
            <span>热搜词云图</span>
          </template>
          <div ref="wordCloudRef" class="chart" style="height: 400px"></div>
        </el-card>

        <!-- 访问量趋势图 -->
        <el-card class="chart-card">
          <template #header>
            <span>访问量趋势图（近{{ days }}天）</span>
          </template>
          <div ref="visitTrendRef" class="chart" style="height: 400px"></div>
        </el-card>

        <!-- 活跃时段分布热力图 -->
        <el-card class="chart-card">
          <template #header>
            <span>活跃时段分布（一天24小时）</span>
          </template>
          <div ref="activeHoursRef" class="chart" style="height: 400px"></div>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { analyticsAPI } from '../../utils/api'

const loading = ref(false)
const days = ref(7)

const wordCloudRef = ref(null)
const visitTrendRef = ref(null)
const activeHoursRef = ref(null)

let wordCloudChart = null
let visitTrendChart = null
let activeHoursChart = null
let autoRefreshTimer = null

// 初始化词云图
const initWordCloud = (data) => {
  if (!wordCloudRef.value) return
  
  if (wordCloudChart) {
    wordCloudChart.dispose()
  }
  
  wordCloudChart = echarts.init(wordCloudRef.value)
  
  // 如果没有数据，显示空状态
  if (!data || data.length === 0) {
    wordCloudChart.setOption({
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'center',
        textStyle: {
          color: '#999',
          fontSize: 16
        }
      }
    })
    return
  }
  
  // 使用散点图模拟词云效果
  // 计算最大值用于大小映射
  const maxValue = Math.max(...data.map(item => item.value), 1)
  
  // 生成随机位置和颜色
  const scatterData = data.map((item, index) => {
    const angle = (index / data.length) * Math.PI * 2
    const radius = 30 + Math.random() * 40
    const x = Math.cos(angle) * radius + 50
    const y = Math.sin(angle) * radius + 50
    const size = 12 + (item.value / maxValue) * 38
    
    return {
      name: item.name,
      value: [x, y, item.value],
      symbolSize: size,
      itemStyle: {
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
      }
    }
  })
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        return `${params.name}: ${params.value[2]}次`
      }
    },
    xAxis: {
      show: false,
      type: 'value',
      min: 0,
      max: 100
    },
    yAxis: {
      show: false,
      type: 'value',
      min: 0,
      max: 100
    },
    series: [{
      type: 'scatter',
      data: scatterData,
      label: {
        show: true,
        // 显示关键词文本，而不是坐标
        formatter: (params) => params.data.name,
        position: 'inside',
        fontSize: function(params) {
          return Math.max(12, params.data.symbolSize * 0.6)
        },
        fontWeight: 'bold',
        color: '#333'
      },
      emphasis: {
        label: {
          fontSize: function(params) {
            return Math.max(14, params.data.symbolSize * 0.7)
          },
          fontWeight: 'bold'
        },
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
  
  wordCloudChart.setOption(option)
}

// 初始化访问量趋势图
const initVisitTrend = (data) => {
  if (!visitTrendRef.value) return
  
  if (visitTrendChart) {
    visitTrendChart.dispose()
  }
  
  visitTrendChart = echarts.init(visitTrendRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['PV（页面访问量）', 'UV（独立访客）'],
      top: 10,
      left: 'center'
    },
    grid: {
      left: '3%',
      right: '4%',
      top: 70,      // 给 legend 留出空间
      bottom: 40,   // 给 x 轴刻度留出空间
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.dates || []
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'PV（页面访问量）',
        type: 'line',
        smooth: true,
        data: data.pv || [],
        itemStyle: {
          color: '#409eff'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
            ]
          }
        }
      },
      {
        name: 'UV（独立访客）',
        type: 'line',
        smooth: true,
        data: data.uv || [],
        itemStyle: {
          color: '#67c23a'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
              { offset: 1, color: 'rgba(103, 194, 58, 0.1)' }
            ]
          }
        }
      }
    ]
  }
  
  visitTrendChart.setOption(option)
}

// 初始化活跃时段分布热力图
const initActiveHours = (data) => {
  if (!activeHoursRef.value) return
  
  if (activeHoursChart) {
    activeHoursChart.dispose()
  }
  
  activeHoursChart = echarts.init(activeHoursRef.value)
  
  // 准备热力图数据
  const hours = data.hours || []
  const values = data.values || []
  
  // 计算最大值用于颜色映射
  const maxValue = Math.max(...values, 1)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params) {
        return `${params[0].name}<br/>访问量: ${params[0].value}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      top: 40,
      bottom: 60,  // 留出空间给旋转的 x 轴标签
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: hours,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '访问量'
    },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: true,
      orient: 'vertical',
      right: 10,
      top: 'middle',
      inRange: {
        color: ['#e0f3ff', '#409eff', '#67c23a', '#e6a23c', '#f56c6c']
      }
    },
    series: [{
      type: 'bar',
      data: values.map((value, index) => ({
        value: value,
        itemStyle: {
          color: getColorByValue(value, maxValue)
        }
      })),
      barWidth: '60%',
      label: {
        show: true,
        position: 'top'
      }
    }]
  }
  
  activeHoursChart.setOption(option)
}

// 根据值获取颜色
const getColorByValue = (value, maxValue) => {
  const ratio = value / maxValue
  if (ratio < 0.2) return '#e0f3ff'
  if (ratio < 0.4) return '#409eff'
  if (ratio < 0.6) return '#67c23a'
  if (ratio < 0.8) return '#e6a23c'
  return '#f56c6c'
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // 并行加载所有数据
    const [keywordsRes, trendRes, hoursRes] = await Promise.all([
      analyticsAPI.getHotKeywords(days.value),
      analyticsAPI.getVisitTrend(days.value),
      analyticsAPI.getActiveHours(days.value)
    ])
    
    if (keywordsRes.msg === 'success') {
      await nextTick()
      initWordCloud(keywordsRes.data)
    }
    
    if (trendRes.msg === 'success') {
      await nextTick()
      initVisitTrend(trendRes.data)
    }
    
    if (hoursRes.msg === 'success') {
      await nextTick()
      initActiveHours(hoursRes.data)
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 天数改变
const handleDaysChange = () => {
  loadData()
}

// 窗口大小改变时重新调整图表
const handleResize = () => {
  if (wordCloudChart) wordCloudChart.resize()
  if (visitTrendChart) visitTrendChart.resize()
  if (activeHoursChart) activeHoursChart.resize()
}

onUnmounted(() => {
  if (wordCloudChart) wordCloudChart.dispose()
  if (visitTrendChart) visitTrendChart.dispose()
  if (activeHoursChart) activeHoursChart.dispose()
  window.removeEventListener('resize', handleResize)
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
})

onMounted(() => {
  // 初次加载
  loadData()
  window.addEventListener('resize', handleResize)

  // 每 10 秒自动刷新一次，实现“接近实时”的效果
  autoRefreshTimer = setInterval(() => {
    loadData()
  }, 10000)
})
</script>

<style scoped>
.traffic-analysis {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.charts-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.chart {
  width: 100%;
}
</style>

