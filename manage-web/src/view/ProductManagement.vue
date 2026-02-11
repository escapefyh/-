<template>
  <div class="product-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>商品管理</span>
          <div class="search-box">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索商品描述"
              style="width: 260px"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
              @input="handleInput"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <div v-if="!loading && goodsList.length === 0" class="empty-state">
        <el-empty :description="searchKeyword ? '未找到匹配的商品' : '暂无商品数据'" />
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
        <el-table-column prop="description" label="商品描述" min-width="220" show-overflow-tooltip />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">
            ¥{{ row.price?.toFixed(2) || '0.00' }}
          </template>
        </el-table-column>
        <el-table-column prop="sales_count" label="销量" width="80" />
        <el-table-column prop="create_time" label="发布时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.create_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'off_shelf' ? 'danger' : 'success'">
              {{ row.status === 'off_shelf' ? '已下架' : '在售' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'off_shelf'"
              type="danger"
              size="small"
              @click="handleOffShelf(row)"
            >
              下架
            </el-button>
            <span v-else style="color:#999;">已下架</span>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminGoodsAPI, getImageProxyUrl } from '../utils/api'

const loading = ref(false)
const goodsList = ref([])
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
let searchTimer = null

const offShelfLoading = ref(false)

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

// 获取商品列表（商品管理使用）
const fetchGoodsList = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value,
      // 固定查询所有已发布商品（不再区分在售 / 已下架，只在后台统一管理）
      status: 'all'
    }

    const res = await adminGoodsAPI.getGoodsList(params)
    if (res.msg === 'success') {
      goodsList.value = res.data.list || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.error || '获取商品列表失败')
    }
  } catch (e) {
    console.error('获取商品列表失败:', e)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  currentPage.value = 1
  fetchGoodsList()
}

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

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchGoodsList()
}

const handlePageChange = (val) => {
  currentPage.value = val
  fetchGoodsList()
}

// 下架商品
const handleOffShelf = (row) => {
  ElMessageBox.prompt('请输入下架原因（选填）', '下架商品', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPlaceholder: '如：涉嫌违规、信息不实等，可不填',
    inputType: 'textarea',
    inputValue: ''
  }).then(async ({ value }) => {
    try {
      offShelfLoading.value = true
      const adminInfoStr = localStorage.getItem('admin_info')
      const adminInfo = adminInfoStr ? JSON.parse(adminInfoStr) : null
      const res = await adminGoodsAPI.offShelf({
        goods_id: row.goods_id,
        admin_id: adminInfo?.admin_id || '',
        reason: value || ''
      })
      if (res.msg === 'success') {
        ElMessage.success('下架成功，已通知用户')
        fetchGoodsList()
      } else {
        ElMessage.error(res.error || '下架失败')
      }
    } catch (e) {
      console.error('下架失败:', e)
      ElMessage.error('网络错误，请稍后重试')
    } finally {
      offShelfLoading.value = false
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchGoodsList()
})
</script>

<style scoped>
.product-management {
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
</style>



