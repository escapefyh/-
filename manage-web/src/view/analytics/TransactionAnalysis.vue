<template>
  <div class="transaction-analysis">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>交易与拼单分析</span>
          <el-select v-model="days" @change="handleDaysChange" style="width: 150px">
            <el-option label="最近7天" :value="7" />
            <el-option label="最近14天" :value="14" />
            <el-option label="最近30天" :value="30" />
          </el-select>
        </div>
      </template>

      <div v-loading="loading" class="charts-container">
        <!-- 交易额 / 订单量走势 -->
        <el-card class="chart-card">
          <template #header>
            <span>交易额 / 订单量走势（近{{ days }}天）</span>
          </template>
          <div ref="trendRef" class="chart" style="height: 400px"></div>
        </el-card>

        <!-- 分类销售占比 -->
        <el-card class="chart-card">
          <template #header>
            <span>分类销售占比（按交易额）</span>
          </template>
          <div ref="categoryRef" class="chart" style="height: 400px"></div>
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

const trendRef = ref(null)
const categoryRef = ref(null)

let trendChart = null
let categoryChart = null
let autoRefreshTimer = null

// 初始化交易额 / 订单量走势图
const initTrendChart = (data) => {
  if (!trendRef.value) return

  if (trendChart) {
    trendChart.dispose()
  }

  trendChart = echarts.init(trendRef.value)

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['交易额（元）', '订单量'],
      top: 10,
      left: 'center'
    },
    grid: {
      left: '3%',
      right: '4%',
      top: 70,     // 给图例留空间
      bottom: 40,  // 给 x 轴刻度留空间
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.dates || []
    },
    yAxis: [
      {
        type: 'value',
        name: '交易额（元）'
      },
      {
        type: 'value',
        name: '订单量'
      }
    ],
    series: [
      {
        name: '交易额（元）',
        type: 'bar',
        data: data.amount || [],
        itemStyle: {
          color: '#409eff'
        }
      },
      {
        name: '订单量',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: data.count || [],
        itemStyle: {
          color: '#67c23a'
        }
      }
    ]
  }

  trendChart.setOption(option)
}

// 初始化分类销售占比饼图
const initCategoryChart = (list) => {
  if (!categoryRef.value) return

  if (categoryChart) {
    categoryChart.dispose()
  }

  categoryChart = echarts.init(categoryRef.value)

  if (!list || list.length === 0) {
    categoryChart.setOption({
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

  const data = list.map((item) => ({
    name: item.category_name,
    value: item.total_amount
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 元 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '分类销售占比',
        type: 'pie',
        radius: '60%',
        center: ['55%', '50%'],
        data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  categoryChart.setOption(option)
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const [trendRes, categoryRes] = await Promise.all([
      analyticsAPI.getTransactionTrend(days.value),
      analyticsAPI.getCategoryShare(days.value)
    ])

    if (trendRes.msg === 'success') {
      await nextTick()
      initTrendChart(trendRes.data)
    }

    if (categoryRes.msg === 'success') {
      await nextTick()
      initCategoryChart(categoryRes.data)
    }
  } catch (error) {
    console.error('加载交易分析数据失败:', error)
    ElMessage.error('加载交易分析数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleDaysChange = () => {
  loadData()
}

const handleResize = () => {
  if (trendChart) trendChart.resize()
  if (categoryChart) categoryChart.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)

  // 自动刷新，保持数据接近实时
  autoRefreshTimer = setInterval(() => {
    loadData()
  }, 10000)
})

onUnmounted(() => {
  if (trendChart) trendChart.dispose()
  if (categoryChart) categoryChart.dispose()
  window.removeEventListener('resize', handleResize)
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
})
</script>

<style scoped>
.transaction-analysis {
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


