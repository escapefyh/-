<template>
  <div class="settings-page">
    <h2 class="page-title">设置 / 系统操作日志</h2>

    <el-card class="section-card">
      <template #header>
        <div class="card-header">
          <span>系统操作日志</span>
        </div>
      </template>

      <el-table
        v-loading="logsLoading"
        :data="logs"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="create_time" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.create_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="admin_name" label="管理员" width="120">
          <template #default="{ row }">
            {{ row.admin_name || '未知' }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="类型" width="160">
          <template #default="{ row }">
            <el-tag size="small">
              {{ formatAction(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="详情" min-width="260" show-overflow-tooltip />
      </el-table>

      <div class="pagination">
        <el-pagination
          :current-page="logPage"
          :page-size="logPageSize"
          :page-sizes="[10, 20, 50]"
          :total="logTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleLogSizeChange"
          @current-change="handleLogPageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminSettingsAPI } from '../utils/api'

const logsLoading = ref(false)
const logs = ref([])
const logPage = ref(1)
const logPageSize = ref(10)
const logTotal = ref(0)

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

const formatAction = (action) => {
  switch (action) {
    case 'change_password':
      return '修改密码'
    case 'set_heat_bonus':
      return '设置商品热度'
    case 'off_shelf':
      return '下架商品'
    case 'create_announcement':
      return '发布系统公告'
    case 'reply_feedback':
      return '回复问题反馈'
    case 'create_sensitive_word':
      return '新增敏感词'
    case 'delete_sensitive_word':
      return '删除敏感词'
    case 'blacklist_user':
      return '用户拉黑/解禁'
    default:
      return action || '其他'
  }
}

const fetchLogs = async () => {
  logsLoading.value = true
  try {
    const res = await adminSettingsAPI.getLogs({
      page: logPage.value,
      pageSize: logPageSize.value
    })
    if (res.msg === 'success') {
      logs.value = res.data.list || []
      logTotal.value = res.data.total || 0
    } else {
      ElMessage.error(res.error || '获取日志失败')
    }
  } catch (e) {
    console.error('获取日志失败:', e)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    logsLoading.value = false
  }
}

const handleLogSizeChange = (size) => {
  logPageSize.value = size
  logPage.value = 1
  fetchLogs()
}

const handleLogPageChange = (page) => {
  logPage.value = page
  fetchLogs()
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.settings-page {
  padding: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
}

.section-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>


