<template>
  <div class="user-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <div class="search-box">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索账号、昵称或姓名"
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
      <div v-if="!loading && userList.length === 0" class="empty-state">
        <el-empty
          :description="searchKeyword ? '未找到匹配的用户' : '暂无用户数据'"
        />
      </div>

      <el-table
        v-else
        v-loading="loading"
        :data="userList"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column prop="account" label="账号" width="150" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="create_time" label="注册时间" width="180" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_blacklisted === 1 ? 'danger' : 'success'">
              {{ row.is_blacklisted === 1 ? '已拉黑' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleViewDetail(row)"
            >
              查看详情
            </el-button>
            <el-button
              type="info"
              size="small"
              @click="handleViewOrders(row)"
            >
              查看订单
            </el-button>
            <el-button
              :type="row.is_blacklisted === 1 ? 'success' : 'danger'"
              size="small"
              @click="handleBlacklist(row)"
            >
              {{ row.is_blacklisted === 1 ? '取消拉黑' : '拉黑' }}
            </el-button>
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
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminUserAPI } from '../utils/api'

const router = useRouter()

const loading = ref(false)
const userList = ref([])
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
let searchTimer = null

const fetchUserList = async () => {
  loading.value = true
  try {
    const response = await adminUserAPI.getUserList({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value
    })
    
    if (response.msg === 'success') {
      userList.value = response.data.list
      total.value = response.data.total
    } else {
      ElMessage.error(response.error || '获取用户列表失败')
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  // 清除之前的定时器
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  currentPage.value = 1
  fetchUserList()
}

// 输入时防抖搜索（500ms后自动搜索）
const handleInput = () => {
  // 清除之前的定时器
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  // 如果搜索框为空，立即搜索
  if (!searchKeyword.value.trim()) {
    handleSearch()
    return
  }
  // 设置新的定时器，500ms后执行搜索
  searchTimer = setTimeout(() => {
    handleSearch()
  }, 500)
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchUserList()
}

const handlePageChange = (val) => {
  currentPage.value = val
  fetchUserList()
}

const handleViewDetail = (row) => {
  router.push(`/user-detail/${row.user_id}`)
}

const handleViewOrders = (row) => {
  router.push(`/user-orders/${row.user_id}`)
}

const handleBlacklist = async (row) => {
  const action = row.is_blacklisted === 1 ? '取消拉黑' : '拉黑'
  const confirmText = row.is_blacklisted === 1 
    ? `确定要取消拉黑用户"${row.nickname || row.account}"吗？` 
    : `确定要拉黑用户"${row.nickname || row.account}"吗？拉黑后该用户将无法登录小程序。`
  
  try {
    await ElMessageBox.confirm(confirmText, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const adminInfoStr = localStorage.getItem('admin_info')
    const adminInfo = adminInfoStr ? JSON.parse(adminInfoStr) : null
    const response = await adminUserAPI.blacklistUser({
      user_id: row.user_id,
      is_blacklisted: row.is_blacklisted === 1 ? 0 : 1,
      admin_id: adminInfo?.admin_id || ''
    })

    if (response.msg === 'success') {
      ElMessage.success(`${action}成功`)
      fetchUserList()
    } else {
      ElMessage.error(response.error || `${action}失败`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error(`${action}失败:`, error)
      ElMessage.error('操作失败，请稍后重试')
    }
  }
}

onMounted(() => {
  fetchUserList()
})
</script>

<style scoped>
.user-management {
  height: 100%;
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
  text-align: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>

