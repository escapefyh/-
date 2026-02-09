<template>
  <div class="user-orders">
    <el-card>
      <template #header>
        <div class="card-header">
          <el-button type="primary" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span>用户订单</span>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="orderList"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="order_no" label="订单编号" width="180" />
        <el-table-column label="商品图片" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.goods_image"
              :src="getImageProxyUrl(row.goods_image)"
              style="width: 60px; height: 60px"
              fit="cover"
              :preview-src-list="row.goods_image ? [getImageProxyUrl(row.goods_image)] : []"
              preview-teleported
              loading="lazy"
              @error="handleImageError"
              @load="handleImageLoad"
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
            <span v-else>无图片</span>
          </template>
        </el-table-column>
        <el-table-column prop="goods_description" label="商品描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="spec_name" label="规格" width="120">
          <template #default="{ row }">
            {{ row.spec_name || '无规格' }}
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="total_price" label="总价" width="100">
          <template #default="{ row }">
            ¥{{ row.total_price }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ row.status_text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_group_buy" label="拼团" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.is_group_buy" type="warning">是</el-tag>
            <span v-else>否</span>
          </template>
        </el-table-column>
        <el-table-column prop="create_time" label="创建时间" width="180" />
        <el-table-column prop="pay_time" label="支付时间" width="180">
          <template #default="{ row }">
            {{ row.pay_time || '-' }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
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
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Picture } from '@element-plus/icons-vue'
import { adminUserAPI, getImageProxyUrl } from '../utils/api'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const orderList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const getStatusType = (status) => {
  const typeMap = {
    'pending': 'info',
    'paid': 'success',
    'shipped': 'warning',
    'review': '',
    'completed': 'success',
    'cancelled': 'danger'
  }
  return typeMap[status] || ''
}

const fetchOrderList = async () => {
  const user_id = route.params.user_id
  if (!user_id) {
    ElMessage.error('用户ID不能为空')
    router.back()
    return
  }

  loading.value = true
  try {
    const response = await adminUserAPI.getUserOrders(user_id, {
      page: currentPage.value,
      pageSize: pageSize.value
    })
    
    if (response.msg === 'success') {
      orderList.value = response.data.list
      total.value = response.data.total
      // 调试：打印第一个订单的商品图片URL
      if (response.data.list && response.data.list.length > 0) {
        console.log('商品图片URL示例:', response.data.list[0].goods_image)
      }
    } else {
      ElMessage.error(response.error || '获取订单列表失败')
    }
  } catch (error) {
    console.error('获取订单列表失败:', error)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchOrderList()
}

const handlePageChange = (val) => {
  currentPage.value = val
  fetchOrderList()
}

const goBack = () => {
  router.back()
}

const handleImageError = (e) => {
  const src = e.target?.src || e.detail?.src
  console.error('图片加载失败:', {
    src: src,
    error: e
  })
}

const handleImageLoad = (e) => {
  console.log('图片加载成功:', e.target?.src)
}

onMounted(() => {
  fetchOrderList()
})
</script>

<style scoped>
.user-orders {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
}
</style>

