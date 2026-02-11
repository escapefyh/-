<template>
  <div class="heat-control">
    <!-- 热度榜单卡片 -->
    <el-card class="heat-ranking-card" style="margin-bottom: 20px">
      <template #header>
        <div class="card-header">
          <span>热度榜单</span>
        </div>
      </template>
      <div v-loading="heatRankingLoading" class="heat-ranking-content">
        <el-table :data="heatRankingList" stripe style="width: 100%" max-height="400">
          <el-table-column type="index" label="排名" width="80" :index="(index) => index + 1" />
          <el-table-column label="商品图片" width="100">
            <template #default="{ row }">
              <el-image
                v-if="row.images && row.images.length > 0"
                :src="getImageProxyUrl(row.images[0])"
                :preview-src-list="row.images.map(img => getImageProxyUrl(img))"
                fit="cover"
                style="width: 80px; height: 80px; border-radius: 4px"
                :lazy="true"
                preview-teleported
              />
              <span v-else style="color: #999">无图片</span>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="商品描述" min-width="200" show-overflow-tooltip />
          <el-table-column prop="heatScore" label="热度值" width="120" sortable>
            <template #default="{ row }">
              <span class="heat-score">{{ formatHeatScore(row.heatScore) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="admin_heat_bonus" label="管理员加分" width="120">
            <template #default="{ row }">
              <span :class="{ 'bonus-positive': row.admin_heat_bonus > 0, 'bonus-negative': row.admin_heat_bonus < 0 }">
                {{ row.admin_heat_bonus > 0 ? '+' : '' }}{{ row.admin_heat_bonus || 0 }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                size="small"
                @click="handleSetHeatBonusFromRanking(row)"
              >
                设置热度
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 商品列表卡片 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>热度控制</span>
          <div class="search-box">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索商品描述"
              style="width: 300px"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
              @input="handleInput"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button
              type="primary"
              :icon="Search"
              @click="handleSearch"
              style="margin-left: 10px"
            >
              搜索
            </el-button>
          </div>
        </div>
      </template>

      <!-- 空状态提示 -->
      <div v-if="!loading && goodsList.length === 0" class="empty-state">
        <el-empty
          :description="searchKeyword ? '未找到匹配的商品' : '暂无商品数据'"
        />
      </div>

      <el-table
        v-else
        v-loading="loading"
        :data="goodsList"
        stripe
        style="width: 100%"
      >
        <el-table-column label="商品图片" width="120">
          <template #default="{ row }">
            <el-image
              v-if="row.images && row.images.length > 0"
              :src="getImageProxyUrl(row.images[0])"
              :preview-src-list="row.images.map(img => getImageProxyUrl(img))"
              fit="cover"
              style="width: 100px; height: 100px; border-radius: 4px"
              :lazy="true"
              preview-teleported
            />
            <span v-else style="color: #999">无图片</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="商品描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">
            ¥{{ row.price?.toFixed(2) || '0.00' }}
          </template>
        </el-table-column>
        <el-table-column prop="category_id" label="分类ID" width="100" />
        <el-table-column prop="sales_count" label="销量" width="80" />
        <el-table-column prop="group_buy_count" label="拼单数" width="100">
          <template #default="{ row }">
            {{ row.group_buy_count || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="admin_heat_bonus" label="管理员热度加分" width="150">
          <template #default="{ row }">
            <span :class="{ 'bonus-positive': row.admin_heat_bonus > 0, 'bonus-negative': row.admin_heat_bonus < 0 }">
              {{ row.admin_heat_bonus > 0 ? '+' : '' }}{{ row.admin_heat_bonus || 0 }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="create_time" label="发布时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.create_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleSetHeatBonus(row)"
            >
              设置热度
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 设置热度加分对话框 -->
    <el-dialog
      v-model="heatBonusDialogVisible"
      title="设置商品热度加分"
      width="500px"
      @close="handleDialogClose"
    >
      <el-form :model="heatBonusForm" label-width="120px">
        <el-form-item label="商品ID">
          <el-input v-model="heatBonusForm.goods_id" disabled />
        </el-form-item>
        <el-form-item label="商品描述">
          <el-input v-model="heatBonusForm.description" disabled />
        </el-form-item>
        <el-form-item label="当前热度加分">
          <el-input v-model="heatBonusForm.current_bonus" disabled />
        </el-form-item>
        <el-form-item label="设置热度加分" required>
          <el-input-number
            v-model="heatBonusForm.admin_heat_bonus"
            :min="-10000"
            :max="10000"
            :step="100"
            style="width: 100%"
            placeholder="请输入热度加分（-10000到10000）"
          />
          <div class="form-tip">
            <el-text type="info" size="small">
              提示：可以为负数，范围-10000到10000。热度计算公式：基础分2000 + 浏览量×1 + 收藏量×10 + 销量/拼单×50 - 发布时间小时数×10 + 管理员加分
            </el-text>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="heatBonusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmSetHeatBonus" :loading="settingHeatBonus">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminGoodsAPI } from '../utils/api'
import { getImageProxyUrl } from '../utils/api'

const loading = ref(false)
const goodsList = ref([])
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
let searchTimer = null

// 热度榜单相关
const heatRankingLoading = ref(false)
const heatRankingList = ref([])

// 热度加分对话框相关
const heatBonusDialogVisible = ref(false)
const settingHeatBonus = ref(false)
const heatBonusForm = ref({
  goods_id: '',
  description: '',
  current_bonus: 0,
  admin_heat_bonus: 0
})

// 格式化时间戳
const formatDateTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 格式化热度值显示（超过10000显示为1w+）
const formatHeatScore = (heatScore) => {
  if (heatScore >= 10000) {
    return '1w+'
  }
  return heatScore.toString()
}

// 获取热度榜单
const fetchHeatRanking = async () => {
  heatRankingLoading.value = true
  try {
    const response = await adminGoodsAPI.getHotList({
      page: 1,
      pageSize: 20
    })
    
    if (response.msg === 'success') {
      heatRankingList.value = response.data.list.map(item => ({
        ...item,
        admin_heat_bonus: item.admin_heat_bonus || 0
      }))
    } else {
      ElMessage.error(response.error || '获取热度榜单失败')
    }
  } catch (error) {
    console.error('获取热度榜单失败:', error)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    heatRankingLoading.value = false
  }
}

// 获取商品列表（热度控制页面，默认只看在售）
const fetchGoodsList = async () => {
  loading.value = true
  try {
    const response = await adminGoodsAPI.getGoodsList({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value
    })
    
    if (response.msg === 'success') {
      goodsList.value = response.data.list
      total.value = response.data.total
    } else {
      ElMessage.error(response.error || '获取商品列表失败')
    }
  } catch (error) {
    console.error('获取商品列表失败:', error)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  currentPage.value = 1
  fetchGoodsList()
}

// 输入时防抖搜索
const handleInput = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  if (!searchKeyword.value.trim()) {
    handleSearch()
    return
  }
  searchTimer = setTimeout(() => {
    handleSearch()
  }, 500)
}

// 分页大小改变
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchGoodsList()
}

// 页码改变
const handlePageChange = (val) => {
  currentPage.value = val
  fetchGoodsList()
}

// 打开设置热度加分对话框（从商品列表）
const handleSetHeatBonus = (row) => {
  heatBonusForm.value = {
    goods_id: row.goods_id,
    description: row.description,
    current_bonus: row.admin_heat_bonus || 0,
    admin_heat_bonus: row.admin_heat_bonus || 0
  }
  heatBonusDialogVisible.value = true
}

// 打开设置热度加分对话框（从热度榜单）
const handleSetHeatBonusFromRanking = (row) => {
  heatBonusForm.value = {
    goods_id: row.goods_id,
    description: row.description,
    current_bonus: row.admin_heat_bonus || 0,
    admin_heat_bonus: row.admin_heat_bonus || 0
  }
  heatBonusDialogVisible.value = true
}

// 关闭对话框
const handleDialogClose = () => {
  heatBonusForm.value = {
    goods_id: '',
    description: '',
    current_bonus: 0,
    admin_heat_bonus: 0
  }
}

// 确认设置热度加分
const handleConfirmSetHeatBonus = async () => {
  if (heatBonusForm.value.admin_heat_bonus === null || heatBonusForm.value.admin_heat_bonus === undefined) {
    ElMessage.warning('请输入热度加分')
    return
  }

  if (heatBonusForm.value.admin_heat_bonus < -10000 || heatBonusForm.value.admin_heat_bonus > 10000) {
    ElMessage.warning('热度加分必须在-10000到10000之间')
    return
  }

  settingHeatBonus.value = true
  try {
    const adminInfoStr = localStorage.getItem('admin_info')
    const adminInfo = adminInfoStr ? JSON.parse(adminInfoStr) : null
    const response = await adminGoodsAPI.setHeatBonus(
      heatBonusForm.value.goods_id,
      heatBonusForm.value.admin_heat_bonus,
      adminInfo?.admin_id || ''
    )
    
    if (response.msg === 'success') {
      ElMessage.success('设置成功')
      heatBonusDialogVisible.value = false
      // 刷新列表和热度榜单
      fetchGoodsList()
      fetchHeatRanking()
    } else {
      ElMessage.error(response.error || '设置失败')
    }
  } catch (error) {
    console.error('设置热度加分失败:', error)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    settingHeatBonus.value = false
  }
}

onMounted(() => {
  fetchGoodsList()
  fetchHeatRanking()
})
</script>

<style scoped>
.heat-control {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-box {
  display: flex;
  align-items: center;
}

.empty-state {
  padding: 40px 0;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.bonus-positive {
  color: #67c23a;
  font-weight: bold;
}

.bonus-negative {
  color: #f56c6c;
  font-weight: bold;
}

.form-tip {
  margin-top: 8px;
}

.heat-ranking-card {
  margin-bottom: 20px;
}

.heat-ranking-content {
  min-height: 200px;
}

.heat-score {
  font-weight: bold;
  color: #f56c6c;
  font-size: 16px;
}
</style>
